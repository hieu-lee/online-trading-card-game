import { Button } from "@/components/ui/button"
import { Card as CardUi, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Crown } from "lucide-react"

interface Props {
  isHost: boolean
  phase: string | undefined
  onStart: () => void
  onRestart: () => void
}

export function HostControls({ isHost, phase, onStart, onRestart }: Props) {
  if (!isHost) return null
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardHeader>
        <CardTitle className="text-yellow-400 text-lg flex items-center gap-2">
          <Crown className="h-5 w-5" /> Host Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {phase === "waiting" && (
            <Button onClick={onStart} className="bg-green-600 hover:bg-green-700">
              Start Game
            </Button>
          )}
          <Button
            onClick={onRestart}
            variant="outline"
            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10"
          >
            Restart Game
          </Button>
        </div>
      </CardContent>
    </CardUi>
  )
} 