"""
Game Logic for Online Card Game

This module handles:
- Game state management
- Round logic and progression
- Player turn management
- Win/loss conditions
- Game flow control
"""

import random
import uuid
from typing import Dict, List, Optional, Tuple
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime

from card_system import Deck, Card, PokerHand, HandValidator, HandComparator
from user_manager import User


class GamePhase(Enum):
    WAITING = "waiting"
    PLAYING = "playing"
    ENDED = "ended"


class RoundPhase(Enum):
    DEALING = "dealing"
    CALLING = "calling"
    BLUFF_CALLED = "bluff_called"
    SHOWING_CARDS = "showing_cards"
    ROUND_END = "round_end"


@dataclass
class Player:
    """Player in the game"""

    user: User
    cards: List[Card] = field(default_factory=list)
    losses: int = 0
    is_eliminated: bool = False

    @property
    def card_count(self) -> int:
        return len(self.cards)

    @property
    def next_round_cards(self) -> int:
        """Number of cards player will get next round"""
        return self.losses + 1


@dataclass
class HandCall:
    """Represents a hand call made by a player"""

    player_id: str
    hand: PokerHand
    timestamp: datetime


@dataclass
class Round:
    """Represents a single round of the game"""

    round_number: int
    starting_player_id: str
    current_player_id: str
    players: List[Player]
    deck: Deck
    hand_calls: List[HandCall] = field(default_factory=list)
    phase: RoundPhase = RoundPhase.DEALING
    loser_id: Optional[str] = None
    all_cards: List[Card] = field(default_factory=list)

    def get_current_call(self) -> Optional[HandCall]:
        """Get the most recent hand call"""
        if self.hand_calls:
            return self.hand_calls[-1]
        return None

    def get_next_player_id(self, current_player_id: str) -> str:
        """Get the next player in turn order"""
        active_players = [p for p in self.players if not p.is_eliminated]
        current_index = next(
            (i for i, p in enumerate(active_players) if p.user.id == current_player_id),
            0,
        )
        next_index = (current_index + 1) % len(active_players)
        return active_players[next_index].user.id


