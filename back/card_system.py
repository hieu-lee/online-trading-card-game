"""
Card System for Online Card Game

This module handles all card-related functionality including:
- Card and Deck classes
- Poker hand detection and validation
- Hand comparison logic
- Card display formatting
"""

import random
from enum import Enum, IntEnum
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass
import re
from collections import Counter


class Suit(Enum):
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"
    SPADES = "♠"


class Rank(IntEnum):
    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14


class HandType(IntEnum):
    HIGH_CARD = 1
    PAIR = 2
    TWO_PAIRS = 3
    THREE_OF_A_KIND = 4
    STRAIGHT = 5
    FLUSH = 6
    FULL_HOUSE = 7
    FOUR_OF_A_KIND = 8
    STRAIGHT_FLUSH = 9
    ROYAL_FLUSH = 10


@dataclass
class Card:
    """Represents a playing card"""

    suit: Suit
    rank: Rank

    def __str__(self) -> str:
        rank_names = {
            Rank.TWO: "2",
            Rank.THREE: "3",
            Rank.FOUR: "4",
            Rank.FIVE: "5",
            Rank.SIX: "6",
            Rank.SEVEN: "7",
            Rank.EIGHT: "8",
            Rank.NINE: "9",
            Rank.TEN: "10",
            Rank.JACK: "J",
            Rank.QUEEN: "Q",
            Rank.KING: "K",
            Rank.ACE: "A",
        }
        return f"{rank_names[self.rank]}{self.suit.value}"

    def __eq__(self, other) -> bool:
        if not isinstance(other, Card):
            return False
        return (
            self.suit == other.suit
            and self.rank == other.rank
        )

    def __hash__(self) -> int:
        return hash((self.suit, self.rank))


@dataclass
class PokerHand:
    """Represents a poker hand call with all necessary details"""

    hand_type: HandType
    primary_rank: Optional[Rank] = (
        None  # For pair, three of a kind, four of a kind, straight
    )
    secondary_rank: Optional[Rank] = (
        None  # For two pairs, full house
    )
    suit: Optional[Suit] = (
        None  # For flush, straight flush, royal flush
    )
    ranks: Optional[List[Rank]] = (
        None  # For flush (all 5 ranks)
    )

    def __str__(self) -> str:
        """String representation of the poker hand call"""
        rank_names = {
            Rank.TWO: "2",
            Rank.THREE: "3",
            Rank.FOUR: "4",
            Rank.FIVE: "5",
            Rank.SIX: "6",
            Rank.SEVEN: "7",
            Rank.EIGHT: "8",
            Rank.NINE: "9",
            Rank.TEN: "10",
            Rank.JACK: "Jack",
            Rank.QUEEN: "Queen",
            Rank.KING: "King",
            Rank.ACE: "Ace",
        }

        if self.hand_type == HandType.HIGH_CARD:
            return (
                f"High Card {rank_names[self.primary_rank]}"
            )
        elif self.hand_type == HandType.PAIR:
            return (
                f"Pair of {rank_names[self.primary_rank]}s"
            )
        elif self.hand_type == HandType.TWO_PAIRS:
            return f"Two Pairs: {rank_names[self.primary_rank]}s and {rank_names[self.secondary_rank]}s"
        elif self.hand_type == HandType.THREE_OF_A_KIND:
            return f"Three of a Kind: {rank_names[self.primary_rank]}s"
        elif self.hand_type == HandType.STRAIGHT:
            return f"Straight from {rank_names[self.primary_rank]}"
        elif self.hand_type == HandType.FLUSH:
            rank_str = ",".join(
                [
                    rank_names[r]
                    for r in sorted(
                        self.ranks, reverse=True
                    )
                ]
            )
            return f"Flush of {self.suit.name.title()}: {rank_str}"
        elif self.hand_type == HandType.FULL_HOUSE:
            return f"Full House: Three {rank_names[self.primary_rank]}s, Two {rank_names[self.secondary_rank]}s"
        elif self.hand_type == HandType.FOUR_OF_A_KIND:
            return f"Four of a Kind: {rank_names[self.primary_rank]}s"
        elif self.hand_type == HandType.STRAIGHT_FLUSH:
            return f"Straight Flush {self.suit.name.title()} from {rank_names[self.primary_rank]}"
        elif self.hand_type == HandType.ROYAL_FLUSH:
            return f"Royal Flush {self.suit.name.title()}"

        return "Unknown Hand"


