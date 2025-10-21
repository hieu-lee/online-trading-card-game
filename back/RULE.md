The rule of the game will be following:
- each round will start with a player (the first player of the first round will be chosen randomly, then the starting player of the i-th round with i > 1 will be the player to the left of the starting player of the i-1-th round).
- each round we will find a loser
- in the beginning of every round, we shufle the deck and the i-th player will get N cards with N = the number the i-th player lost + 1 (so first round, everyone gets 1 card) after a round, if a player having 5 cards just lost, they are eliminated from the game (if a player starting a round with 5 cards and lose in that round, they are eliminated)
- the game is over if there's only 1 player left, which will be the winner of that game.

In a round we will have the following rules:
- the starting player will call a poker hand H (highcard, pair, 2 pairs, 3 of a kind, straight, flush, full house, 4 of a kind, straight flush, royal flush), which means that the player believes in the set of cards C, which is the set of cards all players are holding, there exists H in C.
from the i-th player with i > 1, they will have 2 options:
    + calling another poker hand that is higher than the poker hand called by i-1-th player (if possible, if we reach royal flush somehow, only option 2 is available)
    + calling bluff
- if the i-th player called a poker hand, we move to the i+1-th player (the player to the left of the previous player)
- if the i-th player called bluff, everyone shows their cards, we will check if the poker hand called by the i-1-th player exists in this set of cards or not. - If it exists, the player i is the loser of the round, else i-1 is the loser and the round ends.


Some specification when calling a poker hand in this game:
- Ace is the highest, 2 is the lowest number
- highcard: you have to specify which card you are calling (highcard Ace, highcard King, highcard 2, etc.)
- a pair: you have to specify the number on the pair you are calling (pair of 2s, pair of 3s, pair of Aces, etc.)
- 2 pairs: you have to specify the 2 numbers on the pairs you are calling (pair of 2s and pair of 3s, pair of Aces and pair of Kings, etc.), of course these 2 numbers have to be different from each other
- 3 of a kind: you have to specify the number of your 3 of a kind (3 of 2s, 3 of 3s, 3 of Aces, etc.)
- straight: you have to specify the starting number of your straight (straight from 2, straight from 3, etc.), noticing that the number has to be lower than or equal to 10, because the highest straight is 10, jack, queen, king, ace - straight from 10, lowest straight starting from 2 (ace can only be in the straight from 10)
- flush: you have to specify the type of your flush (diamond/spade/heart/club) and 5 numbers of your flush (flush of diamond - 2,5,7,king,ace/ flush of spade - 3,4,5,10,jack, etc.)
- full house: you have to specify 2 numbers, the number with 3 cards and the number with 2 cards (3 Jacks 2 10s, 3 10s 2 jacks, 3 kings 2 aces, etc.)
4 of a kind: you have to specify 1 number, the number of your 4 of a kind (4 jacks, 4 kings, 4 aces, 4 2s, etc.)
- straight flush: you have to specify the type of your straight flush (diamond/heart/spade/club) and the starting number of your straight (smaller than or equal to 9, because 10 is royal flush). For example, straight flush diamond from 10/straight flush spade from 3, etc.
- royal flush: you have to specify the type (royal flush diamond, royal flush spade, etc)


Now move to comparison, because the next player has to call a bigger poker hand comparing to the current player, so this is how we compare 2 poker hands H1 and H2. We have the following type of poker hands in order from small to big.
HIGH_CARD
PAIR
TWO_PAIRS
THREE_OF_A_KIND
STRAIGHT
FLUSH
FULL_HOUSE
FOUR_OF_A_KIND
STRAIGHT_FLUSH
ROYAL_FLUSH

if H1.type > H2.type then H1 > H2. Now, if H1.type == H2.type, we will do the following:

if H1.type in {HIGH_CARD, PAIR, THREE_OF_A_KIND, FOUR_OF_A_KIND, STRAIGHT, STRAIGHT_FLUSH}: if H1.number > H2.number then H1 > H2

if H1.type == TWO_PAIRS: if max(H1.firstPairNumber, H1.secondPairNumber) > max(H2.firstPairNumber, H2.secondPairNumber) then H1 > H2

if H1.type == FULL_HOUSE: if (H1.threeOfAKindNumber > H2.threeOfAKindNumber) || (H1.threeOfAKindNumber == H2.threeOfAKindNumber && H1.pairNumber > H2.pairNumber) then H1 > H2

if H1.type == FLUSH: if max(H1.numbers) > max(H2.numbers) then H1 > H2.