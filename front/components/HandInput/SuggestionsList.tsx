import React from "react"

interface SuggestionItem {
  value: string
  description?: string
  type: "command" | "parameter"
  // additional dynamic keys can exist
  [key: string]: unknown
}

interface SuggestionsListProps {
  suggestions: SuggestionItem[]
  visible: boolean
  selectedIndex: number
  onSelect: (suggestion: SuggestionItem) => void
}

export default function SuggestionsList({
  suggestions,
  visible,
  selectedIndex,
  onSelect,
}: SuggestionsListProps) {
  if (!visible || suggestions.length === 0) return null

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 border border-green-400/20 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
      {suggestions.map((sug, index) => (
        <div
          key={index}
          ref={index === selectedIndex ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
          className={`px-3 py-2 cursor-pointer border-b border-slate-600 last:border-b-0 ${
            index === selectedIndex ? "bg-slate-600" : "hover:bg-slate-600"
          }`}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(sug)
          }}
        >
          <div className="text-white font-medium">{sug.value}</div>
          {sug.description && <div className="text-gray-400 text-sm">{sug.description}</div>}
        </div>
      ))}
    </div>
  )
} 