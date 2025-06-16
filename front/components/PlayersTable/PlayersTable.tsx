import React from "react"
import Image from "next/image"
import {
  Card as CardUi,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
// Button import removed - not used in new layout
import type { Player, Card } from "@/types/game-types"

/* Helper functions duplicated for now; could be centralised */
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
const getRankName = (rank: number) => {
  const faceRanks: Record<number, string> = { 11: "jack", 12: "queen", 13: "king", 14: "ace" }
  return faceRanks[rank] || rank.toString()
}

interface PlayersTableProps {
  players: Player[]
  currentRoundHands: Record<string, Card[]>
  previousRoundHands: Record<string, Card[]>
  playerLastCalls: Record<string, string>
  gamePhase: string | undefined
  currentPlayerId: string | undefined
  currentUserId: string
  yourCards: Card[]
}

// Top/Left percentages for 8 seats placed around a circle
const seatPositions = [
  { top: "-8%", left: "50%", transform: "translate(-50%, 0)" }, // 0 - top centre
  { top: "10%", left: "85%", transform: "translate(-50%, -50%)" }, // 1 - upper right
  { top: "50%", left: "100%", transform: "translate(-100%, -50%)" }, // 2 - right centre
  { top: "90%", left: "85%", transform: "translate(-50%, -50%)" }, // 3 - lower right
  { top: "108%", left: "50%", transform: "translate(-50%, -100%)" }, // 4 - bottom centre
  { top: "90%", left: "15%", transform: "translate(-50%, -50%)" }, // 5 - lower left
  { top: "50%", left: "0%", transform: "translate(0, -50%)" }, // 6 - left centre
  { top: "10%", left: "15%", transform: "translate(-50%, -50%)" }, // 7 - upper left
]

export function PlayersTable({
  players,
  currentRoundHands,
  previousRoundHands,
  playerLastCalls,
  gamePhase,
  currentPlayerId,
  currentUserId,
  yourCards,
}: PlayersTableProps) {
  const MAX_SEATS = 8
  if (!players?.length) return null

  const seats: (Player | null)[] = Array.from({ length: MAX_SEATS }).map((_, idx) => players[idx] ?? null)

  const renderCardImage = (
    src: string,
    alt: string,
    variant: "large" | "small",
    idx: number,
  ) => {
    const sizeMap = {
      large: "sm:w-15 sm:h-20",
      small: "sm:w-7.5 sm:h-10",
    } as const
    const cls = sizeMap[variant]
    const overlapMap = {
      large: "-ml-8", // approx half of w-16 (4rem)
      small: "-ml-5", // approx half of w-10 (2.5rem)
    } as const
    const overlap = idx === 0 ? "" : overlapMap[variant]
    return (
      <div key={idx} className={`relative ${cls} ${overlap}`}>
        <Image src={src} alt={alt} fill className="object-contain" />
      </div>
    )
  }

  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardHeader>
        <CardTitle className="text-green-400 text-lg">Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full max-w-lg mx-auto mt-4 aspect-square select-none">
          {/* Poker table */}
          <div className="absolute inset-0 rounded-full bg-green-800 border-8 border-green-900 shadow-inner" />

          {/* Seats */}
          {seats.map((player, seatIdx) => {
            const pos = seatPositions[seatIdx]
            if (!player) {
              return null // No label for empty seats
            }

            const isActiveTurn = gamePhase === "playing" && player.user_id === currentPlayerId
            const isEliminated = player.is_eliminated
            const borderColor = isEliminated
              ? "border-red-600"
              : isActiveTurn
              ? "border-green-500"
              : "border-gray-600"

            // Determine which hand to show and whether to use card backs
            const currentHand = currentRoundHands[player.user_id]
            const lastHand = previousRoundHands[player.user_id]
            const showCurrent = currentHand && currentHand.length > 0

            // If this is the current user and no "current hand" specified, use yourCards instead of backs
            const isSelf = player.user_id === currentUserId

            return (
              <div
                key={player.user_id}
                className="absolute flex flex-col items-center"
                style={{ top: pos.top, left: pos.left, transform: pos.transform }}
              >
                {/* Username */}
                <div
                  className={`px-2 py-1 rounded-md bg-slate-800 text-white text-sm border-2 ${borderColor}`}
                >
                  {player.username}
                </div>

                {/* Card count or current hand (hide if eliminated) */}
                {!isEliminated && (
                  <div className="flex mt-1">
                    {showCurrent
                      ? currentHand!.map((card, idx) => {
                          const suitName = getSuitName(card.suit)
                          const rankName = getRankName(card.rank)
                          const fileName = `${suitName}_${rankName}.svg`
                          return renderCardImage(`cards/${fileName}`, `${rankName} of ${suitName}`, "large", idx)
                        })
                      : isSelf
                      ? yourCards.map((card, idx) => {
                          const suitName = getSuitName(card.suit)
                          const rankName = getRankName(card.rank)
                          const fileName = `${suitName}_${rankName}.svg`
                          return renderCardImage(`cards/${fileName}`, `${rankName} of ${suitName}`, "large", idx)
                        })
                      : [...Array(player.card_count)].map((_, idx) =>
                          renderCardImage(
                            "cards/back_card.svg",
                            "Face down card",
                            "large",
                            idx,
                          ),
                        )}
                  </div>
                )}

                {/* Last hand when no current hand (only if not eliminated) */}
                {!isEliminated && !showCurrent && lastHand && lastHand.length > 0 && (
                  <div className="flex mt-1">
                    {lastHand.map((card, idx) => {
                      const suitName = getSuitName(card.suit)
                      const rankName = getRankName(card.rank)
                      const fileName = `${suitName}_${rankName}.svg`
                      return renderCardImage(`cards/${fileName}`, `${rankName} of ${suitName}`, "small", idx)
                    })}
                  </div>
                )}

                {/* Last call text */}
                <span className="text-xs text-gray-300 mt-1">
                  {playerLastCalls[player.user_id] ?? "-"}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </CardUi>
  )
} 