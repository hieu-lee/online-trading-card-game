import { Card as CardUi, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"

interface Props {
  onlineUsers: string[]
}

export function OnlineUsersCard({ onlineUsers }: Props) {
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-green-400" />
          <span className="text-green-300">Online users ({onlineUsers.length}):</span>
        </div>
        <div className="text-white mt-2">{onlineUsers.join(", ") || "None"}</div>
      </CardContent>
    </CardUi>
  )
} 