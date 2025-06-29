import { useState } from "react"

export function useUserInfo() {
  const [userId, setUserId] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [isHost, setIsHost] = useState(false)

  return { userId, setUserId, username, setUsername, isHost, setIsHost }
} 