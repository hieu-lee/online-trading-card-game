import { useState } from "react"

export function useAuthDialog() {
  const [showUsernameDialog, setShowUsernameDialog] = useState(true)
  const [usernameError, setUsernameError] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)

  return {
    showUsernameDialog,
    setShowUsernameDialog,
    usernameError,
    setUsernameError,
    isConnecting,
    setIsConnecting,
  }
} 