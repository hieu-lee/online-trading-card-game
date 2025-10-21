import { Card as CardUi, CardContent } from "@/components/ui/card"
import { Cpu, Users } from "lucide-react"

interface Props {
  onlineUsers: string[]
  bots: string[]
}

export function OnlineUsersCard({ onlineUsers, bots }: Props) {
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-green-400" />
            <span className="text-green-300">Online users ({onlineUsers.length}):</span>
          </div>
          <div className="text-white mt-1 text-sm">
            {onlineUsers.length > 0 ? onlineUsers.join(", ") : "None"}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 text-purple-400" />
            <span className="text-purple-300">AI bots ({bots.length}):</span>
          </div>
          <div className="text-white mt-1 text-sm">
            {bots.length > 0 ? bots.join(", ") : "No bots active"}
          </div>
        </div>
      </CardContent>
    </CardUi>
  )
}