class Deck:
    """Standard 52-card deck"""

    def __init__(self):
        self.cards: List[Card] = []
        self.reset()

    def reset(self):
        """Reset deck to full 52 cards"""
        self.cards = []
        for suit in Suit:
            for rank in Rank:
                self.cards.append(Card(suit, rank))

    def shuffle(self):
        """Shuffle the deck"""
        random.shuffle(self.cards)

    def deal_card(self) -> Optional[Card]:
        """Deal one card from the deck"""
        if self.cards:
            return self.cards.pop()
        return None

    def deal_cards(self, count: int) -> List[Card]:
        """Deal multiple cards from the deck"""
        dealt_cards = []
        for _ in range(count):
            card = self.deal_card()
            if card:
                dealt_cards.append(card)
        return dealt_cards

    def remaining_cards(self) -> int:
        """Number of cards remaining in deck"""
        return len(self.cards)


class HandValidator:
    """Validates and detects poker hands from a collection of cards"""

    @staticmethod
    def get_rank_counts(
        cards: List[Card],
    ) -> Dict[Rank, int]:
        """Count occurrences of each rank"""
        counts = {}
        for card in cards:
            counts[card.rank] = counts.get(card.rank, 0) + 1
        return counts

    @staticmethod
    def get_suit_counts(
        cards: List[Card],
    ) -> Dict[Suit, int]:
        """Count occurrences of each suit"""
        counts = {}
        for card in cards:
            counts[card.suit] = counts.get(card.suit, 0) + 1
        return counts

    @staticmethod
    def validate_hand_call(
        hand_call: PokerHand, all_cards: List[Card]
    ) -> bool:
        """Validate if a specific hand call exists in the collection of cards"""
        if hand_call.hand_type == HandType.HIGH_CARD:
            return hand_call.primary_rank in [
                card.rank for card in all_cards
            ]
        rank_counts = Counter(
            [card.rank for card in all_cards]
        )
        if hand_call.hand_type == HandType.PAIR:
            return rank_counts[hand_call.primary_rank] >= 2
        if hand_call.hand_type == HandType.TWO_PAIRS:
            return (
                rank_counts[hand_call.primary_rank] >= 2
                and rank_counts[hand_call.secondary_rank]
                >= 2
            )
        if hand_call.hand_type == HandType.THREE_OF_A_KIND:
            return rank_counts[hand_call.primary_rank] >= 3
        if hand_call.hand_type == HandType.FOUR_OF_A_KIND:
            return rank_counts[hand_call.primary_rank] >= 4
        if hand_call.hand_type == HandType.FULL_HOUSE:
            return (
                rank_counts[hand_call.primary_rank] >= 3
                and rank_counts[hand_call.secondary_rank]
                >= 2
            )
        if hand_call.hand_type == HandType.STRAIGHT:
            hand_call.ranks = [
                hand_call.primary_rank + i for i in range(5)
            ]
            return all(
                rank_counts[rank] >= 1
                for rank in hand_call.ranks
            )
        if hand_call.hand_type == HandType.FLUSH:
            suit_ranks = dict()
            for card in all_cards:
                if card.suit not in suit_ranks:
                    suit_ranks[card.suit] = set()
                suit_ranks[card.suit].add(card.rank)
            return hand_call.suit in suit_ranks and all(
                hand_call.ranks[i]
                in suit_ranks[hand_call.suit]
                for i in range(5)
            )
        if hand_call.hand_type == HandType.STRAIGHT_FLUSH:
            hand_call.ranks = [
                hand_call.primary_rank + i for i in range(5)
            ]
            suit_ranks = dict()
            for card in all_cards:
                if card.suit not in suit_ranks:
                    suit_ranks[card.suit] = set()
                suit_ranks[card.suit].add(card.rank)
            return hand_call.suit in suit_ranks and all(
                hand_call.ranks[i]
                in suit_ranks[hand_call.suit]
                for i in range(5)
            )
        if hand_call.hand_type == HandType.ROYAL_FLUSH:
            hand_call.ranks = [
                Rank.TEN,
                Rank.JACK,
                Rank.QUEEN,
                Rank.KING,
                Rank.ACE,
            ]
            suit_ranks = dict()
            for card in all_cards:
                if card.suit not in suit_ranks:
                    suit_ranks[card.suit] = set()
                suit_ranks[card.suit].add(card.rank)
            return hand_call.suit in suit_ranks and all(
                hand_call.ranks[i]
                in suit_ranks[hand_call.suit]
                for i in range(5)
            )

    @staticmethod
    def hands_match(
        hand1: PokerHand, hand2: PokerHand
    ) -> bool:
        """Check if two poker hands are the same"""
        if hand1.hand_type != hand2.hand_type:
            return False

        if hand1.hand_type in [
            HandType.HIGH_CARD,
            HandType.PAIR,
            HandType.THREE_OF_A_KIND,
            HandType.FOUR_OF_A_KIND,
        ]:
            return hand1.primary_rank == hand2.primary_rank

        if hand1.hand_type == HandType.TWO_PAIRS:
            return (
                hand1.primary_rank == hand2.primary_rank
                and hand1.secondary_rank
                == hand2.secondary_rank
            )

        if hand1.hand_type == HandType.FULL_HOUSE:
            return (
                hand1.primary_rank == hand2.primary_rank
                and hand1.secondary_rank
                == hand2.secondary_rank
            )

        if hand1.hand_type in [
            HandType.STRAIGHT,
            HandType.STRAIGHT_FLUSH,
        ]:
            return hand1.primary_rank == hand2.primary_rank

        if hand1.hand_type in [
            HandType.FLUSH,
            HandType.ROYAL_FLUSH,
        ]:
            return hand1.suit == hand2.suit

        return False


