import { Card as CardUi, CardContent } from "@/components/ui/card"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { CardsDisplay } from "@/components/CardDisplay"
import type { Card } from "@/types/game-types"

interface Props {
  cards: Card[]
}

export function YourCards({ cards }: Props) {
  if (!cards.length) return null
  return (
    <CardUi className="bg-slate-800 border-green-400/20">
      <CardContent>
        <Accordion type="single" collapsible defaultValue="your-cards">
          <AccordionItem value="your-cards">
            <AccordionTrigger className="text-green-400 text-lg">Your Cards</AccordionTrigger>
            <AccordionContent>
              <CardsDisplay cards={cards} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </CardUi>
  )
} 