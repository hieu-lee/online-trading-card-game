"use client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Player } from "@/types/game-types"
import { useState } from "react"

interface SpectatorControlDialogProps {
  players: Player[]
}

export function SpectatorControlDialog({ players }: SpectatorControlDialogProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())

  const handlePlayerToggle = (userId: string) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedPlayers(newSelected)
  }

  const handleGrantAll = () => {
    const allPlayerIds = players.map(player => player.user_id)
    setSelectedPlayers(new Set(allPlayerIds))
  }

  const handleRemoveAll = () => {
    setSelectedPlayers(new Set())
  }

  const handleGrant = () => {
    // TODO: Implement grant spectator permissions logic
    console.log("Granting spectator permissions to:", Array.from(selectedPlayers))
  }

  const handleRemove = () => {
    // TODO: Implement remove spectator permissions logic
    console.log("Removing spectator permissions from:", Array.from(selectedPlayers))
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border-yellow-500/50 text-yellow-400 hover:from-yellow-800/50 hover:to-amber-800/30 hover:border-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/20 font-semibold"
        >
          👁️ Spectator Control
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-green-400 p-0 font-mono border border-slate-700 shadow-2xl">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent flex items-center gap-2">
              <span className="text-yellow-400">👁️</span>
              Spectator Control
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-sm mt-2">
              Select players who can spectate the game.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="px-6 pb-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/50 backdrop-blur-sm">
            <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
              {players.length > 0 ? (
                players.map((player) => (
                  <div 
                    key={player.user_id} 
                    className={`group relative flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                      selectedPlayers.has(player.user_id)
                        ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/20 border-green-500/50 shadow-green-500/10'
                        : 'bg-slate-800/60 border-slate-600/50 hover:border-slate-500 hover:bg-slate-700/60'
                    }`}
                  >
                    <Checkbox
                      id={`player-${player.user_id}`}
                      checked={selectedPlayers.has(player.user_id)}
                      onCheckedChange={() => handlePlayerToggle(player.user_id)}
                      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                    />
                    <Label 
                      htmlFor={`player-${player.user_id}`} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-semibold group-hover:text-green-300 transition-colors">
                            {player.username}
                          </span>
                          {player.is_eliminated && (
                            <span className="px-2 py-1 text-xs bg-red-900/50 text-red-400 rounded-full border border-red-700/50">
                              Eliminated
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded-full">
                            <span className="text-xs text-slate-400">🃏</span>
                            <span className="text-xs text-slate-300 font-medium">{player.card_count}</span>
                          </div>
                        </div>
                      </div>
                    </Label>
                    {selectedPlayers.has(player.user_id) && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8 flex flex-col items-center gap-3">
                  <span className="text-3xl opacity-50">👥</span>
                  <span>No players available</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/30 border-t border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Selected:</span>
              <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded-full font-medium">
                {selectedPlayers.size}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Total:</span>
              <span className="px-2 py-1 bg-slate-700/50 text-slate-300 rounded-full font-medium">
                {players.length}
              </span>
            </div>
          </div>
          
          <DialogFooter className="gap-3 flex-wrap">
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={selectedPlayers.size === 0}
                className="flex-1 bg-gradient-to-r from-red-900/20 to-red-800/10 border-red-500/50 text-red-400 hover:from-red-800/40 hover:to-red-700/30 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-red-500/20"
              >
                🚫 Remove
              </Button>
              <Button
                variant="outline"
                onClick={handleGrant}
                disabled={selectedPlayers.size === 0}
                className="flex-1 bg-gradient-to-r from-green-900/20 to-emerald-800/10 border-green-500/50 text-green-400 hover:from-green-800/40 hover:to-emerald-700/30 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-green-500/20"
              >
                ✅ Grant
              </Button>
            </div>
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={handleRemoveAll}
                className="flex-1 bg-gradient-to-r from-slate-800/50 to-slate-700/30 border-slate-500/50 text-slate-400 hover:from-slate-700/60 hover:to-slate-600/40 hover:border-slate-400 transition-all duration-200 shadow-lg"
              >
                🗑️ Clear All
              </Button>
              <Button
                variant="outline"
                onClick={handleGrantAll}
                className="flex-1 bg-gradient-to-r from-yellow-900/20 to-amber-800/10 border-yellow-500/50 text-yellow-400 hover:from-yellow-800/40 hover:to-amber-700/30 hover:border-yellow-400 transition-all duration-200 shadow-lg hover:shadow-yellow-500/20"
              >
                ⭐ Grant All
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