class HandComparator:
    """Compares poker hands according to game rules"""

    @staticmethod
    def compare_hands(
        hand1: PokerHand, hand2: PokerHand
    ) -> int:
        """
        Compare two poker hands
        Returns: 1 if hand1 > hand2, -1 if hand1 < hand2, 0 if equal
        """
        # First compare by hand type
        if hand1.hand_type > hand2.hand_type:
            return 1
        elif hand1.hand_type < hand2.hand_type:
            return -1

        # Same hand type, compare by specific rules
        if hand1.hand_type in [
            HandType.HIGH_CARD,
            HandType.PAIR,
            HandType.THREE_OF_A_KIND,
            HandType.FOUR_OF_A_KIND,
            HandType.STRAIGHT,
            HandType.STRAIGHT_FLUSH,
        ]:
            return HandComparator._compare_by_primary_rank(
                hand1, hand2
            )

        elif hand1.hand_type == HandType.TWO_PAIRS:
            return HandComparator._compare_two_pairs(
                hand1, hand2
            )

        elif hand1.hand_type == HandType.FULL_HOUSE:
            return HandComparator._compare_full_house(
                hand1, hand2
            )

        elif hand1.hand_type == HandType.FLUSH:
            return HandComparator._compare_flush(
                hand1, hand2
            )

        elif hand1.hand_type == HandType.ROYAL_FLUSH:
            return 0  # All royal flushes are equal in this game

        return 0

    @staticmethod
    def _compare_by_primary_rank(
        hand1: PokerHand, hand2: PokerHand
    ) -> int:
        """Compare hands by primary rank"""
        if (
            hand1.primary_rank is None
            or hand2.primary_rank is None
        ):
            return 0
        if hand1.primary_rank > hand2.primary_rank:
            return 1
        elif hand1.primary_rank < hand2.primary_rank:
            return -1
        return 0

    @staticmethod
    def _compare_two_pairs(
        hand1: PokerHand, hand2: PokerHand
    ) -> int:
        """Compare two pairs hands"""
        if (
            hand1.primary_rank is None
            or hand2.primary_rank is None
            or hand1.secondary_rank is None
            or hand2.secondary_rank is None
        ):
            return 0
        min1 = min(hand1.primary_rank, hand1.secondary_rank)
        min2 = min(hand2.primary_rank, hand2.secondary_rank)
        max1 = max(hand1.primary_rank, hand1.secondary_rank)
        max2 = max(hand2.primary_rank, hand2.secondary_rank)
        t1 = (min1, max1)
        t2 = (min2, max2)

        if t1 > t2:
            return 1
        elif t1 < t2:
            return -1
        return 0

    @staticmethod
    def _compare_full_house(
        hand1: PokerHand, hand2: PokerHand
    ) -> int:
        """Compare full house hands"""
        # First compare three of a kind
        if hand1.primary_rank > hand2.primary_rank:
            return 1
        elif hand1.primary_rank < hand2.primary_rank:
            return -1

        # If three of a kind is same, compare pair
        if hand1.secondary_rank > hand2.secondary_rank:
            return 1
        elif hand1.secondary_rank < hand2.secondary_rank:
            return -1

        return 0

    @staticmethod
    def _compare_flush(
        hand1: PokerHand, hand2: PokerHand
    ) -> int:
        """Compare flush hands by highest card"""
        max1 = max(hand1.ranks) if hand1.ranks else Rank.TWO
        max2 = max(hand2.ranks) if hand2.ranks else Rank.TWO

        if max1 > max2:
            return 1
        elif max1 < max2:
            return -1
        return 0

    @staticmethod
    def is_valid_next_call(
        current_call: PokerHand, next_call: PokerHand
    ) -> bool:
        """Check if next_call is a valid higher call than current_call"""
        return (
            HandComparator.compare_hands(
                next_call, current_call
            )
            > 0
        )


