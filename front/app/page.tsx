"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card as CardUi, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, Users, Terminal, Wifi, WifiOff } from "lucide-react"

import { useWebSocket } from "@/hooks/use-websocket"
import { UsernameDialog } from "@/components/username-dialog"
import { CardsDisplay } from "@/components/card-display"
import { HandInput } from "@/components/hand-input"
import type { GameState, Player, Card, MessageType } from "@/types/game-types"

const WS_URL = process.env.CARDGAME_SERVER || "wss://online-trading-card-game-production.up.railway.app"
console.log(WS_URL)

export default function Component() {
  // Connection state
  const [showUsernameDialog, setShowUsernameDialog] = useState(true)
  const [usernameError, setUsernameError] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)

  // Game state
  const [userId, setUserId] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [isHost, setIsHost] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [yourCards, setYourCards] = useState<Card[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [messages, setMessages] = useState<string[]>([])
  const [playerLastCalls, setPlayerLastCalls] = useState<Record<string, string>>({})

  const { isConnected, connectionError, connect, disconnect, sendMessage, addMessageHandler } = useWebSocket(WS_URL)

  const addMessage = useCallback((message: string) => {
    setMessages((prev) => [...prev.slice(-9), message])
  }, [])

  // Message handlers
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addMessageHandler("user_join", (data: any) => {
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

    addMessageHandler("username_error", (data: { message: string }) => {
      setUsernameError(data.message || "Username error")
      setIsConnecting(false)
    })

    addMessageHandler("game_state_update", (data: {
      game_state: GameState,
      online_users: string[]
    }) => {
      setGameState(data.game_state)
      setOnlineUsers(data.online_users || [])

      // Update player last calls
      const currentCall = data.game_state?.current_call
      if (currentCall?.player_id && currentCall?.hand) {
        setPlayerLastCalls((prev) => ({
          ...prev,
          [currentCall.player_id]: currentCall.hand,
        }))
      }

      // Clear last calls if not in playing phase
      if (data.game_state?.phase !== "playing") {
        setPlayerLastCalls({})
        setYourCards([])
      }
    })

    addMessageHandler("player_update", (data: { your_cards: Card[] }) => {
      setYourCards(data.your_cards || [])
    })

    addMessageHandler("game_start", () => {
      addMessage("Game started!")
    })

    addMessageHandler("game_restart", () => {
      addMessage("Game restarted!")
      setPlayerLastCalls({})
      setYourCards([])
    })

    addMessageHandler("host_changed", (data: { new_host: string, host_id: string }) => {
      const newHost = data.new_host || ""
      const hostId = data.host_id
      setIsHost(hostId === userId)
      addMessage(`New host: ${newHost}`)
      if (hostId === userId) {
        addMessage("You are now the host!")
      }
    })

    addMessageHandler("user_kicked", (data: { message: string }) => {
      addMessage(data.message || "You were kicked from the game")
      disconnect()
    })

    addMessageHandler("user_leave", (data: { username: string }) => {
      const username = data.username || ""
      addMessage(`${username} has left the game`)
    })

    addMessageHandler("waiting_for_game", (data: { message: string }) => {
      addMessage(data.message || "Please wait for the next game")
      setYourCards([])
    })

    addMessageHandler("round_start", (data: { round_number: number }) => {
      const roundNumber = data.round_number
      setPlayerLastCalls({})
      addMessage(`Round ${roundNumber} has started`)
    })

    addMessageHandler("round_end", (data: { round_number: number, loser_id: string }) => {
      const roundNumber = data.round_number
      const loser = data.loser_id
      addMessage(`Round ${roundNumber} ended. Player ${loser} lost`)
    })

    addMessageHandler("show_cards", () => {
      addMessage("Revealing cards to all players")
    })

    addMessageHandler("call_bluff", (data: { message: string }) => {
      addMessage(data.message || "Bluff called")
    })

    addMessageHandler("error", (data: { message: string }) => {
      addMessage(`Error: ${data.message || "Unknown error"}`)
    })
  }, [addMessageHandler, userId, disconnect, addMessage])

  const handleUsernameSubmit = useCallback(
    (usernameInput: string) => {
      setIsConnecting(true)
      setUsernameError("")

      if (!isConnected) {
        connect()
      }

      // Wait a moment for connection, then send join message
      setTimeout(() => {
        sendMessage("user_join" as MessageType, { username: usernameInput })
      }, 100)
    },
    [isConnected, connect, sendMessage],
  )

  const handleStartGame = () => {
    sendMessage("game_start" as MessageType, { user_id: userId })
  }

  const handleRestartGame = () => {
    sendMessage("game_restart" as MessageType, { user_id: userId })
  }

  const handleKickUser = (targetUsername: string) => {
    sendMessage("kick_user" as MessageType, {
      host_id: userId,
      target_username: targetUsername,
    })
  }

  const handleCallHand = (handSpec: string) => {
    sendMessage("call_hand" as MessageType, {
      user_id: userId,
      hand_spec: handSpec,
    })
  }

  const handleCallBluff = () => {
    sendMessage("call_bluff" as MessageType, { user_id: userId })
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
          <Terminal className="h-6 w-6" />
          Online Card Game
        </div>

        {/* Connection Status */}
        {connectionError && (
          <Alert className="border-red-400/20 bg-red-900/20">
            <AlertDescription className="text-red-400">Connection Error: {connectionError}</AlertDescription>
          </Alert>
        )}

        {/* User Status */}
        <CardUi className="bg-slate-800 border-green-400/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-300">Username:</span>
                <span className="text-white">{username}</span>
                {isHost && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                    <Crown className="h-3 w-3 mr-1" />
                    HOST
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-300">Connected:</span>
                {isConnected ? (
                  <Badge className="bg-green-600">
                    <Wifi className="h-3 w-3 mr-1" />
                    Yes
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <WifiOff className="h-3 w-3 mr-1" />
                    No
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-300">Game Phase:</span>
                <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                  {gameState?.phase?.replace("_", " ").toUpperCase() || "WAITING"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </CardUi>

        {/* Your Cards */}
        {yourCards.length > 0 && (
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardContent className="pt-6">
              <CardsDisplay cards={yourCards} title="Your Cards" />
            </CardContent>
          </CardUi>
        )}

        {/* Hand Input */}
        {gameState?.phase === "playing" && (
          <HandInput
            onCallHand={handleCallHand}
            onCallBluff={handleCallBluff}
            isYourTurn={isYourTurn}
            currentCall={currentCall}
          />
        )}

        {/* Players Table */}
        {gameState?.players && gameState.players.length > 0 && (
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardHeader>
              <CardTitle className="text-green-400 text-lg">Players</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-green-400/20 hover:bg-slate-700/50">
                    <TableHead className="text-green-300">Username</TableHead>
                    <TableHead className="text-green-300">Cards</TableHead>
                    <TableHead className="text-green-300">Losses</TableHead>
                    <TableHead className="text-green-300">Status</TableHead>
                    <TableHead className="text-green-300">Last Call</TableHead>
                    <TableHead className="text-green-300">Turn</TableHead>
                    {isHost && <TableHead className="text-green-300">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameState.players.map((player: Player) => (
                    <TableRow key={player.user_id} className="border-green-400/20 hover:bg-slate-700/50">
                      <TableCell className="text-white">{player.username}</TableCell>
                      <TableCell className="text-white">{player.card_count}</TableCell>
                      <TableCell className="text-white">{player.losses}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            player.is_eliminated
                              ? "text-red-400 border-red-400/50"
                              : "text-green-400 border-green-400/50"
                          }
                        >
                          {player.is_eliminated ? "Eliminated" : "Active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white text-sm">{playerLastCalls[player.user_id] || "-"}</TableCell>
                      <TableCell>
                        {gameState?.phase === "playing" && player.user_id === gameState.current_player_id && (
                          <Badge className="bg-yellow-600">Active</Badge>
                        )}
                      </TableCell>
                      {isHost && (
                        <TableCell>
                          {player.user_id !== userId && (
                            <Button size="sm" variant="destructive" onClick={() => handleKickUser(player.username)}>
                              Kick
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </CardUi>
        )}

        {/* Host Controls */}
        {isHost && (
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardHeader>
              <CardTitle className="text-yellow-400 text-lg flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Host Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {gameState?.phase === "waiting" && (
                  <Button onClick={handleStartGame} className="bg-green-600 hover:bg-green-700">
                    Start Game
                  </Button>
                )}
                <Button
                  onClick={handleRestartGame}
                  variant="outline"
                  className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
                >
                  Restart Game
                </Button>
              </div>
            </CardContent>
          </CardUi>
        )}

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Online Users */}
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-green-300">Online users ({onlineUsers.length}):</span>
              </div>
              <div className="text-white mt-2">{onlineUsers.join(", ") || "None"}</div>
            </CardContent>
          </CardUi>

          {/* Game Status */}
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                {gameState?.round_number && gameState.round_number > 0 && (
                  <div>
                    <span className="text-green-300">Round:</span>
                    <span className="text-white ml-2">{gameState.round_number}</span>
                  </div>
                )}
                {gameState?.waiting_players_count && gameState.waiting_players_count > 0 && (
                  <div>
                    <span className="text-green-300">Waiting players:</span>
                    <span className="text-white ml-2">{gameState.waiting_players_count}</span>
                  </div>
                )}
                {currentCall && (
                  <div>
                    <span className="text-green-300">Current call:</span>
                    <span className="text-white ml-2">{currentCall}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </CardUi>
        </div>

        {/* Messages */}
        {messages.length > 0 && (
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardHeader>
              <CardTitle className="text-green-400 text-lg">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
                {messages.map((message, index) => (
                  <div key={index} className="text-gray-300">
                    {message}
                  </div>
                ))}
              </div>
            </CardContent>
          </CardUi>
        )}
      </div>
    </div>
  )
}
