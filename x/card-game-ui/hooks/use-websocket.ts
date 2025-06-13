"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { GameMessage, MessageType } from "../types/game-types"

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const messageHandlersRef = useRef<Map<string, (data: any) => void>>(new Map())

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        console.log("Connected to WebSocket server")
      }

      ws.onclose = () => {
        setIsConnected(false)
        console.log("Disconnected from WebSocket server")
      }

      ws.onerror = (error) => {
        setConnectionError("Connection failed")
        console.error("WebSocket error:", error)
      }

      ws.onmessage = (event) => {
        try {
          const message: GameMessage = JSON.parse(event.data)
          const handler = messageHandlersRef.current.get(message.type)
          if (handler) {
            handler(message.data)
          }
        } catch (error) {
          console.error("Error parsing message:", error)
        }
      }

      wsRef.current = ws
    } catch (error) {
      setConnectionError("Failed to create WebSocket connection")
      console.error("WebSocket connection error:", error)
    }
  }, [url])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback((type: MessageType, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = { type, data }
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const addMessageHandler = useCallback((type: string, handler: (data: any) => void) => {
    messageHandlersRef.current.set(type, handler)
  }, [])

  const removeMessageHandler = useCallback((type: string) => {
    messageHandlersRef.current.delete(type)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
  }
}
