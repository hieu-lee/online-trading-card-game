"""
Multi-Session WebSocket Server for Online Card Game

This module handles:
- WebSocket server setup and connection management
- Multi-session game routing and broadcasting
- User authentication and session management
- Session-based game state synchronization
"""

import asyncio
import websockets
import json
import logging
from typing import Set, Dict, Optional
from websockets.exceptions import ConnectionClosed
from websockets.legacy.server import WebSocketServerProtocol
import os

from message_protocol import (
    MessageType,
    create_message,
    parse_message,
)
from user_manager import (
    DatabaseManager,
    initialize_user_system,
    authenticate_user,
    disconnect_user,
    get_online_users,
    User,
)
from session_manager import get_session_manager
from game_logic import Game
from card_system import PokerHand, HandType, Suit, Rank
from card_system import HandParser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MultiSessionGameServer:
    """WebSocket server supporting multiple game sessions"""

    def __init__(
        self, host: str = "0.0.0.0", port: int = 8765
    ):
        self.host = host
        self.port = port
        self.connections: Set[WebSocketServerProtocol] = set()
        self.user_connections: Dict[str, WebSocketServerProtocol] = {}
        # Track user sessions mapping user_id -> session_id
        self.user_sessions: Dict[str, str] = {}
        # Track session hosts mapping session_id -> user_id
        self.session_hosts: Dict[str, str] = {}
        self.session_manager = get_session_manager()

    async def register_connection(
        self, websocket: WebSocketServerProtocol
    ):
        """Register a new WebSocket connection"""
        self.connections.add(websocket)
        logger.info(
            f"New connection registered. Total connections: {len(self.connections)}"
        )

    async def unregister_connection(
        self, websocket: WebSocketServerProtocol
    ):
        """Unregister a WebSocket connection"""
        self.connections.discard(websocket)

        # Find and disconnect user
        user_id_to_remove = None
        for user_id, conn in self.user_connections.items():
            if conn == websocket:
                user_id_to_remove = user_id
                break

        if user_id_to_remove:
            await self.handle_user_disconnect(user_id_to_remove)

        logger.info(
            f"Connection unregistered. Total connections: {len(self.connections)}"
        )

    async def handle_user_disconnect(self, user_id: str):
        """Handle user disconnection"""
        from user_manager import user_session_manager

        user = user_session_manager.get_user_by_id(user_id)
        session_id = self.user_sessions.get(user_id)

        if session_id:
            # Remove from session
            await self.session_manager.remove_player_from_session(session_id, user_id)
            
            # Handle host change if needed
            if self.session_hosts.get(session_id) == user_id:
                await self.handle_host_change(session_id, user_id)
            
            # Broadcast user leave to session
            if user:
                await self.broadcast_to_session(
                    session_id,
                    create_message(
                        MessageType.USER_LEAVE,
                        {
                            "user_id": user_id,
                            "username": user.username,
                        },
                        session_id
                    )
                )
            
            # Broadcast game state update to session
            await self.broadcast_game_state_to_session(session_id)

        # Remove from server tracking
        self.user_sessions.pop(user_id, None)
        self.user_connections.pop(user_id, None)
        
        # Disconnect from user manager
        await disconnect_user(user_id)

    async def handle_host_change(self, session_id: str, leaving_host_id: str):
        """Handle host change when current host leaves"""
        game = self.session_manager.get_session(session_id)
        if not game or not game.players:
            return
            
        # Find next host (first remaining player)
        new_host_id = None
        for player_id in game.players.keys():
            if player_id != leaving_host_id:
                new_host_id = player_id
                break
                
        if new_host_id:
            self.session_hosts[session_id] = new_host_id
            from user_manager import user_session_manager
            new_host = user_session_manager.get_user_by_id(new_host_id)
            
            if new_host:
                await self.broadcast_to_session(
                    session_id,
                    create_message(
                        MessageType.HOST_CHANGED,
                        {
                            "new_host": new_host.username,
                            "host_id": new_host.id,
                        },
                        session_id
                    )
                )
        else:
            # No players left, remove session
            self.session_hosts.pop(session_id, None)

    async def broadcast_to_session(self, session_id: str, message: Dict):
        """Broadcast message to all users in a session"""
        game = self.session_manager.get_session(session_id)
        if not game:
            return

        message_str = json.dumps(message)
        disconnected = set()

        # Collect all user IDs in this session
        user_ids = set(game.players.keys())
        user_ids.update(game.waiting_players)

        for user_id in user_ids:
            websocket = self.user_connections.get(user_id)
            if websocket and websocket in self.connections:
                try:
                    await websocket.send(message_str)
                except ConnectionClosed:
                    disconnected.add(websocket)
                except Exception as e:
                    logger.error(f"Error broadcasting to session {session_id}: {e}")
                    disconnected.add(websocket)

        # Clean up disconnected clients
        for websocket in disconnected:
            await self.unregister_connection(websocket)

    async def send_message_to_user(self, user_id: str, message: Dict):
        """Send message to a specific user"""
        websocket = self.user_connections.get(user_id)
        if websocket:
            try:
                await websocket.send(json.dumps(message))
            except ConnectionClosed:
                await self.unregister_connection(websocket)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")

    async def broadcast_game_state_to_session(self, session_id: str):
        """Broadcast current game state to all clients in a session"""
        game = self.session_manager.get_session(session_id)
        if not game:
            return

        game_state = game.get_game_state()
        host_id = self.session_hosts.get(session_id)
        host_username = None
        
        if host_id:
            from user_manager import user_session_manager
            host = user_session_manager.get_user_by_id(host_id)
            host_username = host.username if host else None

        # Get session users
        session_users = []
        for user_id in list(game.players.keys()) + game.waiting_players:
            from user_manager import user_session_manager
            user = user_session_manager.get_user_by_id(user_id)
            if user:
                session_users.append(user.username)

        state_message = create_message(
            MessageType.GAME_STATE_UPDATE,
            {
                "game_state": game_state,
                "host": host_username,
                "online_users": session_users,
            },
            session_id
        )

        # Handle spectator cards display
        current_round_cards = {}
        if game.current_round:
            for player in game.current_round.players:
                current_round_cards[player.user.id] = player.cards

        if current_round_cards:
            current_round_cards_data = [
                {
                    "user_id": pid,
                    "cards": [
                        {
                            "suit": card.suit.value,
                            "rank": card.rank.value,
                        }
                        for card in cards
                    ],
                }
                for pid, cards in current_round_cards.items()
            ]
            
            state_message_for_spectators = create_message(
                MessageType.GAME_STATE_UPDATE,
                {
                    "game_state": game_state,
                    "host": host_username,
                    "online_users": session_users,
                    "current_round_cards": current_round_cards_data,
                },
                session_id
            )
            
            spectator_ids = game.get_spectator_ids()
            for spectator_id in spectator_ids:
                await self.send_message_to_user(spectator_id, state_message_for_spectators)
            
            active_players = game.get_active_players()
            for player in active_players:
                await self.send_message_to_user(player.user.id, state_message)
        else:
            await self.broadcast_to_session(session_id, state_message)

        # Send waiting list to host
        await self._send_waiting_list_to_host(session_id)

    async def _send_waiting_list_to_host(self, session_id: str):
        """Send the current waiting list (usernames) only to the host client"""
        host_id = self.session_hosts.get(session_id)
        if not host_id:
            return

        game = self.session_manager.get_session(session_id)
        if not game:
            return

        waiting_ids = game.get_waiting_player_ids()
        if not waiting_ids:
            return

        from user_manager import user_session_manager
        waiting_usernames = []
        for uid in waiting_ids:
            user = user_session_manager.get_user_by_id(uid)
            if user:
                waiting_usernames.append(user.username)

        if not waiting_usernames:
            return

        waiting_message = create_message(
            MessageType.PLAYER_UPDATE,
            {"waiting_list": waiting_usernames},
            session_id
        )

        await self.send_message_to_user(host_id, waiting_message)

    async def handle_create_session(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle create session request"""
        username = data.get("username", "").strip()

        success, message, user = await authenticate_user(username, websocket)

        if success and user:
            # Create new session
            session_id = self.session_manager.create_session()
            
            # Set user as host
            self.session_hosts[session_id] = user.id
            self.user_sessions[user.id] = session_id
            self.user_connections[user.id] = websocket

            # Add user to session
            game = self.session_manager.get_session(session_id)
            if game:
                game.add_player(user)

            leaderboard = await DatabaseManager().get_leaderboard()

            # Send success response
            response = create_message(
                MessageType.SESSION_CREATED,
                {
                    "success": True,
                    "session_id": session_id,
                    "message": f"Session {session_id} created successfully",
                    "user_id": user.id,
                    "username": user.username,
                    "is_host": True,
                    "leaderboard": leaderboard,
                },
                session_id
            )
            await websocket.send(json.dumps(response))

            # Broadcast game state
            await self.broadcast_game_state_to_session(session_id)

        else:
            # Send error response
            error_response = create_message(
                MessageType.SESSION_ERROR,
                {"success": False, "message": message, "error_code": "CREATE_FAILED"}
            )
            await websocket.send(json.dumps(error_response))

    async def handle_join_session(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle join session request"""
        session_id = data.get("session_id", "").strip().upper()
        username = data.get("username", "").strip()

        # Validate session exists
        if not self.session_manager.session_exists(session_id):
            error_response = create_message(
                MessageType.SESSION_ERROR,
                {"success": False, "message": f"Session {session_id} not found", "error_code": "SESSION_NOT_FOUND"}
            )
            await websocket.send(json.dumps(error_response))
            return

        success, message, user = await authenticate_user(username, websocket)

        if success and user:
            # Add to session
            self.user_sessions[user.id] = session_id
            self.user_connections[user.id] = websocket

            # Add user to game
            game_joined = self.session_manager.add_player_to_session(session_id, user)

            leaderboard = await DatabaseManager().get_leaderboard()

            # Send success response
            response = create_message(
                MessageType.SESSION_JOINED,
                {
                    "success": True,
                    "session_id": session_id,
                    "message": f"Joined session {session_id} successfully",
                    "user_id": user.id,
                    "username": user.username,
                    "is_host": self.session_hosts.get(session_id) == user.id,
                    "game_joined": game_joined,
                    "leaderboard": leaderboard,
                },
                session_id
            )
            await websocket.send(json.dumps(response))

            # If game is in progress, inform user to wait
            game = self.session_manager.get_session(session_id)
            if game and not game_joined:
                waiting_msg = create_message(
                    MessageType.WAITING_FOR_GAME,
                    {"message": "Game in progress, please wait for next round"},
                    session_id
                )
                await websocket.send(json.dumps(waiting_msg))

            # Send user their cards if game is in progress
            if game:
                player = game.get_player(user.id)
                if player and player.cards:
                    cards_data = [
                        {"suit": card.suit.value, "rank": card.rank.value}
                        for card in player.cards
                    ]
                    cards_message = create_message(
                        MessageType.PLAYER_UPDATE,
                        {"your_cards": cards_data},
                        session_id
                    )
                    await self.send_message_to_user(user.id, cards_message)

            # Broadcast updates to session
            await self.broadcast_game_state_to_session(session_id)

        else:
            # Send error response
            error_response = create_message(
                MessageType.SESSION_ERROR,
                {"success": False, "message": message, "error_code": "JOIN_FAILED"}
            )
            await websocket.send(json.dumps(error_response))

    def is_session_host(self, user_id: str, session_id: str) -> bool:
        """Check if user is host of the session"""
        return self.session_hosts.get(session_id) == user_id

    async def handle_game_start(self, user_id: str, session_id: str):
        """Handle game start request"""
        if not self.is_session_host(user_id, session_id):
            return

        game = self.session_manager.get_session(session_id)
        if not game:
            return

        if game.can_start_game():
            if await game.start_game():
                # Notify clients that the game has started
                await self.broadcast_to_session(
                    session_id,
                    create_message(
                        MessageType.GAME_START,
                        {"message": "Game started!"},
                        session_id
                    )
                )
                
                # Broadcast round start information
                game_state = game.get_game_state()
                await self.broadcast_to_session(
                    session_id,
                    create_message(
                        MessageType.ROUND_START,
                        {
                            "round_number": game_state["round_number"],
                            "current_player_id": game_state.get("current_player_id"),
                        },
                        session_id
                    )
                )
                
                # Broadcast full game state
                await self.broadcast_game_state_to_session(session_id)

                # Send cards to all players in session
                for player_user_id in game.players.keys():
                    player = game.get_player(player_user_id)
                    if player and player.cards:
                        cards_data = [
                            {"suit": card.suit.value, "rank": card.rank.value}
                            for card in player.cards
                        ]
                        cards_message = create_message(
                            MessageType.PLAYER_UPDATE,
                            {"your_cards": cards_data},
                            session_id
                        )
                        await self.send_message_to_user(player_user_id, cards_message)

    async def handle_game_restart(self, user_id: str, session_id: str):
        """Handle game restart request"""
        if not self.is_session_host(user_id, session_id):
            return

        game = self.session_manager.get_session(session_id)
        if not game:
            return

        game.restart_game()
        await self.broadcast_to_session(
            session_id,
            create_message(
                MessageType.GAME_RESTART,
                {"message": "Game restarted!"},
                session_id
            )
        )
        await self.broadcast_game_state_to_session(session_id)

    async def handle_kick_user(self, host_id: str, session_id: str, target_username: str):
        """Handle kick user request"""
        if not self.is_session_host(host_id, session_id):
            return

        game = self.session_manager.get_session(session_id)
        if not game:
            return

        # Find target user in this session
        target_user = None
        for user_id in list(game.players.keys()) + game.waiting_players:
            from user_manager import user_session_manager
            user = user_session_manager.get_user_by_id(user_id)
            if user and user.username == target_username:
                target_user = user
                break

        if target_user:
            # Send kick message to target user
            kick_message = create_message(
                MessageType.USER_KICKED,
                {"message": "You have been kicked by the host"},
                session_id
            )
            await self.send_message_to_user(target_user.id, kick_message)

            # Disconnect the user
            websocket = self.user_connections.get(target_user.id)
            if websocket:
                await websocket.close()

    async def handle_call_hand(self, user_id: str, session_id: str, data: Dict):
        """Handle hand call from player"""
        game = self.session_manager.get_session(session_id)
        if not game:
            return

        # Parse hand specification from client
        spec = data.get("hand_spec", "").strip()
        if not spec:
            error_msg = create_message(
                MessageType.ERROR,
                {"message": "Hand specification is required"},
                session_id
            )
            await self.send_message_to_user(user_id, error_msg)
            return

        try:
            hand = HandParser.parse_hand_call(spec)
        except Exception as e:
            error_msg = create_message(
                MessageType.ERROR,
                {"message": f"Invalid hand specification: {e}"},
                session_id
            )
            await self.send_message_to_user(user_id, error_msg)
            return

        # Make the hand call
        success, message = game.make_hand_call(user_id, hand)
        if success:
            # Broadcast updated game state
            await self.broadcast_game_state_to_session(session_id)
        else:
            error_message = create_message(
                MessageType.ERROR,
                {"message": message},
                session_id
            )
            await self.send_message_to_user(user_id, error_message)

    async def handle_call_bluff(self, user_id: str, session_id: str):
        """Handle bluff call from player"""
        game = self.session_manager.get_session(session_id)
        if not game:
            return

        # Get previous round cards
        previous_round_cards = {}
        if game.current_round:
            for player in game.current_round.players:
                previous_round_cards[player.user.id] = player.cards

        previous_round_cards_data = [
            {
                "user_id": pid,
                "cards": [
                    {"suit": card.suit.value, "rank": card.rank.value}
                    for card in cards
                ],
            }
            for pid, cards in previous_round_cards.items()
        ]

        success, message, loser = await game.call_bluff(user_id)

        if success:
            bluff_message = create_message(
                MessageType.CALL_BLUFF,
                {
                    "message": message,
                    "loser": loser,
                    "previous_round_cards": previous_round_cards_data,
                },
                session_id
            )
            await self.broadcast_to_session(session_id, bluff_message)
            
            # Broadcast updated game state
            await self.broadcast_game_state_to_session(session_id)
            
            # Send updated cards to all players for the new round
            for player_id in game.players.keys():
                player = game.get_player(player_id)
                if player and player.cards:
                    cards_data = [
                        {"suit": card.suit.value, "rank": card.rank.value}
                        for card in player.cards
                    ]
                    cards_message = create_message(
                        MessageType.PLAYER_UPDATE,
                        {"your_cards": cards_data},
                        session_id
                    )
                    await self.send_message_to_user(player_id, cards_message)
            
            # Broadcast new round start if game continues
            new_state = game.get_game_state()
            if new_state.get("phase") == "playing":
                await self.broadcast_to_session(
                    session_id,
                    create_message(
                        MessageType.ROUND_START,
                        {
                            "round_number": new_state.get("round_number"),
                            "current_player_id": new_state.get("current_player_id"),
                        },
                        session_id
                    )
                )
        else:
            error_message = create_message(
                MessageType.ERROR,
                {"message": message},
                session_id
            )
            await self.send_message_to_user(user_id, error_message)

    async def handle_message(
        self,
        websocket: WebSocketServerProtocol,
        message_str: str,
    ):
        """Handle incoming WebSocket message"""
        try:
            message = parse_message(message_str)
            data = message.data
            session_id = message.session_id

            if message.type == MessageType.CREATE_SESSION:
                await self.handle_create_session(websocket, data)

            elif message.type == MessageType.JOIN_SESSION:
                await self.handle_join_session(websocket, data)

            elif message.type == MessageType.GAME_START:
                user_id = data.get("user_id")
                if user_id and session_id:
                    await self.handle_game_start(user_id, session_id)

            elif message.type == MessageType.GAME_RESTART:
                user_id = data.get("user_id")
                if user_id and session_id:
                    await self.handle_game_restart(user_id, session_id)

            elif message.type == MessageType.KICK_USER:
                host_id = data.get("host_id")
                target_username = data.get("target_username")
                if host_id and target_username and session_id:
                    await self.handle_kick_user(host_id, session_id, target_username)

            elif message.type == MessageType.CALL_HAND:
                user_id = data.get("user_id")
                if user_id and session_id:
                    await self.handle_call_hand(user_id, session_id, data)

            elif message.type == MessageType.CALL_BLUFF:
                user_id = data.get("user_id")
                if user_id and session_id:
                    await self.handle_call_bluff(user_id, session_id)

            else:
                logger.warning(f"Unknown message type: {message.type}")

        except Exception as e:
            logger.error(f"Error handling message: {e}")
            error_response = create_message(
                MessageType.ERROR,
                {"message": "Invalid message format"}
            )
            await websocket.send(json.dumps(error_response))

    async def handle_client(self, websocket: WebSocketServerProtocol):
        """Handle individual client connection"""
        await self.register_connection(websocket)

        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except ConnectionClosed:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Error in client handler: {e}")
        finally:
            await self.unregister_connection(websocket)

    async def start_server(self):
        """Start the WebSocket server"""
        # Initialize user system
        await initialize_user_system()

        logger.info(f"Starting multi-session server on {self.host}:{self.port}")

        async with websockets.serve(self.handle_client, self.host, self.port):
            logger.info(f"Multi-session server started on ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever


async def main():
    """Main server entry point"""
    port = int(os.getenv("PORT", "8765"))
    server = MultiSessionGameServer(port=port)
    await server.start_server()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")