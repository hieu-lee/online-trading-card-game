import { Card as CardUi, CardContent } from "@/components/ui/card"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

interface Props {
  messages: string[]
}

export function RecentMessages({ messages }: Props) {
  if (messages.length === 0) return null
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="history">
            <AccordionTrigger className="text-green-400 text-lg">Recent Messages</AccordionTrigger>
            <AccordionContent>
              <div className="text-sm max-h-64 overflow-y-auto">
                {messages.map((msg, idx) => (
                  <div key={idx} className="text-gray-300">
                    {msg}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </CardUi>
  )
} 