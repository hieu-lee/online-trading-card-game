"use client"
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { translateShorthandToSpec, KEYWORDS_COMPLETIONS } from "@/lib/handSpec"

interface HandInputProps {
  onCallHand: (handSpec: string) => void
  onCallBluff: () => void
  isYourTurn: boolean
  currentCall?: string
}

interface SlashCommand {
  command: string
  description: string
  parameters: string[]
  template: string
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/high",
    description: "High Card",
    parameters: ["rank"],
    template: "High Card {rank}"
  },
  {
    command: "/pair",
    description: "Pair of cards",
    parameters: ["rank"],
    template: "Pair of {rank}"
  },
  {
    command: "/twopair",
    description: "Two Pairs",
    parameters: ["rank1", "rank2"],
    template: "Two Pairs {rank1} and {rank2}"
  },
  {
    command: "/three",
    description: "Three of a Kind",
    parameters: ["rank"],
    template: "Three of a Kind {rank}"
  },
  {
    command: "/straight",
    description: "Straight",
    parameters: ["rank"],
    template: "Straight from {rank}"
  },
  {
    command: "/flush",
    description: "Flush",
    parameters: ["suit", "rank1", "rank2", "rank3", "rank4", "rank5"],
    template: "Flush of {suit}: {rank1},{rank2},{rank3},{rank4},{rank5}"
  },
  {
    command: "/fullhouse",
    description: "Full House",
    parameters: ["rank1", "rank2"],
    template: "Full House: 3 {rank1} and 2 {rank2}"
  },
  {
    command: "/four",
    description: "Four of a Kind",
    parameters: ["rank"],
    template: "Four of a Kind {rank}"
  },
  {
    command: "/straightflush",
    description: "Straight Flush",
    parameters: ["suit", "rank"],
    template: "Straight Flush {suit} from {rank}"
  },
  {
    command: "/royal",
    description: "Royal Flush",
    parameters: ["suit"],
    template: "Royal Flush {suit}"
  },
]

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
const SUITS = ["hearts", "diamonds", "clubs", "spades"]

