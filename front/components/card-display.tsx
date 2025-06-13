import type { Card } from "../types/game-types"

interface CardProps {
  card: Card
}

export function CardComponent({ card }: CardProps) {
  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      "♥": "♥",
      "♦": "♦",
      "♣": "♣",
      "♠": "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    }
    return symbols[suit] || suit
  }

  const getRankDisplay = (rank: number) => {
    const ranks: Record<number, string> = {
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "10",
      11: "J",
      12: "Q",
      13: "K",
      14: "A",
    }
    return ranks[rank] || rank.toString()
  }

  const isRed = card.suit === "♥" || card.suit === "♦" || card.suit === "hearts" || card.suit === "diamonds"
  const suitSymbol = getSuitSymbol(card.suit)
  const rankDisplay = getRankDisplay(card.rank)

  return (
    <div className="inline-block bg-white border-2 border-gray-300 rounded-lg p-2 m-1 shadow-md min-w-[60px] text-center">
      <div className={`text-lg font-bold ${isRed ? "text-red-600" : "text-black"}`}>{rankDisplay}</div>
      <div className={`text-xl ${isRed ? "text-red-600" : "text-black"}`}>{suitSymbol}</div>
    </div>
  )
}

interface CardsDisplayProps {
  cards: Card[]
  title?: string
}

export function CardsDisplay({ cards, title }: CardsDisplayProps) {
  if (!cards || cards.length === 0) {
    return null
  }

  return (
    <div className="mb-4">
      {title && <h3 className="text-lg font-semibold text-green-400 mb-2">{title}</h3>}
      <div className="flex flex-wrap">
        {cards.map((card, index) => (
          <CardComponent key={index} card={card} />
        ))}
      </div>
    </div>
  )
}
