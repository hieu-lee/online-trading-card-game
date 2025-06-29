import { Card as CardUi, CardContent } from "@/components/ui/card"

interface Props {
  roundNumber?: number
  waitingPlayers?: number
}

export function GameStatusCard({ roundNumber, waitingPlayers }: Props) {
  if (roundNumber === undefined && waitingPlayers === undefined) return null
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent>
        <div className="space-y-2 text-sm">
          {roundNumber !== undefined && (
            <div>
              <span className="text-green-300">Round:</span>
              <span className="text-white ml-2">{roundNumber}</span>
            </div>
          )}
          {waitingPlayers !== undefined && (
            <div>
              <span className="text-green-300">Waiting players:</span>
              <span className="text-white ml-2">{waitingPlayers}</span>
            </div>
          )}
        </div>
      </CardContent>
    </CardUi>
  )
} 