class Game:
    """Main game class managing the entire game state"""

    def __init__(self):
        self.game_id = str(uuid.uuid4())
        self.phase = GamePhase.WAITING
        self.players: Dict[str, Player] = {}  # user_id -> Player
        self.player_order: List[str] = []  # Ordered list of player IDs
        self.current_round: Optional[Round] = None
        self.round_number = 0
        self.winner_id: Optional[str] = None
        self.started_at: Optional[datetime] = None
        self.ended_at: Optional[datetime] = None
        self.waiting_players: List[str] = []  # Players waiting to join next game

    def add_player(self, user: User) -> bool:
        """Add a player to the game"""
        if self.phase != GamePhase.WAITING:
            # Game in progress, add to waiting list
            if user.id not in self.waiting_players:
                self.waiting_players.append(user.id)
            return False

        if len(self.players) >= 8:
            return False

        if user.id not in self.players:
            self.players[user.id] = Player(user=user)
            self.player_order.append(user.id)

        return True

    def remove_player(self, user_id: str):
        """Remove a player from the game"""
        # Remove from active players and current round if in progress
        if user_id in self.players:
            # Handle disconnection during a round
            if self.current_round:
                # Remove player from current round's player list
                self.current_round.players = [
                    p for p in self.current_round.players if p.user.id != user_id
                ]
                # If it was this player's turn, move to the next player
                if self.current_round.current_player_id == user_id:
                    self.current_round.current_player_id = (
                        self.current_round.get_next_player_id(user_id)
                    )
            # Remove from game-wide tracking
            del self.players[user_id]
            if user_id in self.player_order:
                self.player_order.remove(user_id)

        if user_id in self.waiting_players:
            self.waiting_players.remove(user_id)

        # Check if game should end due to insufficient players
        if self.phase == GamePhase.PLAYING and len(self.get_active_players()) <= 1:
            self.end_game()

    def get_active_players(self) -> List[Player]:
        """Get all non-eliminated players"""
        return (
            [
                p
                for p in self.players.values()
                if not p.is_eliminated and p.user.id not in self.waiting_players
            ]
            if self.phase == GamePhase.PLAYING
            else []
        )

    def get_spectator_ids(self) -> List[str]:
        """Get IDs of players who are spectating (waiting to join)"""
        if self.phase != GamePhase.PLAYING:
            return []
        result = [
            user_id for user_id in self.waiting_players if user_id not in self.players
        ]
        result.extend(
            player.user.id for player in self.players.values() if player.is_eliminated
        )
        return result

    def get_player(self, user_id: str) -> Optional[Player]:
        """Get player by user ID"""
        return self.players.get(user_id)

    def can_start_game(self) -> bool:
        """Check if game can be started"""
        return self.phase == GamePhase.WAITING and len(self.players) >= 2

    def start_game(self) -> bool:
        """Start the game"""
        if not self.can_start_game():
            return False

        self.phase = GamePhase.PLAYING
        self.started_at = datetime.now()
        self.round_number = 0

        # Reset all players
        for player in self.players.values():
            player.losses = 0
            player.is_eliminated = False
            player.cards = []

        # Start first round
        self.start_new_round()
        return True

    def start_new_round(self):
        """Start a new round"""
        self.round_number += 1
        active_players = self.get_active_players()

        if len(active_players) <= 1:
            self.end_game()
            return

        # Determine starting player
        if self.round_number == 1:
            # First round: random starting player
            starting_player = random.choice(active_players)
        else:
            # Subsequent rounds: player to the left of previous round's starter
            if self.current_round:
                prev_starter_id = self.current_round.starting_player_id
                prev_index = next(
                    (
                        i
                        for i, p in enumerate(active_players)
                        if p.user.id == prev_starter_id
                    ),
                    0,
                )
                next_index = (prev_index + 1) % len(active_players)
                starting_player = active_players[next_index]
            else:
                starting_player = active_players[0]

        # Create new round
        deck = Deck()
        deck.shuffle()

        self.current_round = Round(
            round_number=self.round_number,
            starting_player_id=starting_player.user.id,
            current_player_id=starting_player.user.id,
            players=active_players.copy(),
            deck=deck,
        )

        # Deal cards to players
        self.deal_cards()

    def deal_cards(self):
        """Deal cards to all active players"""
        if not self.current_round:
            return

        all_cards = []
        for player in self.current_round.players:
            cards_to_deal = player.next_round_cards
            player.cards = self.current_round.deck.deal_cards(cards_to_deal)
            all_cards.extend(player.cards)

        self.current_round.all_cards = all_cards
        self.current_round.phase = RoundPhase.CALLING

    def make_hand_call(self, user_id: str, hand: PokerHand) -> Tuple[bool, str]:
        """Player makes a hand call"""
        if not self.current_round or self.current_round.phase != RoundPhase.CALLING:
            return False, "Not in calling phase"

        if self.current_round.current_player_id != user_id:
            return False, "Not your turn"

        # Validate the call is higher than previous call
        current_call = self.current_round.get_current_call()
        if current_call:
            if not HandComparator.is_valid_next_call(current_call.hand, hand):
                return False, "Hand call must be higher than previous call"

        # Add the call
        hand_call = HandCall(player_id=user_id, hand=hand, timestamp=datetime.now())
        self.current_round.hand_calls.append(hand_call)

        # Move to next player
        self.current_round.current_player_id = self.current_round.get_next_player_id(
            user_id
        )

        return True, "Hand call made successfully"

    def call_bluff(self, user_id: str) -> Tuple[bool, str, Optional[str]]:
        """Player calls bluff on the previous hand call"""
        if not self.current_round or self.current_round.phase != RoundPhase.CALLING:
            return False, "Not in calling phase", None

        if self.current_round.current_player_id != user_id:
            return False, "Not your turn", None

        current_call = self.current_round.get_current_call()
        if not current_call:
            return False, "No hand call to bluff", None

        # Check if the called hand exists in all cards
        hand_exists = HandValidator.validate_hand_call(
            current_call.hand, self.current_round.all_cards
        )

        self.current_round.phase = RoundPhase.BLUFF_CALLED

        if hand_exists:
            # Hand exists, bluff caller loses
            loser_id = user_id
        else:
            # Hand doesn't exist, hand caller loses
            loser_id = current_call.player_id

        self.current_round.loser_id = loser_id
        self.end_round(loser_id)

        return (
            True,
            f"Bluff called! Hand {'exists' if hand_exists else 'does not exist'}",
            loser_id,
        )

    def end_round(self, loser_id: str):
        """End the current round with a loser"""
        if not self.current_round:
            return

        self.current_round.phase = RoundPhase.ROUND_END
        loser = self.get_player(loser_id)

        if loser:
            loser.losses += 1

            # Check if player should be eliminated
            if loser.losses >= 5:
                loser.is_eliminated = True

        # Check if game should end
        active_players = self.get_active_players()
        if len(active_players) <= 1:
            self.end_game()
        else:
            # Start next round after a delay
            self.start_new_round()

    def end_game(self):
        """End the game"""
        self.phase = GamePhase.ENDED
        self.ended_at = datetime.now()

        active_players = self.get_active_players()
        if active_players:
            self.winner_id = active_players[0].user.id

        # Move waiting players and reset the game state for the next match.
        # This fulfils Task 5.4 requirements (reset phase, round count, cards, etc.).
        self.restart_game()

    def restart_game(self):
        """Restart the game"""
        # Reset game state
        self.game_id = str(uuid.uuid4())
        self.phase = GamePhase.WAITING
        self.current_round = None
        self.round_number = 0
        self.winner_id = None
        self.started_at = None
        self.ended_at = None

        # Reset all players
        for player in self.players.values():
            player.losses = 0
            player.is_eliminated = False
            player.cards = []

        # Add waiting players to the game
        # Integrate players that were waiting while the last game was active.
        # We only add players that are still online, stopping once we reach
        # the 8-player cap.
        if self.waiting_players:
            from user_manager import (
                user_session_manager,
            )  # local import to avoid circular dep

            for waiting_user_id in self.waiting_players[:]:
                if len(self.players) >= 8:
                    break  # Room is full

                user_obj = user_session_manager.get_user_by_id(waiting_user_id)
                if user_obj:
                    self.add_player(user_obj)

        # Remove transferred users from the waiting list
        self.waiting_players = [
            uid for uid in self.waiting_players if uid not in self.players
        ]

        # At this point, all players' cards are already emptied above. By
        # broadcasting the updated game state, clients can refresh their UI.

    def get_game_state(self) -> Dict:
        """Get current game state for broadcasting"""
        players_info = []
        for player_id in self.player_order:
            player = self.players.get(player_id)
            if player:
                players_info.append(
                    {
                        "user_id": player.user.id,
                        "username": player.user.username,
                        "card_count": player.card_count,
                        "losses": player.losses,
                        "is_eliminated": player.is_eliminated,
                    }
                )

        current_call = None
        if self.current_round:
            latest_call = self.current_round.get_current_call()
            if latest_call:
                current_call = {
                    "player_id": latest_call.player_id,
                    "hand": str(latest_call.hand),
                    "timestamp": latest_call.timestamp.isoformat(),
                }

        return {
            "game_id": self.game_id,
            "phase": self.phase.value,
            "players": players_info,
            "round_number": self.round_number,
            "current_player_id": (
                self.current_round.current_player_id if self.current_round else None
            ),
            "current_call": current_call,
            "winner_id": self.winner_id,
            "waiting_players_count": len(self.waiting_players),
        }

    def get_waiting_player_ids(self) -> List[str]:
        """Return a copy of waiting player user IDs"""
        return self.waiting_players.copy()


