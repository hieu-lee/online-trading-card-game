"use client"
import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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
            <Button type="submit" disabled={!handSpec.trim()} className="bg-blue-500 hover:bg-blue-700">
              Call
            </Button>
          </form>
          {currentCall && (
            <Button onClick={handleBluff} variant="destructive" className="w-full">
              Call Bluff
            </Button>
          )}
          <Accordion type="single" collapsible className="text-xl text-gray-400">
            <AccordionItem value="item-1">
              <AccordionTrigger>Available hands ?</AccordionTrigger>
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
    </Card >
  )
}
