# Online Card Game

A real-time multiplayer card game with poker hand bluffing mechanics, built using Python WebSockets and terminal interface.

## Current Status: Phase 5 (Game Logic) In Progress

✅ **Phase 1 - Project Setup & Architecture**
- [x] Project structure setup
- [x] Dependencies configuration
- [x] Message protocol definition
- [x] Card system implementation
- [x] User management with SQLite database
- [x] Game logic foundation
- [x] WebSocket server implementation
- [x] Terminal client implementation

## Features Implemented

### Core Infrastructure
- **WebSocket Communication**: Real-time client-server communication
- **User Management**: Username system with database persistence
- **Host System**: Automatic host selection and privileges
- **Game State Management**: Comprehensive game state tracking
- **Card System**: Complete poker hand detection and comparison

### User Interface
- **Terminal Client**: Rich terminal interface with colored output
- **Real-time Updates**: Live game state synchronization
- **Command System**: Text-based commands for game actions

## Installation

1. **Clone/Download the project**
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Starting the Server
```bash
python server.py
```
The server will start on `ws://localhost:8765` by default.

### Starting the Client
```bash
python client.py
```

### Basic Game Flow

1. **Join Game**: Enter a username when prompted
2. **Host Controls** (first player becomes host):
   - `start` - Start the game (requires 2+ players)
   - `restart` - Restart the game
   - `kick <username>` - Kick a player
3. **Player Actions** (during your turn):
   - `call <hand>` - Call a poker hand (not fully implemented yet)
   - `bluff` - Call bluff on previous hand
4. **General Commands**:
   - `quit` - Leave the game

## Game Rules

### Basic Concepts
- Maximum 8 players per game
- Each round, players get cards equal to their losses + 1
- Players call poker hands or call bluff
- Player with 5 losses is eliminated
- Last player standing wins

The game is played in a single shared **room** with a maximum of **8 players**.

• The first user to connect becomes the **host** (they can kick players or restart the game). If the host disconnects, a new host is randomly selected from the remaining players.

• Play is divided into **rounds**.  A round finishes as soon as one player "loses" (see Bluff Resolution below).

• At the start of round *r*, every player is dealt **N = (losses + 1)** face-down cards, where *losses* is the number of rounds that player has previously lost.  In round 1 everyone has exactly one card; each subsequent loss permanently increases the cards you receive by one.

• If a player ever ends a round holding **5 cards**, they are **eliminated** from the game.

• The game ends when only **one player remains** – that player is the winner.

### Round Flow
1. **Choose starting player** – In round 1 a random player starts. In later rounds it is the player to the immediate left of the previous starting player.
2. The starting player **calls a poker hand** that they claim exists somewhere in the combined set of all players' cards (e.g. "pair of Aces", "straight flush hearts from 9").
3. Moving clockwise, each subsequent player must either:
   a. **Call a higher-ranking hand** than the last call, **or**
   b. **Call "bluff"** on the previous player.
4. If a new hand is called, the turn passes along and step 3 repeats.
5. If "bluff" is called, everyone reveals their cards:
   • If the previously-called hand **is present**, the accuser (the player who called bluff) **loses** the round.
   • If the hand **is not present**, the player who made the false claim **loses** the round.

### Actions During Your Turn
• `call <hand>` – Announce a poker hand that outranks the current call.
• `bluff` – Challenge the validity of the previous call.

### Consequences of Losing a Round
The loser gains **one additional loss** (meaning they will be dealt one extra card in all future rounds).  When a player's card count reaches five they are removed from the game immediately.

### Winning the Game
Rounds continue in this fashion until a single player is left standing, at which point they are declared the winner.

### Poker Hands (Low to High)
1. High Card
2. Pair
3. Two Pairs
4. Three of a Kind
5. Straight
6. Flush
7. Full House
8. Four of a Kind
9. Straight Flush
10. Royal Flush

## Project Structure

```
online card game/
├── requirements.txt         # Python dependencies
├── TASKS.md                # Development roadmap
├── README.md               # This file
├── message_protocol.py     # WebSocket message definitions
├── card_system.py          # Card, deck, and poker hand logic
├── user_manager.py         # User authentication and database
├── game_logic.py           # Game state and round management
├── server.py               # WebSocket server
├── client.py               # Terminal client
└── game_database.db        # SQLite database (created automatically)
```

## Technical Details

### Dependencies
- `websockets` - WebSocket server/client
- `aiosqlite` - Async SQLite database operations
- `pydantic` - Data validation and serialization
- `colorama` - Cross-platform colored terminal text
- `rich` - Enhanced terminal UI components

### Architecture
- **Async/Await**: Full async implementation for concurrent operations
- **WebSocket Protocol**: JSON-based message communication
- **SQLite Database**: Persistent user storage
- **Real-time Sync**: Immediate state updates across all clients
