# Message protocol types for reference
from enum import Enum

class MessageType(Enum):
    USER_JOIN = "user_join"
    USERNAME_ERROR = "username_error"
    GAME_STATE_UPDATE = "game_state_update"
    PLAYER_UPDATE = "player_update"
    GAME_START = "game_start"
    GAME_RESTART = "game_restart"
    HOST_CHANGED = "host_changed"
    USER_KICKED = "user_kicked"
    USER_LEAVE = "user_leave"
    WAITING_FOR_GAME = "waiting_for_game"
    ROUND_START = "round_start"
    ROUND_END = "round_end"
    SHOW_CARDS = "show_cards"
    CALL_BLUFF = "call_bluff"
    CALL_HAND = "call_hand"
    KICK_USER = "kick_user"
    ERROR = "error"

# Print message types for reference
for msg_type in MessageType:
    print(f"{msg_type.name}: {msg_type.value}")
