import { useState } from "react"

export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  return { onlineUsers, setOnlineUsers }
} 