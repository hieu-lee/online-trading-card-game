import Image from "next/image"
import {
  Card as CardUi,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Player, Card } from "@/types/game-types"

/* Helper functions duplicated for now; could be centralised */
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

interface PlayersTableProps {
  players: Player[]
  currentRoundHands: Record<string, Card[]>
  previousRoundHands: Record<string, Card[]>
  playerLastCalls: Record<string, string>
  gamePhase: string | undefined
  currentPlayerId: string | undefined
  isHost: boolean
  currentUserId: string
  onKick: (username: string) => void
}

export function PlayersTable({
  players,
  currentRoundHands,
  previousRoundHands,
  playerLastCalls,
  gamePhase,
  currentPlayerId,
  isHost,
  currentUserId,
  onKick,
}: PlayersTableProps) {
  if (!players?.length) return null

  return (
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
              <TableHead className="text-green-300">
                {Object.keys(currentRoundHands).length > 0 ? "Current Hand" : "Last Hand"}
              </TableHead>
              <TableHead className="text-green-300">Turn</TableHead>
              {isHost && <TableHead className="text-green-300">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
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
                <TableCell className="text-white text-sm">
                  {playerLastCalls[player.user_id] || "-"}
                </TableCell>
                <TableCell className="text-white p-0">
                  {Object.keys(currentRoundHands).length > 0 ? (
                    currentRoundHands[player.user_id] && (
                      <div className="flex space-x-1 items-center">
                        {currentRoundHands[player.user_id]?.map((card, idx) => {
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
                    )
                  ) : (
                    previousRoundHands[player.user_id] && (
                      <div className="flex space-x-1 items-center">
                        {previousRoundHands[player.user_id]?.map((card, idx) => {
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
                    )
                  )}
                </TableCell>
                <TableCell>
                  {gamePhase === "playing" && player.user_id === currentPlayerId && (
                    <Badge className="bg-yellow-600">Active</Badge>
                  )}
                </TableCell>
                {isHost && (
                  <TableCell>
                    {player.user_id !== currentUserId && (
                      <Button size="sm" variant="destructive" onClick={() => onKick(player.username)}>
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
  )
} 