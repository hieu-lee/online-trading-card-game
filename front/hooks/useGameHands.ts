import { useState } from "react"
import type { Card } from "@/types/game-types"

export function useGameHands() {
  const [yourCards, setYourCards] = useState<Card[]>([])
  const [previousRoundHands, setPreviousRoundHands] = useState<Record<string, Card[]>>({})
  const [currentRoundHands, setCurrentRoundHands] = useState<Record<string, Card[]>>({})

  return {
    yourCards,
    setYourCards,
    previousRoundHands,
    setPreviousRoundHands,
    currentRoundHands,
    setCurrentRoundHands,
  }
} 