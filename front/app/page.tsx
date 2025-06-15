"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card as CardUi, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Crown, Users, Wifi, WifiOff, Club, Diamond, Spade, Heart } from "lucide-react"
import Image from "next/image"

import { useWebSocket } from "@/hooks/use-websocket"
import { UsernameDialog } from "@/components/username-dialog"
import { CardsDisplay } from "@/components/card-display"
import { HandInput } from "@/components/hand-input"
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/components/ui/accordion"
import type { GameState, Player, Card, MessageType } from "@/types/game-types"
import { SpectatorControlDialog } from "@/components/spectator-control-dialog"

// local
const WS_URL = "ws://localhost:8765"
// staging
// const WS_URL = "wss://online-trading-card-game-production.up.railway.app"
// prod
// const WS_URL = "wss://online-trading-card-game.onrender.com"

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
  // Previous round hands state for displaying last hand
  const [previousRoundHands, setPreviousRoundHands] = useState<Record<string, Card[]>>({})

  const { isConnected, connectionError, connect, disconnect, sendMessage, addMessageHandler } = useWebSocket(WS_URL)

  const addMessage = useCallback((message: string) => {
    setMessages((prev) => [...prev.slice(-20), message])
  }, [])

  // Helpers to map suit and rank to filename parts
  const getSuitName = (suit: string) => {
    const map: Record<string, string> = {
      "♥": "hearts",
      "♦": "diamonds",
      "♣": "clubs",
      "♠": "spades",
      hearts: "hearts",
      diamonds: "diamonds",
      clubs: "clubs",
      spades: "spades",
    }
    return map[suit] || suit.toLowerCase()
  }
  const getRankName = (rank: number) => {
    const faceRanks: Record<number, string> = { 11: "jack", 12: "queen", 13: "king", 14: "ace" }
    return faceRanks[rank] || rank.toString()
  }

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
        addMessage(`${data.game_state?.players.find(
          (p) => p.user_id === currentCall.player_id)?.username
          } called ${currentCall.hand}`)
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
      addMessage(`---`)
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

    addMessageHandler(
      "call_bluff",
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

    addMessageHandler("error", (data: { message: string }) => {
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
      sendMessage("user_join" as MessageType, { username: usernameInput })
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

        {/* User Status */}
        <CardUi className="bg-slate-800 border-green-400/20">
          <CardContent>
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
            <CardContent>
              <Accordion type="single" collapsible defaultValue="your-cards">
                <AccordionItem value="your-cards">
                  <AccordionTrigger className="text-green-400 text-lg">
                    Your Cards
                  </AccordionTrigger>
                  <AccordionContent>
                    <CardsDisplay cards={yourCards} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
                  <TableRow className="border-green-400/20 hover:bg-slate-700/50 h-12">
                    <TableHead className="text-green-300">Username</TableHead>
                    <TableHead className="text-green-300">Cards</TableHead>
                    <TableHead className="text-green-300">Status</TableHead>
                    <TableHead className="text-green-300">Last Call</TableHead>
                    <TableHead className="text-green-300">Last Hand</TableHead>
                    <TableHead className="text-green-300">Turn</TableHead>
                    {isHost && <TableHead className="text-green-300">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameState.players.map((player: Player) => (
                    <TableRow key={player.user_id} className="border-green-400/20 hover:bg-slate-700/50 h-12">
                      <TableCell className="text-white">{player.username}</TableCell>
                      <TableCell className="text-white">{player.card_count}</TableCell>
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
                      <TableCell className="text-white p-0">
                        {previousRoundHands[player.user_id] && (
                          <div className="flex space-x-1 items-center">
                            {previousRoundHands[player.user_id].map((card, idx) => {
                              const suitName = getSuitName(card.suit)
                              const rankName = getRankName(card.rank)
                              const fileName = `${suitName}_${rankName}.svg`
                              return (
                                <Image
                                  key={idx}
                                  src={`cards/${fileName}`}
                                  alt={`${rankName} of ${suitName}`}
                                  width={30}
                                  height={42}
                                />
                              )
                            })}
                          </div>
                        )}
                      </TableCell>
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
                  className="border-yellow-400 text-yellow-400 bg-slate-700 hover:bg-yellow-400"
                >
                  Restart Game
                </Button>
                <SpectatorControlDialog
                  players={gameState?.players || []}
                />
              </div>
            </CardContent>
          </CardUi>
        )}

        {/* Game Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Online Users */}
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-green-300">Online users ({onlineUsers.length}):</span>
              </div>
              <div className="text-white mt-2">{onlineUsers.join(", ") || "None"}</div>
            </CardContent>
          </CardUi>

          {/* Game Status */}
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardContent>
              <div className="space-y-2 text-sm">
                {gameState?.round_number !== undefined && (
                  <div>
                    <span className="text-green-300">Round:</span>
                    <span className="text-white ml-2">{gameState.round_number}</span>
                  </div>
                )}
                {gameState?.waiting_players_count !== undefined && (
                  <div>
                    <span className="text-green-300">Waiting players:</span>
                    <span className="text-white ml-2">{gameState.waiting_players_count}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </CardUi>
        </div>

        {/* Messages */}
        {messages.length > 0 && (
          <CardUi className="bg-slate-800 border-green-400/20">
            <CardContent>
              <Accordion type="single" collapsible>
                <AccordionItem value="history">
                  <AccordionTrigger className="text-green-400 text-lg">
                    Recent Messages
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm max-h-64 overflow-y-auto">
                      {messages.map((message, index) => (
                        <div key={index} className="text-gray-300">
                          {message}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </CardUi>
        )}
      </div>
    </div>
  )
}
