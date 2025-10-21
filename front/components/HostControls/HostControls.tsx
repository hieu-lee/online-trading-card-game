import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card as CardUi, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Crown, PlusCircle, Trash2 } from "lucide-react"

interface BotInfo {
  user_id: string
  username: string
}

interface Props {
  isHost: boolean
  phase: string | undefined
  onStart: () => void
  onRestart: () => void
  onAddBot: (botName?: string) => void
  onRemoveBot: (botId: string) => void
  bots: BotInfo[]
}

export function HostControls({
  isHost,
  phase,
  onStart,
  onRestart,
  onAddBot,
  onRemoveBot,
  bots,
}: Props) {
  const [botName, setBotName] = useState("")
  const [selectedBotId, setSelectedBotId] = useState<string>("")

  useEffect(() => {
    if (bots.length === 0) {
      setSelectedBotId("")
      return
    }
    if (!bots.find((bot) => bot.user_id === selectedBotId)) {
      setSelectedBotId(bots[0]?.user_id ?? "")
    }
  }, [bots, selectedBotId])

  const botOptions = useMemo(
    () => bots.map((bot) => ({ value: bot.user_id, label: bot.username })),
    [bots],
  )

  if (!isHost) return null

  const handleAddBot = () => {
    const name = botName.trim()
    onAddBot(name.length ? name : undefined)
    setBotName("")
  }

  const handleRemoveBot = () => {
    if (!selectedBotId) return
    onRemoveBot(selectedBotId)
  }

  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardHeader>
        <CardTitle className="text-yellow-400 text-lg flex items-center gap-2">
          <Crown className="h-5 w-5" /> Host Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {phase === "waiting" && (
            <Button onClick={onStart} className="bg-green-600 hover:bg-green-700">
              Start Game
            </Button>
          )}
          <Button
            onClick={onRestart}
            variant="outline"
            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 bg-slate-900"
          >
            Restart Game
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-green-300">Add AI Bot</div>
            <div className="flex gap-2">
              <Input
                value={botName}
                onChange={(event) => setBotName(event.target.value)}
                placeholder="Optional bot name"
                className="bg-slate-900 border-green-400/30 text-green-200 placeholder:text-green-700"
              />
              <Button
                onClick={handleAddBot}
                className="bg-green-700 hover:bg-green-600 flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm text-green-300">Remove AI Bot</div>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-green-400/30 bg-slate-900 px-3 py-2 text-green-200"
                value={selectedBotId}
                onChange={(event) => setSelectedBotId(event.target.value)}
              >
                {botOptions.length === 0 && <option value="">No bots</option>}
                {botOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleRemoveBot}
                variant="destructive"
                disabled={!selectedBotId}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </CardUi>
  )
}
