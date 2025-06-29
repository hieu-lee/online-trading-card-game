"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Club, Diamond, Spade, Heart, Users, Plus } from "lucide-react"

interface SessionSelectorProps {
  onCreateSession: (username: string) => void
  onJoinSession: (sessionId: string, username: string) => void
  isLoading: boolean
  error: string
}

export function SessionSelector({ onCreateSession, onJoinSession, isLoading, error }: SessionSelectorProps) {
  const [mode, setMode] = useState<"select" | "create" | "join">("select")
  const [username, setUsername] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [sessionIdError, setSessionIdError] = useState("")

  const validateUsername = (value: string): boolean => {
    if (!value.trim()) {
      setUsernameError("Username is required")
      return false
    }
    if (value.length < 2) {
      setUsernameError("Username must be at least 2 characters")
      return false
    }
    if (value.length > 20) {
      setUsernameError("Username must be less than 20 characters")
      return false
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setUsernameError("Username can only contain letters, numbers, underscores, and hyphens")
      return false
    }
    setUsernameError("")
    return true
  }

  const validateSessionId = (value: string): boolean => {
    if (!value.trim()) {
      setSessionIdError("Session ID is required")
      return false
    }
    if (value.length < 4 || value.length > 6) {
      setSessionIdError("Session ID must be 4-6 characters")
      return false
    }
    if (!/^[A-Z0-9]+$/.test(value.toUpperCase())) {
      setSessionIdError("Session ID can only contain letters and numbers")
      return false
    }
    setSessionIdError("")
    return true
  }

  const handleCreateSession = () => {
    if (!validateUsername(username)) return
    onCreateSession(username)
  }

  const handleJoinSession = () => {
    if (!validateUsername(username) || !validateSessionId(sessionId)) return
    onJoinSession(sessionId.toUpperCase(), username)
  }

  const handleBack = () => {
    setMode("select")
    setUsernameError("")
    setSessionIdError("")
  }

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-slate-900 text-green-400 flex items-center justify-center p-6 font-mono">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="text-3xl text-green-400 flex items-center justify-center gap-2">
              <Club className="h-8 w-8" />
              <Diamond className="h-8 w-8" />
              <div className="text-2xl">Online Card Game</div>
              <Spade className="h-8 w-8" />
              <Heart className="h-8 w-8" />
            </div>
            <p className="text-slate-400 text-sm">
              Choose how you'd like to play
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-400/20 bg-red-900/20">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {/* Session Options */}
          <div className="space-y-4">
            <Card className="bg-slate-800 border-slate-700 hover:border-green-400/50 transition-colors cursor-pointer"
                  onClick={() => setMode("create")}>
              <CardHeader className="pb-3">
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Game Session
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Start a new game and invite others to join
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500">
                  • You'll become the host
                  • Share your session ID with friends
                  • Up to 8 players can join
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 hover:border-green-400/50 transition-colors cursor-pointer"
                  onClick={() => setMode("join")}>
              <CardHeader className="pb-3">
                <CardTitle className="text-green-400 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Join Existing Game Session
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Enter a session ID to join a friend's game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-500">
                  • Need a 4-6 character session ID
                  • Join ongoing or waiting games
                  • Wait if the game is in progress
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-xs text-slate-500">
            Each game session is independent with its own players and host
          </div>
        </div>
      </div>
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      if (mode === "create") {
        handleCreateSession()
      } else {
        handleJoinSession()
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-green-400 flex items-center justify-center p-6 font-mono">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="text-2xl text-green-400 flex items-center justify-center gap-2">
            <Club className="h-6 w-6" />
            <Diamond className="h-6 w-6" />
            <div>{mode === "create" ? "Create New Session" : "Join Session"}</div>
            <Spade className="h-6 w-6" />
            <Heart className="h-6 w-6" />
          </div>
          <p className="text-slate-400 text-sm">
            {mode === "create" 
              ? "Enter your username to create a new game session"
              : "Enter the session ID and your username to join"
            }
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-green-400">Username</label>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (usernameError) setUsernameError("")
                }}
                onKeyDown={handleKeyDown}
                className="bg-slate-900 border-slate-600 text-green-400 placeholder-slate-500 focus:border-green-400 focus:ring-green-400"
                disabled={isLoading}
                maxLength={20}
                autoFocus
              />
              {usernameError && (
                <p className="text-red-400 text-xs">{usernameError}</p>
              )}
            </div>

            {/* Session ID Input (only for join mode) */}
            {mode === "join" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-400">Session ID</label>
                <Input
                  type="text"
                  placeholder="e.g., ABC123"
                  value={sessionId}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setSessionId(value)
                    if (sessionIdError) setSessionIdError("")
                  }}
                  onKeyDown={handleKeyDown}
                  className="bg-slate-900 border-slate-600 text-green-400 placeholder-slate-500 uppercase focus:border-green-400 focus:ring-green-400"
                  disabled={isLoading}
                  maxLength={6}
                />
                {sessionIdError && (
                  <p className="text-red-400 text-xs">{sessionIdError}</p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert className="border-red-400/20 bg-red-900/20">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1 border-slate-600 bg-slate-500 text-green-400 hover:bg-slate-700 hover:text-green-600"
              >
                Back
              </Button>
              <Button
                onClick={mode === "create" ? handleCreateSession : handleJoinSession}
                disabled={isLoading || !username.trim() || (mode === "join" && !sessionId.trim())}
                className="flex-1 bg-green-500 hover:bg-green-700 text-slate-900 font-semibold"
              >
                {isLoading ? "Loading..." : mode === "create" ? "Create Session" : "Join Session"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to selection option */}
        <div className="text-center">
          <button
            onClick={handleBack}
            className="text-xs text-slate-500 hover:text-green-400 transition-colors"
            disabled={isLoading}
          >
            ← Back to session selection
          </button>
        </div>
      </div>
    </div>
  )
}
