import unittest
from card_system import HandValidator, HandParser, PokerHand, HandType, Suit, Rank, Deck, HandComparator


class TestIsStraight(unittest.TestCase):
    def test_regular_straight_true(self):
        ranks = [Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX]
        result, start = HandValidator.is_straight(ranks)
        self.assertTrue(result)
        self.assertEqual(start, Rank.TWO)
        ranks = [Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE]
        result, start = HandValidator.is_straight(ranks)
        self.assertTrue(result)
        self.assertEqual(start, Rank.TEN)

    def test_not_straight_with_gap(self):
        ranks = [Rank.TWO, Rank.THREE, Rank.FOUR, Rank.SIX, Rank.SEVEN]
        result, start = HandValidator.is_straight(ranks)
        self.assertFalse(result)
        self.assertIsNone(start)

    def test_wheel_straight_disallowed(self):
        ranks = [Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE]
        result, start = HandValidator.is_straight(ranks)
        self.assertFalse(result)
        self.assertIsNone(start)


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


if __name__ == '__main__':
    unittest.main() 