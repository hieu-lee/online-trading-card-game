"use client"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface HandInputProps {
  onCallHand: (handSpec: string) => void
  onCallBluff: () => void
  isYourTurn: boolean
  currentCall?: string
}

export function HandInput({ onCallHand, onCallBluff, isYourTurn, currentCall }: HandInputProps) {
  const [handSpec, setHandSpec] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (handSpec.trim()) {
      onCallHand(handSpec.trim())
      setHandSpec("")
    }
  }

  const handleBluff = () => {
    onCallBluff()
  }

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
      <CardContent >
        <div className="space-y-4">
          <div className="text-green-400 font-semibold">Your Turn!</div>
          {currentCall && <div className="text-sm text-gray-300">Current call: {currentCall}</div>}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={handSpec}
              onChange={(e) => setHandSpec(e.target.value)}
              placeholder="Enter hand (e.g., &ldquo;pair of kings&rdquo;, &ldquo;3 aces&rdquo;, &ldquo;straight 10&rdquo;)"
              className="bg-slate-700 border-green-400/20 text-white placeholder:text-gray-500"
            />
            <Button type="submit" disabled={!handSpec.trim()} className="bg-blue-600 hover:bg-blue-700">
              Call
            </Button>
          </form>
          {currentCall && (
            <Button onClick={handleBluff} variant="destructive" className="w-full">
              Call Bluff
            </Button>
          )}
          <div className="text-xs text-gray-400">
            Examples: &ldquo;pair of aces&rdquo;, &ldquo;3 kings&rdquo;, &ldquo;straight 10&rdquo;, &ldquo;flush hearts&rdquo;, &ldquo;bluff&rdquo;
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
