export const RANK_ALIASES: Record<string, string> = {
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    "j": "jack",
    "jack": "jack",
    "q": "queen",
    "queen": "queen",
    "k": "king",
    "king": "king",
    "a": "ace",
    "ace": "ace",
}

function normalizeRank(token: string): string | undefined {
    const cleaned = token.toLowerCase().replace(/s$/, "") // remove trailing plural 's'
    return RANK_ALIASES[cleaned]
}

/**
 * Convert shorthand user input into the canonical hand specification string
 * understood by the backend. If the input cannot be translated it returns
 * null so the caller can choose to fallback to the original string.
 */
export function translateShorthandToSpec(raw: string): string | null {
    let s = raw.trim().toLowerCase()
    if (!s) return null

    // Strip the optional leading "call " prefix so we only parse the hand
    if (s.startsWith("call ")) {
        s = s.slice(5)
    }

    const tokens = s.split(/\s+/)
    if (tokens.length === 0) return null

    // Numeric shorthand patterns like: "2 kings", "3 j", "4 queens"
    if (["2", "3", "4"].includes(tokens[0])) {
        if (tokens.length === 2) {
            const rankWord = normalizeRank(tokens[1])
            if (!rankWord) return null
            switch (tokens[0]) {
                case "2":
                    return `pair of ${rankWord}`
                case "3":
                    return `three of a kind ${rankWord}`
                case "4":
                    return `four of a kind ${rankWord}`
            }
        }
        // Two-pairs numeric shorthand: e.g. "2 3 2 4" => two pairs 3 and 4
        if (tokens.length === 4 && tokens[0] === "2" && tokens[2] === "2") {
            const r1 = normalizeRank(tokens[1])
            const r2 = normalizeRank(tokens[3])
            if (r1 && r2 && r1 !== r2) {
                return `two pairs ${r1} and ${r2}`
            }
        }
        // Full-house numeric shorthand: supports "2 3 3 2" or "3 2 2 3" pattern
        if (
            tokens.length === 4 &&
            ((tokens[0] === "2" && tokens[2] === "3") || (tokens[0] === "3" && tokens[2] === "2"))
        ) {
            const pairRank = tokens[0] === "2" ? normalizeRank(tokens[1]) : normalizeRank(tokens[3])
            const tripleRank = tokens[0] === "3" ? normalizeRank(tokens[1]) : normalizeRank(tokens[3])
            if (pairRank && tripleRank && pairRank !== tripleRank) {
                return `full house: 3 ${tripleRank} and 2 ${pairRank}`
            }
        }
    }

    // Verbose patterns with keywords but still allowing abbreviations
    // Straight shorthand: "straight 10" or "straight j"
    const straightMatch = s.match(/^straight\s+(\w+)$/)
    if (straightMatch) {
        const rankWord = normalizeRank(straightMatch[1])
        if (rankWord) {
            return `straight from ${rankWord}`
        }
    }

    const pairMatch = s.match(/^(pair of|pair)\s+(\w+)/)
    if (pairMatch) {
        const rankWord = normalizeRank(pairMatch[2])
        if (rankWord) {
            return `pair of ${rankWord}`
        }
    }

    const threeMatch = s.match(/^(three of a kind|3 of a kind|three of|triple)\s+(\w+)/)
    if (threeMatch) {
        const rankWord = normalizeRank(threeMatch[2])
        if (rankWord) {
            return `three of a kind ${rankWord}`
        }
    }

    const fourMatch = s.match(/^(four of a kind|4 of a kind|four of|quad)\s+(\w+)/)
    if (fourMatch) {
        const rankWord = normalizeRank(fourMatch[2])
        if (rankWord) {
            return `four of a kind ${rankWord}`
        }
    }

    // If the phrase already looks like a canonical spec starting with a known keyword
    const keywords = [
        "high card",
        "pair",
        "two pairs",
        "three of a kind",
        "straight",
        "flush",
        "full house",
        "four of a kind",
        "straight flush",
        "royal flush",
    ]
    if (keywords.some((k) => s.startsWith(k))) {
        return s
    }

    return null
}

export const KEYWORDS_COMPLETIONS = [
    "highcard",
    "pair of",
    "two pairs",
    "three of a kind",
    "straight from",
    "flush",
    "royal flush"
] 