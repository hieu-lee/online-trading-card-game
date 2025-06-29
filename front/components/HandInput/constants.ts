export interface SlashCommand {
  command: string
  description?: string
  parameters: string[]
  template: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/high",
    description: "High Card",
    parameters: ["rank"],
    template: "High Card {rank}",
  },
  {
    command: "/pair",
    description: "Pair of cards",
    parameters: ["rank"],
    template: "Pair of {rank}",
  },
  {
    command: "/twopair",
    description: "Two Pairs",
    parameters: ["rank1", "rank2"],
    template: "Two Pairs {rank1} and {rank2}",
  },
  {
    command: "/three",
    description: "Three of a Kind",
    parameters: ["rank"],
    template: "Three of a Kind {rank}",
  },
  {
    command: "/straight",
    description: "Straight",
    parameters: ["rank"],
    template: "Straight from {rank}",
  },
  {
    command: "/flush",
    description: "Flush",
    parameters: ["suit", "rank1", "rank2", "rank3", "rank4", "rank5"],
    template: "Flush of {suit}: {rank1},{rank2},{rank3},{rank4},{rank5}",
  },
  {
    command: "/fullhouse",
    description: "Full House",
    parameters: ["rank1", "rank2"],
    template: "Full House: 3 {rank1} and 2 {rank2}",
  },
  {
    command: "/four",
    description: "Four of a Kind",
    parameters: ["rank"],
    template: "Four of a Kind {rank}",
  },
  {
    command: "/straightflush",
    description: "Straight Flush",
    parameters: ["suit", "rank"],
    template: "Straight Flush {suit} from {rank}",
  },
  {
    command: "/royal",
    description: "Royal Flush",
    parameters: ["suit"],
    template: "Royal Flush {suit}",
  },
]

export const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
]

export const SUITS = ["hearts", "diamonds", "clubs", "spades"] 