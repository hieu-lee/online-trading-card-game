import { useState, useCallback } from "react"

export function useMessages() {
  const [messages, setMessages] = useState<string[]>([])

  const addMessage = useCallback((msg: string) => {
    setMessages((prev) => [...prev.slice(-20), msg])
  }, [])

  return { messages, addMessage }
} 