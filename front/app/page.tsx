"use client"

import { useState, useEffect, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Club, Diamond, Spade, Heart } from "lucide-react"

import { useWebSocket } from "@/hooks/use-websocket"
import { UsernameDialog } from "@/components/UsernameDialog"
import { HandInput } from "@/components/HandInput"
import { MessageType, type GameState, type Card } from "@/types/game-types"
import { UserStatusCard } from "@/components/UserStatusCard"
import { YourCards } from "@/components/YourCards"
import { PlayersTable } from "@/components/PlayersTable"
import { HostControls } from "@/components/HostControls"
import { OnlineUsersCard } from "@/components/OnlineUsersCard"
import { GameStatusCard } from "@/components/GameStatusCard"
import { RecentMessages } from "@/components/RecentMessages"
import { useAuthDialog } from "@/hooks/useAuthDialog"
import { useUserInfo } from "@/hooks/useUserInfo"
import { useOnlineUsers } from "@/hooks/useOnlineUsers"
import { useMessages } from "@/hooks/useMessages"
import { usePlayerLastCalls } from "@/hooks/usePlayerLastCalls"
import { useGameHands } from "@/hooks/useGameHands"
import { useGameState } from "@/hooks/useGameState"

// local
// const WS_URL = "ws://localhost:8765"
// staging
const WS_URL = "wss://online-trading-card-game-production.up.railway.app"
// prod
// const WS_URL = "wss://online-trading-card-game.onrender.com"

