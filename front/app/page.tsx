'use client'
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Crown, Users, Terminal } from "lucide-react"

export default function Page() {

  const [command, setCommand] = useState("")
  const [username] = useState("nieu")
  const [isHost] = useState(true)
  const [isConnected] = useState(true)
  const [gamePhase] = useState("Waiting")

  const players = [
    {
      username: "nieu",
      cards: 0,
      losses: 0,
      status: "Active",
      lastCall: "",
      turn: false,
    },
    {
      username: "tung",
      cards: 0,
      losses: 0,
      status: "Active",
      lastCall: "",
      turn: false,
    },
  ]

  const availableCommands = [
    { command: "start", description: "Start the game" },
    { command: "restart", description: "Restart the game" },
    { command: "kick <username>", description: "Kick a player" },
    { command: "quit", description: "Quit the game" },
    { command: "help", description: "Show game instructions" },
  ]

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle command logic here
    console.log("Command entered:", command)
    setCommand("")
  }

  return (
    <div className="min-h-screen bg-slate-900 text-green-400 p-6 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-slate-800 border-green-400/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-400 flex items-center justify-center gap-2">
              <Terminal className="h-6 w-6" />
              Online Card Game
            </CardTitle>
            <div className="border-t border-green-400/20 mt-2"></div>
          </CardHeader>
        </Card>

        {/* User Status */}
        <Card className="bg-slate-800 border-green-400/20">
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
                <Badge variant={isConnected ? "default" : "destructive"} className="bg-green-600">
                  {isConnected ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-300">Game Phase:</span>
                <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                  {gamePhase}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Table */}
        <Card className="bg-slate-800 border-green-400/20">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={index} className="border-green-400/20 hover:bg-slate-700/50">
                    <TableCell className="text-white">{player.username}</TableCell>
                    <TableCell className="text-white">{player.cards}</TableCell>
                    <TableCell className="text-white">{player.losses}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-400 border-green-400/50">
                        {player.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{player.lastCall || "-"}</TableCell>
                    <TableCell>
                      {player.turn && (
                        <Badge variant="default" className="bg-yellow-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Online Users */}
        <Card className="bg-slate-800 border-green-400/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-green-400" />
              <span className="text-green-300">Online users ({players.length}):</span>
              <span className="text-white">{players.map(
                (p) => p.username
              ).join(", ")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Available Commands */}
        <Card className="bg-slate-800 border-green-400/20">
          <CardHeader>
            <CardTitle className="text-green-400 text-lg">Available Commands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {availableCommands.map((cmd, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-yellow-400 font-semibold min-w-fit">{cmd.command}</span>
                  <span className="text-gray-400">-</span>
                  <span className="text-white">{cmd.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Command Input */}
        <Card className="bg-slate-800 border-green-400/20">
          <CardContent className="pt-6">
            <form onSubmit={handleCommandSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-400">Enter command:</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter command: []"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="bg-slate-700 border-green-400/20 text-white placeholder:text-gray-500 font-mono"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="border-green-400/50 text-green-400 hover:bg-green-400/10"
                >
                  Execute
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
