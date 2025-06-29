"""
Game Session Management

This module handles:
- Multiple game session management
- Session ID generation and validation
- Session lifecycle management
- Session-based game routing
"""

import string
import random
import time
from typing import Dict, Optional, List, Set
from datetime import datetime, timedelta
from dataclasses import dataclass

from game_logic import Game
from user_manager import User


@dataclass
class SessionInfo:
    """Information about a game session"""
    session_id: str
    created_at: datetime
    last_activity: datetime
    player_count: int
    max_players: int = 8


class GameSessionManager:
    """Manages multiple game sessions"""
    
    def __init__(self, session_timeout_hours: int = 24):
        self.sessions: Dict[str, Game] = {}
        self.session_timeout = timedelta(hours=session_timeout_hours)
        self.used_session_ids: Set[str] = set()
        
    def generate_session_id(self) -> str:
        """Generate a unique short session ID (4-6 characters)"""
        # Use alphanumeric characters excluding similar looking ones
        chars = string.ascii_uppercase + string.digits
        chars = chars.replace('0', '').replace('O', '').replace('1', '').replace('I', '')
        
        for _ in range(100):  # Try up to 100 times to avoid infinite loop
            session_id = ''.join(random.choices(chars, k=5))
            if session_id not in self.used_session_ids:
                self.used_session_ids.add(session_id)
                return session_id
        
        # Fallback to 6 characters if 5 chars are exhausted
        for _ in range(100):
            session_id = ''.join(random.choices(chars, k=6))
            if session_id not in self.used_session_ids:
                self.used_session_ids.add(session_id)
                return session_id
                
        # Ultimate fallback with timestamp
        timestamp = str(int(time.time()))[-4:]
        session_id = ''.join(random.choices(chars, k=2)) + timestamp
        self.used_session_ids.add(session_id)
        return session_id
    
    def create_session(self) -> str:
        """Create a new game session and return its ID"""
        session_id = self.generate_session_id()
        self.sessions[session_id] = Game()
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Game]:
        """Get a game session by ID"""
        if session_id in self.sessions:
            return self.sessions[session_id]
        return None
    
    def session_exists(self, session_id: str) -> bool:
        """Check if a session exists"""
        return session_id in self.sessions
    
    def get_session_info(self, session_id: str) -> Optional[SessionInfo]:
        """Get information about a session"""
        if session_id not in self.sessions:
            return None
            
        game = self.sessions[session_id]
        return SessionInfo(
            session_id=session_id,
            created_at=game.started_at or datetime.now(),
            last_activity=datetime.now(),  # TODO: Track actual last activity
            player_count=len(game.players),
            max_players=8
        )
    
    def list_active_sessions(self) -> List[SessionInfo]:
        """List all active sessions"""
        sessions = []
        for session_id, game in self.sessions.items():
            info = self.get_session_info(session_id)
            if info:
                sessions.append(info)
        return sessions
    
    def cleanup_expired_sessions(self) -> int:
        """Remove expired sessions and return count of removed sessions"""
        current_time = datetime.now()
        expired_sessions = []
        
        for session_id, game in self.sessions.items():
            # Consider session expired if no activity for timeout period
            last_activity = game.started_at or datetime.now()
            if current_time - last_activity > self.session_timeout:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            self.remove_session(session_id)
            
        return len(expired_sessions)
    
    def remove_session(self, session_id: str) -> bool:
        """Remove a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            self.used_session_ids.discard(session_id)
            return True
        return False
    
    def get_session_count(self) -> int:
        """Get total number of active sessions"""
        return len(self.sessions)
    
    def add_player_to_session(self, session_id: str, user: User) -> bool:
        """Add a player to a specific session"""
        game = self.get_session(session_id)
        if game:
            return game.add_player(user)
        return False
    
    async def remove_player_from_session(self, session_id: str, user_id: str) -> bool:
        """Remove a player from a specific session"""
        game = self.get_session(session_id)
        if game:
            await game.remove_player(user_id)
            
            # Remove session if empty
            if len(game.players) == 0 and len(game.waiting_players) == 0:
                self.remove_session(session_id)
                
            return True
        return False


# Global session manager instance
session_manager = GameSessionManager()


def get_session_manager() -> GameSessionManager:
    """Get the global session manager instance"""
    return session_manager