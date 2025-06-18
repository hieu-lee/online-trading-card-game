import React, { useState, useEffect } from "react"
import Image from "next/image"
import {
  Card as CardUi,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
// Button import removed - not used in new layout
import type { Player, Card } from "@/types/game-types"
import { useIsMobile } from "@/hooks/use-mobile"
import { X } from "lucide-react"

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

// --- Shared sizing & overlap helpers ---
export const CARD_SIZE_MAP = {
  large: "w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28",
  largeMoreCards: "w-12 h-18 sm:w-16 sm:h-24 md:w-20 md:h-28", // same size, different overlap
  small: "w-10 h-16 sm:w-12 sm:h-18 md:w-14 md:h-20",
} as const

export const OVERLAP_MAP = {
  large: "-ml-6 sm:-ml-8 md:-ml-10",
  largeMoreCards: "-ml-9 sm:-ml-12 md:-ml-15",
  small: "-ml-4 sm:-ml-5 md:-ml-6",
} as const

type CardVariant = keyof typeof CARD_SIZE_MAP

interface PlayersTableProps {
  players: Player[]
  currentRoundHands: Record<string, Card[]>
  previousRoundHands: Record<string, Card[]>
  playerLastCalls: Record<string, string>
  gamePhase: string | undefined
  currentPlayerId: string | undefined
  currentUserId: string
  yourCards: Card[]
  isHost: boolean
  onKickPlayer: (username: string) => void
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
  isHost,
  onKickPlayer,
}: PlayersTableProps) {
  const isMobile = useIsMobile()

  // Show previous round hands for 5 seconds once they change
  const [showLastHands, setShowLastHands] = useState(false)

  useEffect(() => {
    // Detect if we received any previous round hands (non-empty arrays)
    const hasPrevHands = Object.values(previousRoundHands).some(
      (arr) => Array.isArray(arr) && arr.length > 0,
    )

    if (hasPrevHands) {
      setShowLastHands(true)

      const timer = setTimeout(() => {
        setShowLastHands(false)
      }, 5000) // keep on screen for 5 seconds

      return () => clearTimeout(timer)
    }
  }, [previousRoundHands])

  // Helper to render a single card with a flip animation
  const FlipCard: React.FC<{
    card: Card
    variant: CardVariant
    idx: number
  }> = ({ card, variant, idx }) => {
    const [flipped, setFlipped] = useState(false)

    useEffect(() => {
      // start flip on mount – small delay allows initial render with back face
      const t = setTimeout(() => setFlipped(true), 20)
      return () => clearTimeout(t)
    }, [])

    const overlap = idx === 0 ? "" : OVERLAP_MAP[variant]
    const sizeCls = CARD_SIZE_MAP[variant]

    const suitName = getSuitName(card.suit)
    const rankName = getRankName(card.rank)
    const fileName = `${suitName}_${rankName}.svg`

    return (
      <div className={`flip-card relative ${sizeCls} ${overlap}`}>
        <div
          className={`flip-card-inner w-full h-full ${flipped ? "flipped" : ""}`}
        >
          {/* back */}
          <Image
            src="cards/back_card.svg"
            alt="Back of card"
            fill
            className="flip-card-front object-contain"
          />
          {/* front */}
          <Image
            src={`cards/${fileName}`}
            alt={`${rankName} of ${suitName}`}
            fill
            className="flip-card-back object-contain"
          />
        </div>
      </div>
    )
  }

  const MAX_SEATS = 8
  if (!players?.length) return null

  const seats: (Player | null)[] = Array.from({ length: MAX_SEATS }).map((_, idx) => players[idx] ?? null)

  const renderCardImage = (
    src: string,
    alt: string,
    variant: CardVariant,
    idx: number,
  ) => {
    const cls = CARD_SIZE_MAP[variant]
    const overlap = idx === 0 ? "" : OVERLAP_MAP[variant]
    return (
      <div key={idx} className={`relative ${cls} ${overlap}`}>
        <Image src={src} alt={alt} fill className="object-contain" />
      </div>
    )
  }

  // Helper to render username box with optional kick icon
  const UsernameBox: React.FC<{
    player: Player
    borderColor: string
  }> = ({ player, borderColor }) => {
    const showKick = isHost && player.user_id !== currentUserId
    return (
      <div
        className={`relative px-2 py-1 rounded-md bg-slate-800 text-white text-sm border-2 flex items-center justify-center ${borderColor}`}
      >
        {player.username}
        {showKick && (
          <button
            onClick={() => onKickPlayer(player.username)}
            className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5"
            title="Kick player"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardHeader>
        <CardTitle className="text-green-400 text-lg">Players</CardTitle>
      </CardHeader>
      <CardContent>
        {isMobile ? (
          // Mobile layout: username, last call, and cards in three columns
          <div className="grid grid-cols-3 gap-3 items-center">
            {players.map((player) => {
              if (!player) return null

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

              const isSelf = player.user_id === currentUserId

              return (
                <React.Fragment key={player.user_id}>
                  {/* Username column */}
                  <UsernameBox player={player} borderColor={borderColor} />

                  {/* Last call column */}
                  <span className="text-xs text-gray-300 text-center">
                    {playerLastCalls[player.user_id] ?? "-"}
                  </span>

                  {/* Cards column */}
                  <div className="flex items-center">
                    {!isEliminated && (
                      <>
                        {showCurrent
                          ? currentHand!.map((card, idx) => {
                              const suitName = getSuitName(card.suit)
                              const rankName = getRankName(card.rank)
                              const fileName = `${suitName}_${rankName}.svg`
                              const variant: CardVariant = currentHand!.length >= 4 ? "largeMoreCards" : "large"
                              return renderCardImage(
                                `cards/${fileName}`,
                                `${rankName} of ${suitName}`,
                                variant,
                                idx,
                              )
                            })
                          : showLastHands && lastHand && lastHand.length > 0
                            ? isSelf
                              ? lastHand.map((card, idx) => {
                                  const suitName = getSuitName(card.suit)
                                  const rankName = getRankName(card.rank)
                                  const fileName = `${suitName}_${rankName}.svg`
                                  const variant: CardVariant = lastHand.length >= 4 ? "largeMoreCards" : "large"
                                  return renderCardImage(
                                    `cards/${fileName}`,
                                    `${rankName} of ${suitName}`,
                                    variant,
                                    idx,
                                  )
                                })
                              : lastHand.map((card, idx) => (
                                  <FlipCard
                                    key={idx}
                                    card={card}
                                    variant={lastHand.length >= 4 ? "largeMoreCards" : "large"}
                                    idx={idx}
                                  />
                                ))
                            : isSelf
                              ? yourCards.map((card, idx) => {
                                  const suitName = getSuitName(card.suit)
                                  const rankName = getRankName(card.rank)
                                  const fileName = `${suitName}_${rankName}.svg`
                                  const variant: CardVariant = yourCards.length >= 4 ? "largeMoreCards" : "large"
                                  return renderCardImage(
                                    `cards/${fileName}`,
                                    `${rankName} of ${suitName}`,
                                    variant,
                                    idx,
                                  )
                                })
                              : [...Array(player.card_count)].map((_, idx) =>
                                  renderCardImage(
                                    "cards/back_card.svg",
                                    "Face down card",
                                    player.card_count >= 4 ? "largeMoreCards" : "large",
                                    idx,
                                  ),
                                )}
                      </>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        ) : (
          // Desktop layout: existing round table
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
                  <UsernameBox player={player} borderColor={borderColor} />

                  {/* Card count or current hand (hide if eliminated) */}
                  {!isEliminated && (
                    <div className="flex mt-1">
                      {showCurrent
                        ? currentHand!.map((card, idx) => {
                            const suitName = getSuitName(card.suit)
                            const rankName = getRankName(card.rank)
                            const fileName = `${suitName}_${rankName}.svg`
                            const variant: CardVariant = currentHand!.length >= 4 ? "largeMoreCards" : "large"
                            return renderCardImage(
                              `cards/${fileName}`,
                              `${rankName} of ${suitName}`,
                              variant,
                              idx,
                            )
                          })
                        : showLastHands && lastHand && lastHand.length > 0
                          ? isSelf
                            ? lastHand.map((card, idx) => {
                                const suitName = getSuitName(card.suit)
                                const rankName = getRankName(card.rank)
                                const fileName = `${suitName}_${rankName}.svg`
                                const variant: CardVariant = lastHand.length >= 4 ? "largeMoreCards" : "large"
                                return renderCardImage(
                                  `cards/${fileName}`,
                                  `${rankName} of ${suitName}`,
                                  variant,
                                  idx,
                                )
                              })
                            : lastHand.map((card, idx) => (
                                <FlipCard
                                  key={idx}
                                  card={card}
                                  variant={lastHand.length >= 4 ? "largeMoreCards" : "large"}
                                  idx={idx}
                                />
                              ))
                          : isSelf
                            ? yourCards.map((card, idx) => {
                                const suitName = getSuitName(card.suit)
                                const rankName = getRankName(card.rank)
                                const fileName = `${suitName}_${rankName}.svg`
                                const variant: CardVariant = yourCards.length >= 4 ? "largeMoreCards" : "large"
                                return renderCardImage(
                                  `cards/${fileName}`,
                                  `${rankName} of ${suitName}`,
                                  variant,
                                  idx,
                                )
                              })
                            : [...Array(player.card_count)].map((_, idx) =>
                                renderCardImage(
                                  "cards/back_card.svg",
                                  "Face down card",
                                  player.card_count >= 4 ? "largeMoreCards" : "large",
                                  idx,
                                ),
                              )}
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
        )}
      </CardContent>
    </CardUi>
  )
} 
