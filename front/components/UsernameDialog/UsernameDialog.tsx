"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UsernameDialogProps {
  isOpen: boolean
  onSubmit: (username: string) => void
  error?: string
  isConnecting?: boolean
}

export function UsernameDialog({ isOpen, onSubmit, error, isConnecting }: UsernameDialogProps) {
  const [username, setUsername] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      onSubmit(username.trim())
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-slate-800 border-green-400/20 text-white [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-green-400 text-center">Join Online Card Game</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="bg-slate-700 border-green-400/20 text-white placeholder:text-gray-400"
              disabled={isConnecting}
              autoFocus
            />
          </div>
          {error && (
            <Alert className="border-red-400/20 bg-red-900/20">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            disabled={!username.trim() || isConnecting}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isConnecting ? "Connecting..." : "Join Game"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 