class HandParser:
    """Parses string specifications into PokerHand objects"""

    @staticmethod
    def parse_hand_call(spec: str) -> PokerHand:
        """
        Parse a human-readable hand specification into a PokerHand.
        Supported formats:
        - 'High Card <rank>'
        - 'Pair of <rank>'
        - 'Two Pairs <rank1> and <rank2>'
        - 'Three of a Kind <rank>'
        - 'Straight from <rank>'
        - 'Flush of <suit>: <rank1>,<rank2>,<rank3>,<rank4>,<rank5>'
        - 'Full House: 3 <rank1> and 2 <rank2>'
        - 'Four of a Kind <rank>'
        - 'Straight Flush <suit> from <rank>'
        - 'Royal Flush <suit>'
        """
        s = spec.strip().lower()

        # Royal Flush
        m = re.match(r"^royal flush\s+(\w+)", s)
        if m:
            suit = HandParser._parse_suit(m.group(1))
            return PokerHand(
                HandType.ROYAL_FLUSH, suit=suit
            )

        # Straight Flush
        m = re.match(
            r"^straight flush\s+(\w+)\s+from\s+(\w+)", s
        )
        if m:
            suit = HandParser._parse_suit(m.group(1))
            rank = HandParser._parse_rank(m.group(2))
            return PokerHand(
                HandType.STRAIGHT_FLUSH,
                suit=suit,
                primary_rank=rank,
            )

        # Straight
        m = re.match(r"^straight\s+from\s+(\w+)", s)
        if m:
            rank = HandParser._parse_rank(m.group(1))
            return PokerHand(
                HandType.STRAIGHT, primary_rank=rank
            )

        # Flush (new syntax without "of" and with space-separated ranks)
        m = re.match(r"^flush\s+(\w+)(?:\s+([\w\s]+))$", s)
        if m:
            suit = HandParser._parse_suit(m.group(1))
            ranks_str = m.group(2).strip()
            rank_tokens = re.split(r"[\s]+", ranks_str)
            if len(rank_tokens) != 5:
                raise ValueError(
                    "Flush must specify exactly 5 ranks"
                )
            ranks = [
                HandParser._parse_rank(r)
                for r in rank_tokens
            ]
            return PokerHand(
                HandType.FLUSH, suit=suit, ranks=ranks
            )

        # Flush (legacy syntax with "of" and optional punctuation)
        m = re.match(
            r"^flush\s+of\s+(\w+)[\s\:\-,]*(.*)", s
        )
        if m:
            suit = HandParser._parse_suit(m.group(1))
            ranks_str = m.group(2)
            rank_tokens = re.split(r"[,\s]+", ranks_str)
            ranks = [
                HandParser._parse_rank(r)
                for r in rank_tokens
                if r
            ]
            return PokerHand(
                HandType.FLUSH, suit=suit, ranks=ranks
            )

        # Full House
        m = re.match(
            r"^full house[\s\:\-,]*3\s+(\w+)\s+and\s+2\s+(\w+)",
            s,
        )
        if m:
            r1 = HandParser._parse_rank(m.group(1))
            r2 = HandParser._parse_rank(m.group(2))
            return PokerHand(
                HandType.FULL_HOUSE,
                primary_rank=r1,
                secondary_rank=r2,
            )

        # Two Pairs
        m = re.match(
            r"^(?:two pairs?)[\s\:\-,]*(\w+)\s+and\s+(\w+)",
            s,
        )
        if m:
            r1 = HandParser._parse_rank(m.group(1))
            r2 = HandParser._parse_rank(m.group(2))
            hi, lo = max(r1, r2), min(r1, r2)
            return PokerHand(
                HandType.TWO_PAIRS,
                primary_rank=hi,
                secondary_rank=lo,
            )

        # Three of a Kind
        m = re.match(
            r"^(?:three of a kind|3 of a kind)[\s\:\-,]*(\w+)",
            s,
        )
        if m:
            r = HandParser._parse_rank(m.group(1))
            return PokerHand(
                HandType.THREE_OF_A_KIND, primary_rank=r
            )

        # Four of a Kind
        m = re.match(
            r"^(?:four of a kind|4 of a kind)[\s\:\-,]*(\w+)",
            s,
        )
        if m:
            r = HandParser._parse_rank(m.group(1))
            return PokerHand(
                HandType.FOUR_OF_A_KIND, primary_rank=r
            )

        # Pair
        m = re.match(r"^(?:pair of|pair)[\s\:\-,]*(\w+)", s)
        if m:
            r = HandParser._parse_rank(m.group(1))
            return PokerHand(HandType.PAIR, primary_rank=r)

        # High Card
        m = re.match(
            r"^(?:high card|highcard)[\s\:\-,]*(\w+)", s
        )
        if m:
            r = HandParser._parse_rank(m.group(1))
            return PokerHand(
                HandType.HIGH_CARD, primary_rank=r
            )

        raise ValueError(
            f"Cannot parse hand specification: {spec}"
        )

    @staticmethod
    def _parse_rank(token: str) -> Rank:
        token = token.lower().rstrip("s")
        rank_map = {
            "2": Rank.TWO,
            "3": Rank.THREE,
            "4": Rank.FOUR,
            "5": Rank.FIVE,
            "6": Rank.SIX,
            "7": Rank.SEVEN,
            "8": Rank.EIGHT,
            "9": Rank.NINE,
            "10": Rank.TEN,
            "jack": Rank.JACK,
            "j": Rank.JACK,
            "queen": Rank.QUEEN,
            "q": Rank.QUEEN,
            "king": Rank.KING,
            "k": Rank.KING,
            "ace": Rank.ACE,
            "a": Rank.ACE,
        }
        if token not in rank_map:
            raise ValueError(f"Unknown rank: {token}")
        return rank_map[token]

    @staticmethod
    def _parse_suit(token: str) -> Suit:
        token = token.lower().rstrip("s")
        suit_map = {
            "heart": Suit.HEARTS,
            "diamond": Suit.DIAMONDS,
            "club": Suit.CLUBS,
            "spade": Suit.SPADES,
        }
        if token not in suit_map:
            raise ValueError(f"Unknown suit: {token}")
        return suit_map[token]
