export interface Card {
  suit: string
  rank: number
}

export interface Player {
  user_id: string
  username: string
  card_count: number
  losses: number
  is_eliminated: boolean
}

export interface GameState {
  phase: string
  round_number: number
  current_player_id?: string
  current_call?: {
    player_id: string
    hand: string
  }
  players: Player[]
  waiting_players_count: number
}

export interface GameMessage {
  type: string
  data: any
}

export enum MessageType {
  USER_JOIN = "user_join",
  USERNAME_ERROR = "username_error",
  GAME_STATE_UPDATE = "game_state_update",
  PLAYER_UPDATE = "player_update",
  GAME_START = "game_start",
  GAME_RESTART = "game_restart",
  HOST_CHANGED = "host_changed",
  USER_KICKED = "user_kicked",
  USER_LEAVE = "user_leave",
  WAITING_FOR_GAME = "waiting_for_game",
  ROUND_START = "round_start",
  ROUND_END = "round_end",
  SHOW_CARDS = "show_cards",
  CALL_BLUFF = "call_bluff",
  CALL_HAND = "call_hand",
  KICK_USER = "kick_user",
  ERROR = "error",
}
