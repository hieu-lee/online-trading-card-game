import { Badge } from "@/components/ui/badge"
import { Card as CardUi, CardContent } from "@/components/ui/card"
import { Crown, Wifi, WifiOff } from "lucide-react"

interface Props {
  username: string
  isHost: boolean
  isConnected: boolean
  gamePhase: string | undefined
}

export function UserStatusCard({ username, isHost, isConnected, gamePhase }: Props) {
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-300">Username:</span>
            <span className="text-white">{username}</span>
            {isHost && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                <Crown className="h-3 w-3 mr-1" />HOST
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300">Connected:</span>
            {isConnected ? (
              <Badge className="bg-green-600">
                <Wifi className="h-3 w-3 mr-1" />Yes
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />No
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300">Game Phase:</span>
            <Badge variant="outline" className="text-blue-400 border-blue-400/50">
              {gamePhase?.replace("_", " ").toUpperCase() || "WAITING"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </CardUi>
  )
} 