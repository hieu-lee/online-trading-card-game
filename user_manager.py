"""
User Management System for Online Card Game

This module handles:
- User database operations (SQLite)
- Username validation and availability
- User session management
- Online status tracking
"""

import aiosqlite
import uuid
from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass
import random


@dataclass
class User:
    """User data structure"""

    id: str
    username: str
    created_at: datetime
    last_seen: datetime
    is_online: bool = False


# You'll also need to update your LeaderboardEntry class:
@dataclass
class LeaderboardEntry:
    username: str
    wins: int
    games_played: int


@dataclass
class GameHistory:
    """Represents a single game history entry"""

    winner_id: str
    players: List[str]  # List of user IDs


class DatabaseManager:
    """Handles all database operations"""

    def __init__(self, db_path: str = "game_database.db"):
        self.db_path = db_path

    async def initialize_database(self):
        """Create database tables if they don't exist"""
        async with aiosqlite.connect(self.db_path) as db:
            # Users table
            _ = await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    wins INTEGER DEFAULT 0,
                    games_played INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            await db.commit()

    async def get_user_by_username(
        self, username: str
    ) -> Optional[User]:
        """Get user by username from database"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT id, username, created_at, last_seen FROM users WHERE username = ?",
                (username,),
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return User(
                        id=row[0],
                        username=row[1],
                        created_at=datetime.fromisoformat(
                            row[2]
                        ),
                        last_seen=datetime.fromisoformat(
                            row[3]
                        ),
                    )
                return None

    async def create_user(self, username: str) -> User:
        """Create a new user in the database"""
        user_id = str(uuid.uuid4())
        now = datetime.now()

        async with aiosqlite.connect(self.db_path) as db:
            _ = await db.execute(
                "INSERT INTO users (id, username, created_at, last_seen) VALUES (?, ?, ?, ?)",
                (
                    user_id,
                    username,
                    now.isoformat(),
                    now.isoformat(),
                ),
            )
            await db.commit()

        return User(
            id=user_id,
            username=username,
            created_at=now,
            last_seen=now,
        )

    async def update_last_seen(self, user_id: str):
        """Update user's last seen timestamp"""
        now = datetime.now()
        async with aiosqlite.connect(self.db_path) as db:
            _ = await db.execute(
                "UPDATE users SET last_seen = ? WHERE id = ?",
                (now.isoformat(), user_id),
            )
            await db.commit()

    async def save_game_result(self, game: GameHistory):
        """Save game result to history"""
        async with aiosqlite.connect(self.db_path) as db:
            # Update winner's wins
            await db.execute(
                "UPDATE users SET wins = wins + 1 WHERE id = ?",
                (game.winner_id,),
            )

            # Update games_played for all players
            placeholders = ",".join("?" * len(game.players))
            await db.execute(
                f"UPDATE users SET games_played = games_played + 1 WHERE id IN ({placeholders})",
                game.players,
            )
            await db.commit()

    async def get_leaderboard(
        self,
    ) -> List[LeaderboardEntry]:
        """Get leaderboard sorted by wins"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("""
                SELECT username, wins, games_played FROM users WHERE games_played <> 0 
                ORDER BY wins DESC, games_played, username LIMIT 20
            """) as cursor:
                rows = await cursor.fetchall()
                return [
                    LeaderboardEntry(
                        username=row[0],
                        wins=row[1],
                        games_played=row[2],
                    )
                    for row in rows
                ]


class UserSessionManager:
    """Manages user sessions and online status"""

    def __init__(self):
        self.online_users: Dict[
            str, User
        ] = {}  # user_id -> User
        self.username_to_id: Dict[
            str, str
        ] = {}  # username -> user_id
        self.user_connections: Dict[
            str, object
        ] = {}  # user_id -> websocket connection
        self.db_manager = DatabaseManager()

    async def initialize(self):
        """Initialize the session manager"""
        await self.db_manager.initialize_database()

    def is_username_online(self, username: str) -> bool:
        """Check if a username is currently online"""
        return username in self.username_to_id

    def get_online_users(self) -> List[User]:
        """Get list of all online users"""
        return list(self.online_users.values())

    def get_online_count(self) -> int:
        """Get count of online users"""
        return len(self.online_users)

    def get_user_by_id(
        self, user_id: str
    ) -> Optional[User]:
        """Get online user by ID"""
        return self.online_users.get(user_id)

    def get_user_by_username(
        self, username: str
    ) -> Optional[User]:
        """Get online user by username"""
        user_id = self.username_to_id.get(username)
        if user_id:
            return self.online_users.get(user_id)
        return None

    async def authenticate_user(
        self, username: str, websocket
    ) -> tuple[bool, str, Optional[User]]:
        """
        Authenticate user and handle username logic
        Returns: (success, message, user_object)
        """
        # Validate username
        if not username or len(username.strip()) == 0:
            return False, "Username cannot be empty", None

        username = username.strip()
        if len(username) > 20:
            return (
                False,
                "Username too long (max 20 characters)",
                None,
            )

        # Check if username is already online
        if self.is_username_online(username):
            return (
                False,
                "This username exists and is online, choose another username",
                None,
            )

        # Check if too many users are online (max 8)
        if self.get_online_count() >= 8:
            return (
                False,
                "Room is full (maximum 8 players)",
                None,
            )

        # Check if user exists in database
        existing_user = (
            await self.db_manager.get_user_by_username(
                username
            )
        )

        if existing_user:
            # User exists in database, use existing user
            user = existing_user
            user.is_online = True
        else:
            # Create new user
            user = await self.db_manager.create_user(
                username
            )
            user.is_online = True

        # Add to online sessions
        self.online_users[user.id] = user
        self.username_to_id[username] = user.id
        self.user_connections[user.id] = websocket

        # Update last seen
        await self.db_manager.update_last_seen(user.id)

        return True, "Successfully joined the game", user

    async def disconnect_user(self, user_id: str):
        """Handle user disconnection"""
        user = self.online_users.get(user_id)
        if user:
            # Update last seen in database
            await self.db_manager.update_last_seen(user_id)

            # Remove from online sessions
            del self.online_users[user_id]
            del self.username_to_id[user.username]
            if user_id in self.user_connections:
                del self.user_connections[user_id]

    def get_user_connection(self, user_id: str):
        """Get websocket connection for user"""
        return self.user_connections.get(user_id)

    def get_all_connections(self) -> List[object]:
        """Get all active websocket connections"""
        return list(self.user_connections.values())


class HostManager:
    """Manages host selection and privileges"""

    def __init__(self, session_manager: UserSessionManager):
        self.session_manager = session_manager
        self.current_host_id: Optional[str] = None

    def get_host(self) -> Optional[User]:
        """Get current host user"""
        if self.current_host_id:
            return self.session_manager.get_user_by_id(
                self.current_host_id
            )
        return None

    def is_host(self, user_id: str) -> bool:
        """Check if user is the host"""
        return self.current_host_id == user_id

    def set_host(self, user_id: str) -> bool:
        """Set a user as host"""
        user = self.session_manager.get_user_by_id(user_id)
        if user:
            self.current_host_id = user_id
            return True
        return False

    def select_new_host(self) -> Optional[User]:
        """Select a new host when current host disconnects"""
        online_users = (
            self.session_manager.get_online_users()
        )

        if not online_users:
            self.current_host_id = None
            return None

        # Select random user as new host
        new_host = random.choice(online_users)
        self.current_host_id = new_host.id
        return new_host

    def handle_host_disconnect(
        self, disconnected_user_id: str
    ) -> Optional[User]:
        """Handle when host disconnects"""
        if self.current_host_id == disconnected_user_id:
            return self.select_new_host()
        return None

    def ensure_host_exists(self) -> Optional[User]:
        """Ensure there's always a host when users are online"""
        if (
            not self.current_host_id
            or not self.session_manager.get_user_by_id(
                self.current_host_id
            )
        ):
            return self.select_new_host()
        return self.get_host()


