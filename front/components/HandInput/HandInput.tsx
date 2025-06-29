"use client"

import React, { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import SuggestionsList from "./SuggestionsList"
import { useSlashCommand } from "@/hooks/useSlashCommand"
import { SLASH_COMMANDS } from "./constants"

interface HandInputProps {
  onCallHand: (handSpec: string) => void
  onCallBluff: () => void
  isYourTurn: boolean
  currentCall?: string
}

export function HandInput({
  onCallHand,
  onCallBluff,
  isYourTurn,
  currentCall,
}: HandInputProps) {
  // `null!` tells TypeScript we will set the ref later in runtime
  const inputRef = useRef<HTMLInputElement>(null!)

  // Slash-command / auto-complete state & helpers
  const {
    handSpec,
    setHandSpec,
    showSuggestions,
    suggestions,
    selectedSuggestion,
    currentCommand,
    parameterIndex,
    handleInputChange,
    handleKeyDown,
    applySuggestion,
    translateShorthandToSpec,
  } = useSlashCommand(inputRef)

  /* ────────────────────────────────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = handSpec.trim()
    if (!trimmed || trimmed.startsWith("/")) return
    const spec = translateShorthandToSpec(trimmed) ?? trimmed
    onCallHand(spec)
    setHandSpec("")
  }

  const handleBluff = () => onCallBluff()

  /* ────────────────────────────────────────────────────────────────── */
  if (!isYourTurn) {
    return (
      <Card className="bg-slate-800 border-green-400/20">
        <CardContent>
          <div className="text-center text-gray-400">
            {currentCall ? `Current call: ${currentCall}` : "Waiting for your turn..."}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-green-400/20">
      <CardContent>
        <div className="space-y-4">
          <div className="text-green-400 font-semibold">Your Turn!</div>
          {currentCall && <div className="text-sm text-gray-300">Current call: {currentCall}</div>}

          {/* Input with suggestions */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={handSpec}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !showSuggestions && !handSpec.startsWith("/")) {
                      handleSubmit(e as any)
                    }
                  }}
                  placeholder="Type / for commands or enter hand manually..."
                  className="bg-slate-700 border-green-400/20 text-white placeholder:text-gray-500"
                  autoComplete="off"
                />

                <SuggestionsList
                  suggestions={suggestions}
                  visible={showSuggestions}
                  selectedIndex={selectedSuggestion}
                  onSelect={applySuggestion}
                />
              </div>

              <Button
                onClick={(e) => handleSubmit(e as any)}
                disabled={!handSpec.trim() || handSpec.startsWith("/")}
                className="bg-blue-500 hover:bg-blue-700"
              >
                Call
              </Button>
            </div>

            {currentCommand && (
              <div className="mt-2 p-2 bg-slate-700 rounded text-sm">
                <div className="text-green-400 font-medium">{currentCommand.description}</div>
                <div className="text-gray-300">
                  Parameters:{" "}
                  {currentCommand.parameters.map((param, index) => (
                    <span
                      key={param}
                      className={
                        index === parameterIndex ? "text-yellow-400 font-bold" : "text-gray-400"
                      }
                    >
                      {param}
                      {index < currentCommand.parameters.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
                <div className="text-gray-400 text-xs mt-1">Preview: {currentCommand.template}</div>
              </div>
            )}
          </div>

          {currentCall && (
            <Button onClick={handleBluff} variant="destructive" className="w-full">
              Call Bluff
            </Button>
          )}

          {/* Help accordion remains inline (could be extracted too) */}
          <Accordion type="single" collapsible className="text-sm text-gray-400">
            <AccordionItem value="commands">
              <AccordionTrigger>Slash Commands</AccordionTrigger>
              <AccordionContent>
                {SLASH_COMMANDS.map((cmd) => (
                  <div key={cmd.command} className="flex items-center justify-between">
                    <span className="text-blue-400 font-mono">{cmd.command}</span>
                    <span className="text-gray-300">{cmd.description}</span>
                  </div>
                ))}
                <div className="mt-2 text-xs text-gray-500">
                  Type / to see available commands, use Tab or Enter to select
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shortcuts">
              <AccordionTrigger>Shortcuts</AccordionTrigger>
              <AccordionContent>
                <div><b>------</b></div>
                <ul className="space-y-1"> 
                  <li><strong>[rank]</strong> - for high card hands</li>
                  <li><strong>2 [rank]</strong> - for pairs (e.g., "2 kings", "2 j", "2 3")</li>
                  <li><strong>3 [rank]</strong> - for three of a kind (e.g., "3 j", "3 10")</li>
                  <li><strong>straight [rank]</strong> - for straights starting [rank] (e.g., "straight 10")</li>
                  <li><strong>2 [rank1] 2 [rank2]</strong> - for two pairs (e.g., "2 3 2 4", "2 k 2 a")</li>
                  <li><strong>2 [rank1] 3 [rank2]</strong> or <strong>3 [rank1] 2 [rank2]</strong> - for full house (e.g., "2 k 3 aces", "3 j 2 10")</li>
                  <li><strong>4 [rank]</strong> - for four of a kind (e.g., "4 aces", "4 k", "4 7")</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hands">
              <AccordionTrigger>Manual Hand Entry</AccordionTrigger>
              <AccordionContent>
                <div><b>------</b></div>
                <div><b>High Card</b> &lt;rank&gt;</div>
                <div><b>Pair of</b> &lt;rank&gt;</div>
                <div><b>Two Pairs</b> &lt;rank1&gt; and &lt;rank2&gt;</div>
                <div><b>Three of a Kind </b>&lt;rank&gt;</div>
                <div><b>Straight from</b> &lt;rank&gt;</div>
                <div><b>Flush of</b> &lt;suit&gt;: &lt;rank1&gt;,&lt;rank2&gt;,&lt;rank3&gt;,&lt;rank4&gt;,&lt;rank5&gt;</div>
                <div><b>Full House: 3</b> &lt;rank1&gt; and 2 &lt;rank2&gt;</div>
                <div><b>Four of a Kind </b>&lt;rank&gt;</div>
                <div><b>Straight Flush</b> &lt;suit&gt; from &lt;rank&gt;</div>
                <div><b>Royal Flush</b> &lt;suit&gt;</div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  )
} 