export default function Component() {
  const {
    showUsernameDialog,
    setShowUsernameDialog,
    usernameError,
    setUsernameError,
    isConnecting,
    setIsConnecting,
  } = useAuthDialog()

  const {
    userId,
    setUserId,
    username,
    setUsername,
    isHost,
    setIsHost,
  } = useUserInfo()

  const { onlineUsers, setOnlineUsers } = useOnlineUsers()

  const { gameState, setGameState } = useGameState()

  const { messages, addMessage } = useMessages()

  const { playerLastCalls, setPlayerLastCalls } = usePlayerLastCalls()

  const {
    yourCards,
    setYourCards,
    previousRoundHands,
    setPreviousRoundHands,
    currentRoundHands,
    setCurrentRoundHands,
  } = useGameHands()

  const { isConnected, connectionError, connect, disconnect, sendMessage, addMessageHandler } = useWebSocket(WS_URL)

  // Message handlers
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addMessageHandler(MessageType.USER_JOIN, (data: any) => {
      if (data.success) {
        setUserId(data.user_id)
        setUsername(data.username)
        setIsHost(data.is_host || false)
        setShowUsernameDialog(false)
        setUsernameError("")
        addMessage(data.message || "Joined game successfully")
        if (data.is_host) {
          addMessage("You are the host!")
        }
      } else {
        setUsernameError(data.message || "Failed to join game")
      }
      setIsConnecting(false)
    })

    addMessageHandler(MessageType.USERNAME_ERROR, (data: { message: string }) => {
      setUsernameError(data.message || "Username error")
      setIsConnecting(false)
    })

    addMessageHandler(MessageType.GAME_STATE_UPDATE, (data: {
      game_state: GameState,
      online_users: string[],
      current_round_cards?: { user_id: string; cards: Card[] }[]
    }) => {
      setGameState(data.game_state)
      setOnlineUsers(data.online_users || [])

      // Handle current round hands (for display in table)
      if (data.current_round_cards && data.current_round_cards.length > 0) {
        const handsMap = data.current_round_cards.reduce<Record<string, Card[]>>((acc, curr) => {
          acc[curr.user_id] = curr.cards
          return acc
        }, {})
        setCurrentRoundHands(handsMap)
      } else {
        setCurrentRoundHands({})
      }

      // Update player last calls
      const currentCall = data.game_state?.current_call
      if (currentCall?.player_id && currentCall?.hand) {
        setPlayerLastCalls((prev) => ({
          ...prev,
          [currentCall.player_id]: currentCall.hand,
        }))
        addMessage(`${data.game_state?.players.find(
          (p) => p.user_id === currentCall.player_id)?.username
          } called ${currentCall.hand}`)
      }

      // Clear last calls if not in playing phase
      if (data.game_state?.phase !== "playing") {
        setPlayerLastCalls({})
        setYourCards([])
        setCurrentRoundHands({}) // clear current round hands when not playing
      }
    })

    addMessageHandler(MessageType.PLAYER_UPDATE, (data: { your_cards?: Card[] }) => {
      if (data.your_cards !== undefined) {
        setYourCards(data.your_cards)
      }
    })

    addMessageHandler(MessageType.GAME_START, () => {
      addMessage("Game started!")
    })

    addMessageHandler(MessageType.GAME_RESTART, () => {
      addMessage("Game restarted!")
      setPlayerLastCalls({})
      setYourCards([])
    })

    addMessageHandler(MessageType.HOST_CHANGED, (data: { new_host: string, host_id: string }) => {
      const newHost = data.new_host || ""
      const hostId = data.host_id
      setIsHost(hostId === userId)
      addMessage(`New host: ${newHost}`)
      if (hostId === userId) {
        addMessage("You are now the host!")
      }
    })

    addMessageHandler(MessageType.USER_KICKED, (data: { message: string }) => {
      addMessage(data.message || "You were kicked from the game")
      disconnect()
    })

    addMessageHandler(MessageType.USER_LEAVE, (data: { username: string }) => {
      const username = data.username || ""
      addMessage(`${username} has left the game`)
    })

    addMessageHandler(MessageType.WAITING_FOR_GAME, (data: { message: string }) => {
      addMessage(data.message || "Please wait for the next game")
      setYourCards([])
    })

    addMessageHandler(MessageType.ROUND_START, (data: { round_number: number }) => {
      const roundNumber = data.round_number
      setPlayerLastCalls({})
      addMessage(`---`)
      addMessage(`Round ${roundNumber} has started`)
    })

    addMessageHandler(MessageType.ROUND_END, (data: { round_number: number, loser_id: string }) => {
      const roundNumber = data.round_number
      const loser = data.loser_id
      addMessage(`Round ${roundNumber} ended. Player ${loser} lost`)
      setYourCards([])
    })

    addMessageHandler(MessageType.SHOW_CARDS, () => {
      addMessage("Revealing cards to all players")
    })

    addMessageHandler(
      MessageType.CALL_BLUFF,
      (data: { message: string; loser_id: string; previous_round_cards?: { user_id: string; cards: Card[] }[] }) => {
        addMessage(data.message || "Bluff called")
        if (data.previous_round_cards && data.previous_round_cards.length > 0) {
          const handsMap = data.previous_round_cards.reduce<Record<string, Card[]>>((acc, curr) => {
            acc[curr.user_id] = curr.cards
            return acc
          }, {})
          setPreviousRoundHands(handsMap)
        } else {
          setPreviousRoundHands({})
        }
      }
    )

    addMessageHandler(MessageType.ERROR, (data: { message: string }) => {
      addMessage(`Error: ${data.message || "Unknown error"}`)
    })
  }, [addMessageHandler, userId, disconnect, addMessage])

  const handleUsernameSubmit = useCallback(
    async (usernameInput: string) => {
      setIsConnecting(true)
      setUsernameError("")

      if (!isConnected) {
        await connect()
      }
      sendMessage(MessageType.USER_JOIN, { username: usernameInput })
    },
    [isConnected, connect, sendMessage],
  )

  const handleStartGame = () => {
    sendMessage(MessageType.GAME_START, { user_id: userId })
  }

  const handleRestartGame = () => {
    sendMessage(MessageType.GAME_RESTART, { user_id: userId })
  }

  const handleKickUser = (targetUsername: string) => {
    sendMessage(MessageType.KICK_USER, {
      host_id: userId,
      target_username: targetUsername,
    })
  }

  const handleCallHand = (handSpec: string) => {
    sendMessage(MessageType.CALL_HAND, {
      user_id: userId,
      hand_spec: handSpec,
    })
  }

  const handleCallBluff = () => {
    sendMessage(MessageType.CALL_BLUFF, { user_id: userId })
  }

  const isYourTurn = gameState?.phase === "playing" && gameState?.current_player_id === userId
  const currentCall = gameState?.current_call?.hand

  return (
    <div className="min-h-screen bg-slate-900 text-green-400 p-6 font-mono">
      <UsernameDialog
        isOpen={showUsernameDialog}
        onSubmit={handleUsernameSubmit}
        error={usernameError}
        isConnecting={isConnecting}
      />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-2xl text-green-400 flex items-center justify-center gap-2">
          <Club className="h-6 w-6" />
          <Diamond className="h-6 w-6" />
          Online Card Game
          <Spade className="h-6 w-6" />
          <Heart className="h-6 w-6" />
        </div>

        {/* Connection Status */}
        {connectionError && (
          <Alert className="border-red-400/20 bg-red-900/20">
            <AlertDescription className="text-red-400">Connection Error: {connectionError}</AlertDescription>
          </Alert>
        )}

        <UserStatusCard
          username={username}
          isHost={isHost}
          isConnected={isConnected}
          gamePhase={gameState?.phase}
        />

        <YourCards cards={yourCards} />

        {/* Hand Input */}
        {gameState?.phase === "playing" && (
          <HandInput
            onCallHand={handleCallHand}
            onCallBluff={handleCallBluff}
            isYourTurn={isYourTurn}
            currentCall={currentCall}
          />
        )}

        <PlayersTable
          players={gameState?.players || []}
          currentRoundHands={currentRoundHands}
          previousRoundHands={previousRoundHands}
          playerLastCalls={playerLastCalls}
          gamePhase={gameState?.phase}
          currentPlayerId={gameState?.current_player_id}
          isHost={isHost}
          currentUserId={userId}
          onKick={handleKickUser}
        />

        <HostControls
          isHost={isHost}
          phase={gameState?.phase}
          onStart={handleStartGame}
          onRestart={handleRestartGame}
        />

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OnlineUsersCard onlineUsers={onlineUsers} />
          <GameStatusCard
            roundNumber={gameState?.round_number}
            waitingPlayers={gameState?.waiting_players_count}
          />
        </div>

        <RecentMessages messages={messages} />
      </div>
    </div>
  )
}