# Singleton instances for global access
user_session_manager = UserSessionManager()
host_manager = HostManager(user_session_manager)


async def initialize_user_system():
    """Initialize the entire user management system"""
    await user_session_manager.initialize()


# Utility functions for easy access
async def authenticate_user(
    username: str, websocket
) -> tuple[bool, str, Optional[User]]:
    """Wrapper function for user authentication"""
    return await user_session_manager.authenticate_user(
        username, websocket
    )


async def disconnect_user(user_id: str) -> Optional[User]:
    """Wrapper function for user disconnection with host management"""
    await user_session_manager.disconnect_user(user_id)

    # Determine if the host actually changed due to this disconnection.
    # host_manager.handle_host_disconnect will return a new host **only** if the
    # disconnected user was the host. For all other cases we propagate `None`
    # so the server will not broadcast an unnecessary HOST_CHANGED event that
    # shows the same host twice.
    new_host = host_manager.handle_host_disconnect(user_id)

    return new_host


def get_online_users() -> List[User]:
    """Get all online users"""
    return user_session_manager.get_online_users()


def get_host() -> Optional[User]:
    """Get current host"""
    return host_manager.get_host()


def is_host(user_id: str) -> bool:
    """Check if user is host"""
    return host_manager.is_host(user_id)


def get_user_connection(user_id: str):
    """Get websocket connection for user"""
    return user_session_manager.get_user_connection(user_id)


def get_all_connections() -> List[object]:
    """Get all websocket connections"""
    return user_session_manager.get_all_connections()