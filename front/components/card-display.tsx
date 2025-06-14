import Image from "next/image"
import type { Card } from "../types/game-types"

interface CardProps {
  card: Card
}

export function CardComponent({ card }: CardProps) {
  // Convert various suit representations to a canonical lowercase name
  const getSuitName = (suit: string) => {
    const map: Record<string, string> = {
      "♥": "hearts",
      "♦": "diamonds",
      "♣": "clubs",
      "♠": "spades",
      hearts: "hearts",
      diamonds: "diamonds",
      clubs: "clubs",
      spades: "spades",
    }
    return map[suit] || suit.toLowerCase()
  }

  // Map numeric rank to filename-friendly string
  const getRankName = (rank: number) => {
    const faceRanks: Record<number, string> = {
      11: "jack",
      12: "queen",
      13: "king",
      14: "ace",
    }
    return faceRanks[rank] || rank.toString()
  }

  const suitName = getSuitName(card.suit)
  const rankName = getRankName(card.rank)

  const fileName = `${suitName}_${rankName}.svg`

  return (
    <div className="inline-block bg-white border-2 border-gray-300 rounded-lg p-1 m-1 shadow-md">
      <Image src={`cards/${fileName}`} alt={`${rankName} of ${suitName}`} width={80} height={112} />
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
