import unittest
from card_system import HandValidator, HandParser, PokerHand, HandType, Suit, Rank, Deck, HandComparator, Card


class TestHandParser(unittest.TestCase):
    def test_high_card(self):
        hand = HandParser.parse_hand_call("High Card Ace")
        self.assertEqual(hand, PokerHand(HandType.HIGH_CARD, primary_rank=Rank.ACE))

    def test_pair(self):
        hand = HandParser.parse_hand_call("Pair of 2")
        self.assertEqual(hand, PokerHand(HandType.PAIR, primary_rank=Rank.TWO))

    def test_two_pairs(self):
        hand = HandParser.parse_hand_call("Two Pairs king and 5")
        self.assertEqual(
            hand,
            PokerHand(HandType.TWO_PAIRS, primary_rank=Rank.KING, secondary_rank=Rank.FIVE)
        )

    def test_three_of_a_kind(self):
        hand = HandParser.parse_hand_call("Three of a Kind Queen")
        self.assertEqual(hand, PokerHand(HandType.THREE_OF_A_KIND, primary_rank=Rank.QUEEN))

    def test_four_of_a_kind(self):
        hand = HandParser.parse_hand_call("4 of a Kind 10")
        self.assertEqual(hand, PokerHand(HandType.FOUR_OF_A_KIND, primary_rank=Rank.TEN))

    def test_straight(self):
        hand = HandParser.parse_hand_call("Straight from 7")
        self.assertEqual(hand, PokerHand(HandType.STRAIGHT, primary_rank=Rank.SEVEN))
        hand = HandParser.parse_hand_call("straight from 10")
        self.assertEqual(hand, PokerHand(HandType.STRAIGHT, primary_rank=Rank.TEN))

    def test_flush(self):
        hand = HandParser.parse_hand_call("Flush of hearts: 2, 5, 7, king, ace")
        self.assertEqual(
            hand,
            PokerHand(
                HandType.FLUSH,
                suit=Suit.HEARTS,
                ranks=[Rank.TWO, Rank.FIVE, Rank.SEVEN, Rank.KING, Rank.ACE]
            )
        )

    def test_full_house(self):
        hand = HandParser.parse_hand_call("Full House: 3 jacks and 2 10s")
        self.assertEqual(
            hand,
            PokerHand(HandType.FULL_HOUSE, primary_rank=Rank.JACK, secondary_rank=Rank.TEN)
        )

    def test_straight_flush(self):
        hand = HandParser.parse_hand_call("Straight Flush spades from 9")
        self.assertEqual(
            hand,
            PokerHand(HandType.STRAIGHT_FLUSH, suit=Suit.SPADES, primary_rank=Rank.NINE)
        )

    def test_royal_flush(self):
        hand = HandParser.parse_hand_call("Royal Flush diamonds")
        self.assertEqual(
            hand,
            PokerHand(HandType.ROYAL_FLUSH, suit=Suit.DIAMONDS)
        )

    def test_invalid(self):
        with self.assertRaises(ValueError):
            HandParser.parse_hand_call("Not a valid hand")


def test_deck_unique():
    deck = Deck()
    deck.shuffle()
    cards = deck.deal_cards(52)
    # Ensure we dealt all 52 cards and there are no duplicates
    assert len(cards) == 52
    assert len(set(cards)) == 52


def test_hand_comparison_pair_beats_high_card():
    pair = PokerHand(HandType.PAIR, primary_rank=Rank.ACE)
    high_card = PokerHand(HandType.HIGH_CARD, primary_rank=Rank.KING)
    assert HandComparator.compare_hands(pair, high_card) > 0


# ---------------------------------------------------------------------------
# Tests for HandValidator.validate_hand_call
# ---------------------------------------------------------------------------


def test_validate_hand_call_pair():
    """Ensure HandValidator correctly detects a called Pair within a list of cards."""
    # Positive case – two Aces are present
    available_cards = [
        Card(Suit.HEARTS, Rank.ACE),
        Card(Suit.SPADES, Rank.ACE),
        Card(Suit.CLUBS, Rank.TEN),
        Card(Suit.DIAMONDS, Rank.TWO),
        Card(Suit.CLUBS, Rank.FIVE),
    ]
    pair_call = PokerHand(HandType.PAIR, primary_rank=Rank.ACE)
    assert HandValidator.validate_hand_call(pair_call, available_cards)

    # Negative case – only one Ace, so the pair should not be validated
    insufficient_cards = [
        Card(Suit.HEARTS, Rank.ACE),
        Card(Suit.CLUBS, Rank.TEN),
        Card(Suit.DIAMONDS, Rank.TWO),
        Card(Suit.SPADES, Rank.FIVE),
        Card(Suit.CLUBS, Rank.SEVEN),
    ]
    assert not HandValidator.validate_hand_call(pair_call, insufficient_cards)