# Global game instance
game_instance = Game()


def get_game() -> Game:
    """Get the global game instance"""
    return game_instance


def add_player_to_game(user: User) -> bool:
    """Add player to the game"""
    return game_instance.add_player(user)


def remove_player_from_game(user_id: str):
    """Remove player from the game"""
    game_instance.remove_player(user_id)


def start_game() -> bool:
    """Start the game"""
    return game_instance.start_game()


def restart_game():
    """Restart the game"""
    game_instance.restart_game()


def make_hand_call(user_id: str, hand: PokerHand) -> Tuple[bool, str]:
    """Make a hand call"""
    return game_instance.make_hand_call(user_id, hand)


def call_bluff(user_id: str) -> Tuple[bool, str, Optional[str]]:
    """Call bluff"""
    return game_instance.call_bluff(user_id)


def get_active_player_ids() -> List[str]:
    """Get IDs of active players"""
    return [player.user.id for player in game_instance.get_active_players()]


def get_spectator_ids() -> List[str]:
    """Get IDs of players who are spectating"""
    return game_instance.get_spectator_ids()


def get_current_active_players_hands() -> Dict[str, List[Card]]:
    """Get current active players' hands"""
    active_players = game_instance.get_active_players()
    return {player.user.id: player.cards for player in active_players}


def get_game_state() -> Dict:
    """Get current game state"""
    return game_instance.get_game_state()


def can_start_game() -> bool:
    """Check if game can start"""
    return game_instance.can_start_game()


def get_player_cards(user_id: str) -> List[Card]:
    """Get player's cards"""
    player = game_instance.get_player(user_id)
    return player.cards if player else []
