import {
  Card as CardUi,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LeaderboardEntry } from "@/types/game-types"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Crown } from "lucide-react"


interface LeaderboardProps {
  entries: LeaderboardEntry[]
}

export function Leaderboard({
  entries
}: LeaderboardProps) {

  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="history">
            <AccordionTrigger className="text-yellow-400 text-lg flex items-center justify-center gap-2">
              👑 LEADERBOARD 👑
            </AccordionTrigger>
            <AccordionContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-green-400/20 hover:bg-slate-700/50 h-12">
                    <TableHead className="text-green-300">Username</TableHead>
                    <TableHead className="text-green-300">Wins</TableHead>
                    <TableHead className="text-green-300">Played</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.username} className="border-green-400/20 hover:bg-slate-700/50 h-12">
                      <TableCell className="text-white">{entry.username}</TableCell>
                      <TableCell className="text-white">{entry.wins}</TableCell>
                      <TableCell className="text-white">{entry.games_played}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </CardUi >
  )
} 