# ---------------------------------------------
# High Card
# ---------------------------------------------


def test_validate_hand_call_high_card():
    """Positive and negative test for HIGH_CARD validation."""
    # Positive: King present in the cards
    cards_positive = [
        Card(Suit.HEARTS, Rank.KING),
        Card(Suit.CLUBS, Rank.TWO),
        Card(Suit.SPADES, Rank.FIVE),
    ]
    high_card_call = PokerHand(HandType.HIGH_CARD, primary_rank=Rank.KING)
    assert HandValidator.validate_hand_call(high_card_call, cards_positive)

    # Negative: King not present
    cards_negative = [
        Card(Suit.HEARTS, Rank.ACE),
        Card(Suit.CLUBS, Rank.TWO),
        Card(Suit.SPADES, Rank.FIVE),
    ]
    assert not HandValidator.validate_hand_call(high_card_call, cards_negative)


# ---------------------------------------------
# Two Pairs
# ---------------------------------------------


def test_validate_hand_call_two_pairs():
    """Positive and negative test for TWO_PAIRS validation."""
    call = PokerHand(HandType.TWO_PAIRS, primary_rank=Rank.KING, secondary_rank=Rank.FIVE)

    # Positive: exactly two Kings and two Fives
    positive_cards = [
        Card(Suit.HEARTS, Rank.KING),
        Card(Suit.SPADES, Rank.KING),
        Card(Suit.CLUBS, Rank.FIVE),
        Card(Suit.DIAMONDS, Rank.FIVE),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    # Negative: only one Five present (missing complete second pair)
    negative_cards = [
        Card(Suit.HEARTS, Rank.KING),
        Card(Suit.SPADES, Rank.KING),
        Card(Suit.CLUBS, Rank.FIVE),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


# ---------------------------------------------
# Three of a Kind
# ---------------------------------------------


def test_validate_hand_call_three_of_a_kind():
    """Positive and negative test for THREE_OF_A_KIND validation."""
    call = PokerHand(HandType.THREE_OF_A_KIND, primary_rank=Rank.QUEEN)

    positive_cards = [
        Card(Suit.HEARTS, Rank.QUEEN),
        Card(Suit.SPADES, Rank.QUEEN),
        Card(Suit.CLUBS, Rank.QUEEN),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    negative_cards = [
        Card(Suit.HEARTS, Rank.QUEEN),
        Card(Suit.SPADES, Rank.QUEEN),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


# ---------------------------------------------
# Four of a Kind
# ---------------------------------------------


def test_validate_hand_call_four_of_a_kind():
    """Positive and negative test for FOUR_OF_A_KIND validation."""
    call = PokerHand(HandType.FOUR_OF_A_KIND, primary_rank=Rank.TEN)

    positive_cards = [
        Card(Suit.HEARTS, Rank.TEN),
        Card(Suit.SPADES, Rank.TEN),
        Card(Suit.CLUBS, Rank.TEN),
        Card(Suit.DIAMONDS, Rank.TEN),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    negative_cards = [
        Card(Suit.HEARTS, Rank.TEN),
        Card(Suit.SPADES, Rank.TEN),
        Card(Suit.CLUBS, Rank.TEN),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


# ---------------------------------------------
# Straight
# ---------------------------------------------


def test_validate_hand_call_straight():
    """Positive and negative test for STRAIGHT validation (based on current implementation)."""
    call = PokerHand(HandType.STRAIGHT, primary_rank=Rank.SEVEN)

    positive_cards = [
        Card(Suit.HEARTS, Rank.SEVEN),
        Card(Suit.CLUBS, Rank.EIGHT),
        Card(Suit.DIAMONDS, Rank.NINE),
        Card(Suit.SPADES, Rank.TEN),
        Card(Suit.HEARTS, Rank.JACK),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    negative_cards = [
        Card(Suit.HEARTS, Rank.SEVEN),
        Card(Suit.CLUBS, Rank.EIGHT),
        Card(Suit.DIAMONDS, Rank.NINE),
        # Card(Suit.SPADES, Rank.TEN),
        Card(Suit.HEARTS, Rank.JACK),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


# ---------------------------------------------
# Flush
# ---------------------------------------------


def test_validate_hand_call_flush():
    """Positive and negative test for FLUSH validation."""
    flush_call = HandParser.parse_hand_call("Flush of hearts: 2, 5, 7, king, ace")

    # Build corresponding positive card list (all specified hearts cards)
    positive_cards = [
        Card(Suit.HEARTS, Rank.TWO),
        Card(Suit.HEARTS, Rank.FIVE),
        Card(Suit.HEARTS, Rank.SEVEN),
        Card(Suit.HEARTS, Rank.KING),
        Card(Suit.HEARTS, Rank.ACE),
    ]
    assert HandValidator.validate_hand_call(flush_call, positive_cards)

    # Negative: one card not of the correct suit
    negative_cards = [
        Card(Suit.HEARTS, Rank.TWO),
        Card(Suit.HEARTS, Rank.FIVE),
        Card(Suit.HEARTS, Rank.SEVEN),
        Card(Suit.HEARTS, Rank.KING),
        Card(Suit.SPADES, Rank.ACE),  # wrong suit
    ]
    assert not HandValidator.validate_hand_call(flush_call, negative_cards)


# ---------------------------------------------
# Full House
# ---------------------------------------------


def test_validate_hand_call_full_house():
    """Positive and negative test for FULL_HOUSE validation."""
    call = PokerHand(HandType.FULL_HOUSE, primary_rank=Rank.JACK, secondary_rank=Rank.TEN)

    positive_cards = [
        Card(Suit.HEARTS, Rank.JACK),
        Card(Suit.SPADES, Rank.JACK),
        Card(Suit.CLUBS, Rank.JACK),
        Card(Suit.HEARTS, Rank.TEN),
        Card(Suit.SPADES, Rank.TEN),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    negative_cards = [
        Card(Suit.HEARTS, Rank.JACK),
        Card(Suit.SPADES, Rank.JACK),
        Card(Suit.CLUBS, Rank.JACK),
        Card(Suit.HEARTS, Rank.TEN),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


# ---------------------------------------------
# Straight Flush
# ---------------------------------------------


def test_validate_hand_call_straight_flush():
    """Positive and negative test for STRAIGHT_FLUSH validation."""
    call = HandParser.parse_hand_call("Straight Flush spades from 9")

    # Positive cards: 9,10,J,Q,K of spades
    positive_cards = [
        Card(Suit.SPADES, Rank.NINE),
        Card(Suit.SPADES, Rank.TEN),
        Card(Suit.SPADES, Rank.JACK),
        Card(Suit.SPADES, Rank.QUEEN),
        Card(Suit.SPADES, Rank.KING),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    # Negative: missing Jack of spades
    negative_cards = [
        Card(Suit.SPADES, Rank.NINE),
        Card(Suit.SPADES, Rank.TEN),
        # Card(Suit.SPADES, Rank.JACK) missing
        Card(Suit.SPADES, Rank.QUEEN),
        Card(Suit.SPADES, Rank.KING),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


# ---------------------------------------------
# Royal Flush
# ---------------------------------------------


def test_validate_hand_call_royal_flush():
    """Positive and negative test for ROYAL_FLUSH validation."""
    call = HandParser.parse_hand_call("Royal Flush diamonds")

    positive_cards = [
        Card(Suit.DIAMONDS, Rank.TEN),
        Card(Suit.DIAMONDS, Rank.JACK),
        Card(Suit.DIAMONDS, Rank.QUEEN),
        Card(Suit.DIAMONDS, Rank.KING),
        Card(Suit.DIAMONDS, Rank.ACE),
    ]
    assert HandValidator.validate_hand_call(call, positive_cards)

    # Negative: missing Queen of diamonds
    negative_cards = [
        Card(Suit.DIAMONDS, Rank.TEN),
        Card(Suit.DIAMONDS, Rank.JACK),
        # Card(Suit.DIAMONDS, Rank.QUEEN) missing
        Card(Suit.DIAMONDS, Rank.KING),
        Card(Suit.DIAMONDS, Rank.ACE),
    ]
    assert not HandValidator.validate_hand_call(call, negative_cards)


if __name__ == '__main__':
    unittest.main() 