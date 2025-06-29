import { useState } from "react"

export function usePlayerLastCalls() {
  const [playerLastCalls, setPlayerLastCalls] = useState<Record<string, string>>({})
  return { playerLastCalls, setPlayerLastCalls }
} 