export function HandInput({ onCallHand, onCallBluff, isYourTurn, currentCall }: HandInputProps) {
  const [handSpec, setHandSpec] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [currentCommand, setCurrentCommand] = useState<SlashCommand | null>(null)
  const [parameterIndex, setParameterIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = handSpec.trim()
    if (trimmed && !trimmed.startsWith('/')) {
      const spec = translateShorthandToSpec?.(trimmed) ?? trimmed
      onCallHand(spec)
      setHandSpec("")
      setShowSuggestions(false)
      setCurrentCommand(null)
      setParameterIndex(0)
    }
  }

  const handleBluff = () => {
    onCallBluff()
  }

  const updateSuggestions = (value: string) => {
    if (!value.startsWith('/')) {
      setShowSuggestions(false)
      setCurrentCommand(null)
      setParameterIndex(0)
      return
    }

    const parts = value.split(' ')
    const commandPart = parts[0]

    // If we're still typing the command
    if (parts.length === 1) {
      const matchingCommands = SLASH_COMMANDS.filter(cmd =>
        cmd.command.startsWith(commandPart.toLowerCase())
      )
      setSuggestions(matchingCommands.map(cmd => ({
        type: 'command',
        value: cmd.command,
        description: cmd.description,
        command: cmd
      })))
      setShowSuggestions(matchingCommands.length > 0)
      setCurrentCommand(null)
      setParameterIndex(0)
    } else {
      // We have a command, now suggest parameters
      const command = SLASH_COMMANDS.find(cmd => cmd.command === commandPart.toLowerCase())
      if (command) {
        setCurrentCommand(command)
        const currentParamIndex = parts.length - 2 // -1 for command, -1 for 0-based index
        setParameterIndex(currentParamIndex)

        if (currentParamIndex < command.parameters.length) {
          const paramType = command.parameters[currentParamIndex]
          const currentParamValue = parts[parts.length - 1] || ''

          let paramSuggestions: string[] = []
          if (paramType.includes('rank')) {
            paramSuggestions = RANKS.filter(rank =>
              rank.toLowerCase().startsWith(currentParamValue.toLowerCase())
            )
          } else if (paramType.includes('suit')) {
            paramSuggestions = SUITS.filter(suit =>
              suit.toLowerCase().startsWith(currentParamValue.toLowerCase())
            )
          }

          setSuggestions(paramSuggestions.map(param => ({
            type: 'parameter',
            value: param,
            description: `${paramType}: ${param}`,
            paramType
          })))
          setShowSuggestions(paramSuggestions.length > 0)
        } else {
          setShowSuggestions(false)
        }
      } else {
        setShowSuggestions(false)
        setCurrentCommand(null)
        setParameterIndex(0)
      }
    }
    setSelectedSuggestion(0)
  }

  const applySuggestion = (suggestion: any) => {
    if (suggestion.type === 'command') {
      const newValue = suggestion.value + ' '
      setHandSpec(newValue)
      setCurrentCommand(suggestion.command)
      setParameterIndex(0)
      setShowSuggestions(false) // Hide suggestions after selecting command

      // Show parameter suggestions after a brief delay
      setTimeout(() => {
        updateSuggestions(newValue)
        inputRef.current?.focus()
      }, 100)
    } else if (suggestion.type === 'parameter') {
      const parts = handSpec.split(' ')
      parts[parts.length - 1] = suggestion.value
      const newValue = parts.join(' ')

      // Check if we need to add space for next parameter
      if (currentCommand && parameterIndex + 1 < currentCommand.parameters.length) {
        const nextValue = newValue + ' '
        setHandSpec(nextValue)
        setShowSuggestions(false) // Hide suggestions after selecting parameter

        // Show next parameter suggestions after a brief delay
        setTimeout(() => {
          updateSuggestions(nextValue)
        }, 100)
      } else if (currentCommand) {
        // Generate the final hand specification
        const finalSpec = generateHandSpec(currentCommand, parts.slice(1))
        setHandSpec(finalSpec)
        setShowSuggestions(false)
        setCurrentCommand(null)
        setParameterIndex(0)
      }
    }
  }

  const generateHandSpec = (command: SlashCommand, params: string[]): string => {
    let spec = command.template
    command.parameters.forEach((param, index) => {
      if (params[index]) {
        spec = spec.replace(`{${param}}`, params[index])
      }
    })
    return spec
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev + 1) % suggestions.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault()
        applySuggestion(suggestions[selectedSuggestion])
        return
      } else if (e.key === "Escape") {
        setShowSuggestions(false)
      }
    } else if (e.key === "Enter" && !showSuggestions) {
      // Handle submit when no suggestions are showing
      handleSubmit(e as any)
    }

    if (e.key === "Tab" && !showSuggestions) {
      e.preventDefault()
      const prefix = handSpec.trim().toLowerCase()
      if (!prefix) return

      // Original tab completion for non-slash commands
      const matches = KEYWORDS_COMPLETIONS?.filter((k) => k.startsWith(prefix)) || []
      if (matches.length > 0) {
        setHandSpec(matches[0])
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHandSpec(value)
    updateSuggestions(value)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={handSpec}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !showSuggestions && !handSpec.startsWith('/')) {
                      handleSubmit(e as any)
                    }
                  }}
                  placeholder="Type / for commands or enter hand manually..."
                  className="bg-slate-700 border-green-400/20 text-white placeholder:text-gray-500"
                  autoComplete="off"
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-green-400/20 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        ref={index === selectedSuggestion ? (el) => {
                          if (el) {
                            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                          }
                        } : undefined}
                        className={`px-3 py-2 cursor-pointer border-b border-slate-600 last:border-b-0 ${index === selectedSuggestion ? 'bg-slate-600' : 'hover:bg-slate-600'
                          }`}
                        onMouseDown={(e) => {
                          e.preventDefault() // Prevent input blur
                          applySuggestion(suggestion)
                        }}
                      >
                        <div className="text-white font-medium">{suggestion.value}</div>
                        <div className="text-gray-400 text-sm">{suggestion.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={(e) => handleSubmit(e as any)}
                disabled={!handSpec.trim() || handSpec.startsWith('/')}
                className="bg-blue-500 hover:bg-blue-700"
              >
                Call
              </Button>
            </div>

            {currentCommand && (
              <div className="mt-2 p-2 bg-slate-700 rounded text-sm">
                <div className="text-green-400 font-medium">{currentCommand.description}</div>
                <div className="text-gray-300">
                  Parameters: {currentCommand.parameters.map((param, index) => (
                    <span key={param} className={index === parameterIndex ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                      {param}{index < currentCommand.parameters.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Preview: {currentCommand.template}
                </div>
              </div>
            )}
          </div>

          {currentCall && (
            <Button onClick={handleBluff} variant="destructive" className="w-full">
              Call Bluff
            </Button>
          )}

          <Accordion type="single" collapsible className="text-sm text-gray-400">
            <AccordionItem value="commands">
              <AccordionTrigger>Slash Commands</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1">
                  {SLASH_COMMANDS.map((cmd) => (
                    <div key={cmd.command} className="flex items-center justify-between">
                      <span className="text-blue-400 font-mono">{cmd.command}</span>
                      <span className="text-gray-300">{cmd.description}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Type / to see available commands, use Tab or Enter to select
                </div>
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
