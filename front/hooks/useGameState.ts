import { useState } from "react"
import type { GameState } from "@/types/game-types"

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  return { gameState, setGameState }
} 