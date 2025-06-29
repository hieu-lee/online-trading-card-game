"""
Message Protocol for Online Card Game WebSocket Communication

This module defines all message types and their validation schemas
using Pydantic models for type safety and serialization.
"""

from enum import Enum
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime


class MessageType(str, Enum):
    # Connection messages
    USER_JOIN = "user_join"
    USER_LEAVE = "user_leave"
    USER_KICKED = "user_kicked"
    USERNAME_ERROR = "username_error"
    
    # Session messages
    CREATE_SESSION = "create_session"
    JOIN_SESSION = "join_session"
    SESSION_CREATED = "session_created"
    SESSION_JOINED = "session_joined"
    SESSION_ERROR = "session_error"
    SESSION_LIST = "session_list"
    
    # Game state messages
    GAME_START = "game_start"
    GAME_END = "game_end"
    GAME_RESTART = "game_restart"
    WAITING_FOR_GAME = "waiting_for_game"
    
    # Round messages
    ROUND_START = "round_start"
    ROUND_END = "round_end"
    
    # Player actions
    CALL_HAND = "call_hand"
    CALL_BLUFF = "call_bluff"
    SHOW_CARDS = "show_cards"
    
    # Host messages
    HOST_CHANGED = "host_changed"
    KICK_USER = "kick_user"
    
    # General updates
    GAME_STATE_UPDATE = "game_state_update"
    PLAYER_UPDATE = "player_update"
    ERROR = "error"


class BaseMessage(BaseModel):
    """Base message structure for all WebSocket communications"""
    type: MessageType
    timestamp: datetime = Field(default_factory=datetime.now)
    data: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None  # Add session context
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class UserJoinMessage(BaseModel):
    """Message sent when user wants to join the game"""
    username: str = Field(min_length=1, max_length=20)


class UserJoinResponse(BaseModel):
    """Response to user join request"""
    success: bool
    message: str
    user_id: Optional[str] = None
    is_host: bool = False


class GameStateMessage(BaseModel):
    """Current game state information"""
    players: List[Dict[str, Any]]
    current_player: Optional[str] = None
    game_phase: str  # "waiting", "playing", "ended"
    round_number: Optional[int] = None
    current_hand_call: Optional[str] = None
    host: str


class CallHandMessage(BaseModel):
    """Message for calling a poker hand"""
    hand_type: str
    hand_details: Dict[str, Any]
    user_id: str


class CallBluffMessage(BaseModel):
    """Message for calling bluff"""
    user_id: str
    target_user: str


class KickUserMessage(BaseModel):
    """Message for host to kick a user"""
    target_username: str
    host_id: str


class ErrorMessage(BaseModel):
    """Error message format"""
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class UserLeaveMessage(BaseModel):
    """Message sent when a user leaves the game"""
    user_id: str
    username: str


class WaitingForGameMessage(BaseModel):
    """Message sent to indicate the game is in progress and new users should wait"""
    message: str


class RoundStartMessage(BaseModel):
    """Message sent to indicate a new round has started"""
    round_number: int
    current_player_id: Optional[str] = None


class RoundEndMessage(BaseModel):
    """Message sent to indicate a round has ended"""
    round_number: int
    loser_id: Optional[str] = None


class ShowCardsMessage(BaseModel):
    """Message sent when revealing cards to all players"""
    cards: List[Dict[str, Any]]


class CreateSessionMessage(BaseModel):
    """Message to create a new game session"""
    username: str = Field(min_length=1, max_length=20)


class JoinSessionMessage(BaseModel):
    """Message to join an existing game session"""
    session_id: str = Field(min_length=4, max_length=6)
    username: str = Field(min_length=1, max_length=20)


class SessionCreatedMessage(BaseModel):
    """Response when a session is successfully created"""
    session_id: str
    success: bool = True
    message: str


class SessionJoinedMessage(BaseModel):
    """Response when successfully joined a session"""
    session_id: str
    success: bool = True
    message: str


class SessionErrorMessage(BaseModel):
    """Error message for session operations"""
    success: bool = False
    message: str
    error_code: str


class SessionListMessage(BaseModel):
    """List of available sessions"""
    sessions: List[Dict[str, Any]]


def create_message(msg_type: MessageType, data: Dict[str, Any], session_id: Optional[str] = None) -> Dict[str, Any]:
    """Create a standardized message dictionary"""
    message = BaseMessage(type=msg_type, data=data, session_id=session_id)
    return message.model_dump(mode='json')


def parse_message(raw_message: str) -> BaseMessage:
    """Parse incoming JSON message into BaseMessage"""
    import json
    try:
        data = json.loads(raw_message)
        # Convert timestamp string back to datetime if present
        if 'timestamp' in data and isinstance(data['timestamp'], str):
            try:
                data['timestamp'] = datetime.fromisoformat(data['timestamp'])
            except:
                pass  # Keep as string if parsing fails
        return BaseMessage(**data)
    except Exception as e:
        raise ValueError(f"Invalid message format: {e}") 