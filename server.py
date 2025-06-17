"""
WebSocket Server for Online Card Game

This module handles:
- WebSocket server setup and connection management
- Message routing and broadcasting
- User authentication and session management
- Game state synchronization
"""

import asyncio
import websockets
import json
import logging
from typing import Set, Dict
from websockets.exceptions import ConnectionClosed
from websockets.server import WebSocketServerProtocol
import os

from message_protocol import MessageType, create_message, parse_message
from user_manager import (
    initialize_user_system,
    authenticate_user,
    disconnect_user,
    get_online_users,
    get_host,
    is_host,
    get_all_connections,
)
from game_logic import (
    add_player_to_game,
    remove_player_from_game,
    start_game,
    restart_game,
    make_hand_call,
    call_bluff,
    get_game_state,
    can_start_game,
    get_player_cards,
    get_current_active_players_hands,
    get_spectator_ids,
    get_active_player_ids,
)
from card_system import PokerHand, HandType, Suit, Rank
from card_system import HandParser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GameServer:
    """WebSocket server for the card game"""

    def __init__(self, host: str = "0.0.0.0", port: int = 8765):
        self.host = host
        self.port = port
        self.connections: Set[WebSocketServerProtocol] = set()
        self.user_connections: Dict[str, WebSocketServerProtocol] = {}

    async def register_connection(self, websocket: WebSocketServerProtocol):
        """Register a new WebSocket connection"""
        self.connections.add(websocket)
        logger.info(
            f"New connection registered. Total connections: {len(self.connections)}"
        )

    async def unregister_connection(self, websocket: WebSocketServerProtocol):
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
        # Capture user info before removing
        from user_manager import user_session_manager

        user = user_session_manager.get_user_by_id(user_id)

        # Remove from user management
        new_host = await disconnect_user(user_id)

        # Remove from game
        remove_player_from_game(user_id)

        # Remove from server tracking
        if user_id in self.user_connections:
            del self.user_connections[user_id]

        # Broadcast user leave message
        if user:
            await self.broadcast_message(
                create_message(
                    MessageType.USER_LEAVE,
                    {"user_id": user_id, "username": user.username},
                )
            )

        # Broadcast updates
        await self.broadcast_game_state()

        if new_host:
            await self.broadcast_message(
                create_message(
                    MessageType.HOST_CHANGED,
                    {"new_host": new_host.username, "host_id": new_host.id},
                )
            )

    async def broadcast_message(self, message: Dict):
        """Broadcast message to all connected clients"""
        if not self.connections:
            return

        message_str = json.dumps(message)
        disconnected = set()

        for websocket in self.connections:
            try:
                await websocket.send(message_str)
            except ConnectionClosed:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
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

    async def broadcast_game_state(self):
        """Broadcast current game state to all clients"""
        game_state = get_game_state()
        host = get_host()

        state_message = create_message(
            MessageType.GAME_STATE_UPDATE,
            {
                "game_state": game_state,
                "host": host.username if host else None,
                "online_users": [user.username for user in get_online_users()],
            },
        )
        current_round_cards = get_current_active_players_hands()
        if current_round_cards:
            current_round_cards_data = [
                {
                    "user_id": pid,
                    "cards": [
                        {"suit": card.suit.value, "rank": card.rank.value}
                        for card in cards
                    ],
                }
                for pid, cards in current_round_cards.items()
            ]
            state_message_for_spectators = create_message(
                MessageType.GAME_STATE_UPDATE,
                {
                    "game_state": game_state,
                    "host": host.username if host else None,
                    "online_users": [user.username for user in get_online_users()],
                    "current_round_cards": current_round_cards_data,
                },
            )
            spectator_ids = get_spectator_ids()
            for spectator_id in spectator_ids:
                await self.send_message_to_user(
                    spectator_id, state_message_for_spectators
                )
            active_player_ids = get_active_player_ids()
            for player_id in active_player_ids:
                if player_id in self.user_connections:
                    await self.send_message_to_user(player_id, state_message)
        else:
            await self.broadcast_message(state_message)

        # Also send waiting list details privately to host
        await self._send_waiting_list_to_host()

    async def _send_waiting_list_to_host(self):
        """Send the current waiting list (usernames) only to the host client"""
        host = get_host()
        if not host:
            return

        from game_logic import get_game
        from user_manager import user_session_manager

        waiting_ids = get_game().get_waiting_player_ids()
        if not waiting_ids:
            return

        waiting_usernames = []
        for uid in waiting_ids:
            user = user_session_manager.get_user_by_id(uid)
            if user:
                waiting_usernames.append(user.username)

        if not waiting_usernames:
            return

        waiting_message = create_message(
            MessageType.PLAYER_UPDATE, {"waiting_list": waiting_usernames}
        )

        await self.send_message_to_user(host.id, waiting_message)

    async def handle_user_join(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle user join request"""
        username = data.get("username", "").strip()

        success, message, user = await authenticate_user(username, websocket)

        if success and user:
            # Add to server tracking
            self.user_connections[user.id] = websocket

            # Add to game
            game_joined = add_player_to_game(user)

            # Determine if user is host
            host = get_host()
            if not host:
                # First user becomes host
                from user_manager import host_manager

                host_manager.set_host(user.id)
                is_user_host = True
            else:
                is_user_host = is_host(user.id)

            # Send join response
            response = create_message(
                MessageType.USER_JOIN,
                {
                    "success": True,
                    "message": message,
                    "user_id": user.id,
                    "username": user.username,
                    "is_host": is_user_host,
                    "game_joined": game_joined,
                },
            )
            await websocket.send(json.dumps(response))

            # If game is already in progress, inform the user to wait
            if not game_joined:
                waiting_msg = create_message(
                    MessageType.WAITING_FOR_GAME,
                    {"message": "Game in progress, please wait for next round"},
                )
                await websocket.send(json.dumps(waiting_msg))

            # Send user their cards if game is in progress
            user_cards = get_player_cards(user.id)
            if user_cards:
                cards_data = [
                    {"suit": card.suit.value, "rank": card.rank.value}
                    for card in user_cards
                ]
                cards_message = create_message(
                    MessageType.PLAYER_UPDATE, {"your_cards": cards_data}
                )
                await self.send_message_to_user(user.id, cards_message)

            # Broadcast updates
            await self.broadcast_game_state()

        else:
            # Send error response
            error_response = create_message(
                MessageType.USERNAME_ERROR, {"success": False, "message": message}
            )
            await websocket.send(json.dumps(error_response))

    async def handle_game_start(self, user_id: str):
        """Handle game start request"""
        if not is_host(user_id):
            return

        if can_start_game():
            if start_game():
                # Notify clients that the game has started
                await self.broadcast_message(
                    create_message(MessageType.GAME_START, {"message": "Game started!"})
                )
                # Broadcast round start information
                game_state = get_game_state()
                await self.broadcast_message(
                    create_message(
                        MessageType.ROUND_START,
                        {
                            "round_number": game_state["round_number"],
                            "current_player_id": game_state.get("current_player_id"),
                        },
                    )
                )
                # Broadcast full game state
                await self.broadcast_game_state()

                # Send cards to all players
                for player_user_id in self.user_connections.keys():
                    user_cards = get_player_cards(player_user_id)
                    if user_cards:
                        cards_data = [
                            {"suit": card.suit.value, "rank": card.rank.value}
                            for card in user_cards
                        ]
                        cards_message = create_message(
                            MessageType.PLAYER_UPDATE, {"your_cards": cards_data}
                        )
                        await self.send_message_to_user(player_user_id, cards_message)

    async def handle_game_restart(self, user_id: str):
        """Handle game restart request"""
        if not is_host(user_id):
            return

        restart_game()
        await self.broadcast_message(
            create_message(MessageType.GAME_RESTART, {"message": "Game restarted!"})
        )
        await self.broadcast_game_state()

    async def handle_kick_user(self, host_id: str, target_username: str):
        """Handle kick user request"""
        if not is_host(host_id):
            return

        # Find target user
        target_user = None
        for user in get_online_users():
            if user.username == target_username:
                target_user = user
                break

        if target_user:
            # Send kick message to target user
            kick_message = create_message(
                MessageType.USER_KICKED,
                {"message": f"You have been kicked by the host"},
            )
            await self.send_message_to_user(target_user.id, kick_message)

            # Disconnect the user
            websocket = self.user_connections.get(target_user.id)
            if websocket:
                await websocket.close()

    async def handle_call_hand(self, user_id: str, data: Dict):
        """Handle hand call from player"""
        # Parse hand specification from client
        spec = data.get("hand_spec", "").strip()
        if not spec:
            error_msg = create_message(
                MessageType.ERROR, {"message": "Hand specification is required"}
            )
            await self.send_message_to_user(user_id, error_msg)
            return
        try:
            hand = HandParser.parse_hand_call(spec)
        except Exception as e:
            error_msg = create_message(
                MessageType.ERROR, {"message": f"Invalid hand specification: {e}"}
            )
            await self.send_message_to_user(user_id, error_msg)
            return
        # Make the hand call
        success, message = make_hand_call(user_id, hand)
        if success:
            # Broadcast updated game state
            await self.broadcast_game_state()
        else:
            error_message = create_message(MessageType.ERROR, {"message": message})
            await self.send_message_to_user(user_id, error_message)

    async def handle_call_bluff(self, user_id: str):
        """Handle bluff call from player"""
        previous_round_cards = get_current_active_players_hands()
        previous_round_cards_data = [
            {
                "user_id": pid,
                "cards": [
                    {"suit": card.suit.value, "rank": card.rank.value} for card in cards
                ],
            }
            for pid, cards in previous_round_cards.items()
        ]
        success, message, loser = call_bluff(user_id)

        if success:
            bluff_message = create_message(
                MessageType.CALL_BLUFF,
                {
                    "message": message,
                    "loser": loser,
                    "previous_round_cards": previous_round_cards_data,
                },
            )
            await self.broadcast_message(bluff_message)
            # Broadcast updated game state
            await self.broadcast_game_state()
            # Send updated cards to all players for the new round
            for pid in list(self.user_connections.keys()):
                user_cards = get_player_cards(pid)
                cards_data = [
                    {"suit": card.suit.value, "rank": card.rank.value}
                    for card in user_cards
                ]
                cards_message = create_message(
                    MessageType.PLAYER_UPDATE, {"your_cards": cards_data}
                )
                await self.send_message_to_user(pid, cards_message)
            # Broadcast new round start if game continues
            new_state = get_game_state()
            if new_state.get("phase") == "playing":
                await self.broadcast_message(
                    create_message(
                        MessageType.ROUND_START,
                        {
                            "round_number": new_state.get("round_number"),
                            "current_player_id": new_state.get("current_player_id"),
                        },
                    )
                )
        else:
            error_message = create_message(MessageType.ERROR, {"message": message})
            await self.send_message_to_user(user_id, error_message)

    async def handle_message(
        self, websocket: WebSocketServerProtocol, message_str: str
    ):
        """Handle incoming WebSocket message"""
        try:
            message = parse_message(message_str)
            data = message.data

            if message.type == MessageType.USER_JOIN:
                await self.handle_user_join(websocket, data)

            elif message.type == MessageType.GAME_START:
                user_id = data.get("user_id")
                if user_id:
                    await self.handle_game_start(user_id)

            elif message.type == MessageType.GAME_RESTART:
                user_id = data.get("user_id")
                if user_id:
                    await self.handle_game_restart(user_id)

            elif message.type == MessageType.KICK_USER:
                host_id = data.get("host_id")
                target_username = data.get("target_username")
                if host_id and target_username:
                    await self.handle_kick_user(host_id, target_username)

            elif message.type == MessageType.CALL_HAND:
                user_id = data.get("user_id")
                if user_id:
                    await self.handle_call_hand(user_id, data)

            elif message.type == MessageType.CALL_BLUFF:
                user_id = data.get("user_id")
                if user_id:
                    await self.handle_call_bluff(user_id)

            else:
                logger.warning(f"Unknown message type: {message.type}")

        except Exception as e:
            logger.error(f"Error handling message: {e}")
            error_response = create_message(
                MessageType.ERROR, {"message": "Invalid message format"}
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

        logger.info(f"Starting server on {self.host}:{self.port}")

        async with websockets.serve(self.handle_client, self.host, self.port):
            logger.info(f"Server started on ws://{self.host}:{self.port}")
            await asyncio.Future()  # Run forever


async def main():
    """Main server entry point"""
    port = int(os.getenv("PORT", "8765"))
    server = GameServer(port=port)
    await server.start_server()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")