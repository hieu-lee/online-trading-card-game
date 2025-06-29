import { useState, useEffect, RefObject } from "react"
import type React from "react"
import { translateShorthandToSpec, KEYWORDS_COMPLETIONS } from "@/lib/handSpec"
import {
  SLASH_COMMANDS,
  RANKS,
  SUITS,
  SlashCommand,
} from "@/components/HandInput/constants"

/**
 * Hook that manages the input value and the slash-command / parameter
 * auto-completion behaviour used by the HandInput component.
 */
export function useSlashCommand(inputRef: RefObject<HTMLInputElement>) {
  /** Current value typed by the user */
  const [handSpec, setHandSpec] = useState<string>("")

  /** Auto-completion state */
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [currentCommand, setCurrentCommand] = useState<SlashCommand | null>(null)
  const [parameterIndex, setParameterIndex] = useState(0)

  /* ──────────────────────────────────────────────────────────────────
   * Suggestion helpers
   * ─────────────────────────────────────────────────────────────────*/
  const generateHandSpec = (command: SlashCommand, params: string[]): string => {
    let spec = command.template
    command.parameters.forEach((param, index) => {
      if (params[index]) {
        spec = spec.replace(`{${param}}`, params[index])
      }
    })
    return spec
  }

  const updateSuggestions = (value: string) => {
    if (!value.startsWith("/")) {
      setShowSuggestions(false)
      setCurrentCommand(null)
      setParameterIndex(0)
      return
    }

    const parts = value.split(" ")
    const commandPart = parts[0]

    // 1. Command suggestions (user still typing the command)
    if (parts.length === 1) {
      const matchingCommands = SLASH_COMMANDS.filter((cmd) =>
        cmd.command.startsWith(commandPart.toLowerCase())
      )
      setSuggestions(
        matchingCommands.map((cmd) => ({
          type: "command",
          value: cmd.command,
          description: cmd.description,
          command: cmd,
        }))
      )
      setShowSuggestions(matchingCommands.length > 0)
      setCurrentCommand(null)
      setParameterIndex(0)
    } else {
      // 2. Parameter suggestions (command is chosen, fill its params)
      const command = SLASH_COMMANDS.find((cmd) => cmd.command === commandPart.toLowerCase())
      if (command) {
        setCurrentCommand(command)
        const currentParamIndex = parts.length - 2 // -1 for command, -1 for 0-based index
        setParameterIndex(currentParamIndex)

        if (currentParamIndex < command.parameters.length) {
          const paramType = command.parameters[currentParamIndex]
          const currentParamValue = parts[parts.length - 1] || ""

          let paramSuggestions: string[] = []
          if (paramType.includes("rank")) {
            paramSuggestions = RANKS.filter((rank) =>
              rank.toLowerCase().startsWith(currentParamValue.toLowerCase())
            )
          } else if (paramType.includes("suit")) {
            paramSuggestions = SUITS.filter((suit) =>
              suit.toLowerCase().startsWith(currentParamValue.toLowerCase())
            )
          }

          setSuggestions(
            paramSuggestions.map((param) => ({
              type: "parameter",
              value: param,
              paramType,
            }))
          )
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
    if (suggestion.type === "command") {
      const newValue = suggestion.value + " "
      setHandSpec(newValue)
      setCurrentCommand(suggestion.command)
      setParameterIndex(0)
      setShowSuggestions(false)

      // Trigger parameter suggestions after a tick so the input value is updated first
      setTimeout(() => {
        updateSuggestions(newValue)
        inputRef.current?.focus()
      }, 50)
    } else if (suggestion.type === "parameter") {
      const parts = handSpec.split(" ")
      parts[parts.length - 1] = suggestion.value
      const newValue = parts.join(" ")

      if (currentCommand && parameterIndex + 1 < currentCommand.parameters.length) {
        const nextValue = newValue + " "
        setHandSpec(nextValue)
        setShowSuggestions(false)
        setTimeout(() => updateSuggestions(nextValue), 50)
      } else if (currentCommand) {
        const finalSpec = generateHandSpec(currentCommand, parts.slice(1))
        setHandSpec(finalSpec)
        setShowSuggestions(false)
        setCurrentCommand(null)
        setParameterIndex(0)
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────────
   * Keyboard / input handlers (exported)
   * ─────────────────────────────────────────────────────────────────*/
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
    }

    // Legacy keyword completions when no suggestions visible
    if (e.key === "Tab" && !showSuggestions) {
      e.preventDefault()
      const prefix = handSpec.trim().toLowerCase()
      if (!prefix) return
      const matches = KEYWORDS_COMPLETIONS.filter((k) => k.startsWith(prefix))
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

  /* ──────────────────────────────────────────────────────────────────
   * Hide suggestions when clicking outside input
   * ─────────────────────────────────────────────────────────────────*/
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [inputRef])

  /* ─────────────────────────────────────────────────────────────────*/
  return {
    handSpec,
    setHandSpec,
    showSuggestions,
    suggestions,
    selectedSuggestion,
    currentCommand,
    parameterIndex,
    handleKeyDown,
    handleInputChange,
    applySuggestion,
    translateShorthandToSpec, // export for convenience (used on submit)
  }
} 