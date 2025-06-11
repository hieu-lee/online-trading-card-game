# Online Card Game - Development Tasks

## Original prompt
i want to create an online game with cards (club, spade, heart, diamond thingy). The whole app is a room, max 8 people can use this app at any time (since this game is for max 8 people). The host is the first user who opened this app, if they disconnect the host is randomly selected among the remaining users. If there's no online user then the first online user will be the host. The host can:
-kick user 
-restart game

When new users join, they have to wait if the game is currently being played (so either the game has to be finished, or the host click the restart button for new users to join the game). When open the app, the user just need to give username, if the username existed in the db and is not online, the user will have that username, else add the new username to the db and that user will have that username. If the username existed in the db and that username is online, give an error message "this username existed and is online, choose another username".

The rule of the game will be following:
- each round will start with a player (the first player of the first round will be chosen randomly, then the starting player of the i-th round with i > 1 will be the player to the left of the starting player of the i-1-th round).
- each round we will find a loser
- in the beginning of every round, we shufle the deck and the i-th player will get N cards with N = the number the i-th player lost + 1 (so first round, everyone gets 1 card) after a round, if a player having 5 cards just lost, they are eliminated from the game (if a player starting a round with 5 cards and lose in that round, they are eliminated)
- the game is over if there's only 1 player left, which will be the winner of that game.

In a round we will have the following rules:
- the starting player will call a poker hand H (highcard, pair, 2 pairs, 3 of a kind, straight, flush, full house, 4 of a kind, straight flush, royal flush), which means that the player believes in the set of cards C, which is the set of cards all players are holding, there exists H in C.
from the i-th player with i > 1, they will have 2 options:
    + calling another poker hand that is higher than the poker hand called by i-1-th player (if possible, if we reach royal flush somehow, only option 2 is available)
    + calling bluff
- if the i-th player called a poker hand, we move to the i+1-th player (the player to the left of the previous player)
- if the i-th player called bluff, everyone shows their cards, we will check if the poker hand called by the i-1-th player exists in this set of cards or not. - If it exists, the player i is the loser of the round, else i-1 is the loser and the round ends.


Some specification when calling a poker hand in this game:
- Ace is the highest, 2 is the lowest number
- highcard: you have to specify which card you are calling (highcard Ace, highcard King, highcard 2, etc.)
- a pair: you have to specify the number on the pair you are calling (pair of 2s, pair of 3s, pair of Aces, etc.)
- 2 pairs: you have to specify the 2 numbers on the pairs you are calling (pair of 2s and pair of 3s, pair of Aces and pair of Kings, etc.), of course these 2 numbers have to be different from each other
- 3 of a kind: you have to specify the number of your 3 of a kind (3 of 2s, 3 of 3s, 3 of Aces, etc.)
- straight: you have to specify the starting number of your straight (straight from 2, straight from 3, etc.), noticing that the number has to be lower than or equal to 10, because the highest straight is 10, jack, queen, king, ace - straight from 10, lowest straight starting from 2 (ace can only be in the straight from 10)
- flush: you have to specify the type of your flush (diamond/spade/heart/club) and 5 numbers of your flush (flush of diamond - 2,5,7,king,ace/ flush of spade - 3,4,5,10,jack, etc.)
- full house: you have to specify 2 numbers, the number with 3 cards and the number with 2 cards (3 Jacks 2 10s, 3 10s 2 jacks, 3 kings 2 aces, etc.)
4 of a kind: you have to specify 1 number, the number of your 4 of a kind (4 jacks, 4 kings, 4 aces, 4 2s, etc.)
- straight flush: you have to specify the type of your straight flush (diamond/heart/spade/club) and the starting number of your straight (smaller than or equal to 9, because 10 is royal flush). For example, straight flush diamond from 10/straight flush spade from 3, etc.
- royal flush: you have to specify the type (royal flush diamond, royal flush spade, etc)


Now move to comparison, because the next player has to call a bigger poker hand comparing to the current player, so this is how we compare 2 poker hands H1 and H2. We have the following type of poker hands in order from small to big.
HIGH_CARD
PAIR
TWO_PAIRS
THREE_OF_A_KIND
STRAIGHT
FLUSH
FULL_HOUSE
FOUR_OF_A_KIND
STRAIGHT_FLUSH
ROYAL_FLUSH

if H1.type > H2.type then H1 > H2. Now, if H1.type == H2.type, we will do the following:

if H1.type in {HIGH_CARD, PAIR, THREE_OF_A_KIND, FOUR_OF_A_KIND, STRAIGHT, STRAIGHT_FLUSH}: if H1.number > H2.number then H1 > H2

if H1.type == TWO_PAIRS: if max(H1.firstPairNumber, H1.secondPairNumber) > max(H2.firstPairNumber, H2.secondPairNumber) then H1 > H2

if H1.type == FULL_HOUSE: if (H1.threeOfAKindNumber > H2.threeOfAKindNumber) || (H1.threeOfAKindNumber == H2.threeOfAKindNumber && H1.pairNumber > H2.pairNumber) then H1 > H2

if H1.type == FLUSH: if max(H1.numbers) > max(H2.numbers) then H1 > H2.

I want to focus on the functionality, ignore security as i just want to play with my friends. This game is heavily depends on real time functionality so you should use websocket technologies. I want to create a Python terminal application using websocket.

Create a TASKS.md file to plan and implement this app for me

## Project Overview
A real-time multiplayer card game supporting up to 8 players with poker hand bluffing mechanics, built using Python WebSockets and terminal interface.

## ✅ COMPLETED: Phase 1: Project Setup & Architecture

### ✅ Task 1.1: Project Structure Setup
- [x] Create main project directory structure
- [x] Set up virtual environment
- [x] Create requirements.txt with dependencies:
  - `websockets` (WebSocket server/client)
  - `aiosqlite` (async SQLite database)
  - `pydantic` (data validation)
  - `rich` (enhanced terminal UI)
  - `colorama` (terminal colors)
- [x] Create main modules:
  - `server.py` (WebSocket server)
  - `client.py` (terminal client)
  - `game_logic.py` (game rules and mechanics)
  - `card_system.py` (card deck and poker hands)
  - `user_manager.py` (user authentication and storage)
  - `message_protocol.py` (WebSocket message formats)

### ✅ Task 1.2: Database Schema Design
- [x] Design SQLite database schema for users:
  - `users` table: id, username, created_at, last_seen, is_online
- [x] Create database initialization script
- [x] Implement user CRUD operations

**✅ PHASE 1 COMPLETED SUCCESSFULLY**

**Implementation Summary:**
- **Complete WebSocket architecture** with async server and rich terminal client
- **Full card system** with poker hand detection for all 10 hand types and comparison logic
- **User management** with SQLite database, username validation, and host system
- **Game state management** with round progression, player elimination, and turn logic
- **Real-time messaging** with Pydantic validation and proper JSON serialization
- **Rich terminal UI** with colored cards, real-time updates, and command system

**Technical Issues Resolved:**
1. **JSON Serialization**: Fixed datetime objects not being JSON serializable by adding proper datetime encoding
2. **WebSocket Deprecations**: Updated type hints and removed deprecated parameters  
3. **Terminal UI**: Fixed ANSI escape code issues in card display using Rich markup instead of colorama

**Files Created:**
- `requirements.txt` - Project dependencies
- `message_protocol.py` - WebSocket message types and validation
- `card_system.py` - Complete card system with poker hand logic
- `user_manager.py` - SQLite database and user management
- `game_logic.py` - Game state and round progression
- `server.py` - WebSocket server with connection management
- `client.py` - Rich terminal client with real-time UI
- `README.md` - Complete documentation and usage instructions

**Ready for Phase 2**: Basic multiplayer functionality working with proper card dealing, user management, and terminal interface.

## Phase 2: WebSocket Communication Layer

### Task 2.1: Message Protocol Definition
- [x] Define message types:
  - `USER_JOIN`, `USER_LEAVE`, `USER_KICKED`
  - `GAME_START`, `GAME_END`, `GAME_RESTART`
  - `ROUND_START`, `ROUND_END`
  - `CALL_HAND`, `CALL_BLUFF`, `SHOW_CARDS`
  - `HOST_CHANGED`, `WAITING_FOR_GAME`
- [x] Create message validation using Pydantic models
- [x] Implement message serialization/deserialization

### Task 2.2: WebSocket Server Implementation
- [x] Create WebSocket server class
- [x] Implement connection management (max 8 connections)
- [x] Handle user authentication on connection
- [x] Implement host selection logic
- [x] Create broadcast messaging system
- [x] Handle disconnection and reconnection

### Task 2.3: WebSocket Client Implementation
- [x] Create WebSocket client class
- [x] Implement connection retry logic
- [x] Handle server messages asynchronously
- [x] Create message sending interface

## Phase 3: User Management System

### Task 3.1: Username System
- [x] Implement username validation
- [x] Check username availability (online/offline status)
- [x] Handle username conflicts
- [x] Store user sessions in memory
- [x] Implement user status tracking (online/offline)

### Task 3.2: Host Management
- [x] Implement host selection on first connection
- [x] Handle host transfer when host disconnects
- [x] Implement host privileges (kick, restart)
- [x] Create host status broadcasting

## Phase 4: Card System Implementation

### Task 4.1: Basic Card Structure
- [x] Create Card class (suit, rank)
- [x] Create Deck class with shuffle functionality
- [x] Implement card distribution logic
- [x] Create card display formatting

### Task 4.2: Poker Hand Detection
- [x] Implement poker hand detection algorithms:
  - High Card
  - Pair
  - Two Pairs
  - Three of a Kind
  - Straight
  - Flush
  - Full House
  - Four of a Kind
  - Straight Flush
  - Royal Flush
- [x] Create hand validation from combined cards
- [x] Implement hand specification parsing (e.g., "pair of Aces")

### Task 4.3: Hand Comparison System
- [x] Implement poker hand comparison logic
- [x] Create hand ranking system
- [x] Implement specific comparison rules for each hand type
- [x] Handle edge cases (Ace high/low in straights)

## Phase 5: Game Logic Implementation

### Task 5.1: Game State Management
- [x] Create Game class to track:
  - Players and their card counts
  - Current round state
  - Starting player rotation
  - Game phase (waiting, playing, ended)
- [x] Implement player elimination logic
- [x] Track win/loss conditions

### Task 5.2: Round Logic
- [x] Implement round initialization
- [x] Handle card distribution based on loss count
- [x] Implement turn-based play logic
- [x] Handle poker hand calling
- [x] Implement bluff calling and resolution
- [x] Determine round loser

### Task 5.3: Turn Management
- [x] Implement player turn rotation
- [x] Handle player actions (call hand, call bluff)
- [x] Validate called hands against previous calls
- [ ] Implement action timeouts
- [x] Handle player disconnection during turns

### Task 5.4: Game End Handling
- [ ] On game end:
  - Check waiting list and add as many new players as possible (max 8 total)
  - Reset round count
  - Reset game phase to 'waiting'
  - Empty the hand of all players
  - Broadcast updated game state to all clients (UI refresh)

### Task 5.5: User Join During Active Game
- [x] When a user joins while a game is in progress:
  - Add user to waiting list
  - Send notification message indicating they must wait
  - Only update host UI to reflect waiting list
  - Ensure only host can view waiting list
  - Integrate waiting list processing into game end logic

### Task 5.6: Player Quit During Game
- [x] When a player quits mid-game:
  - If remaining players == 1, end the game and update UI
  - If remaining players > 1, reindex players and continue game
  - Ensure game state consistency across clients

### Task 5.7: Host Quit Handling
- [x] If the host quits:
  - Randomly select a new host among current players
  - Broadcast host change to all clients
  - Update host-specific UI elements

## Phase 6: Testing & Polish

### Task 6.1: Unit Testing
- [x] Test card system and poker hand detection
- [x] Test hand comparison logic
- [x] Test game state transitions
- [x] Test user management functions

### Task 6.2: Integration Testing
- [x] Test multi-client scenarios
- [x] Test host transfer scenarios
- [x] Test game completion flows

### Task 6.3: User Experience
- [x] Add loading indicators
- [x] Improve error messages
- [x] Add game instructions/help
- [x] Optimize terminal display performance

## Phase 7: Documentation & Deployment

### Task 7.1: Documentation
- [x] Create README.md with setup instructions
- [x] Document game rules
- [x] Create troubleshooting guide
- [x] Document message protocol

### Task 7.2: Deployment Preparation
- [ ] Create startup scripts
- [ ] Add configuration options
- [ ] Create simple deployment guide
- [ ] Test on different terminal environments

## Implementation Priority
1. **Phase 1-2**: Core architecture and communication
2. **Phase 3**: User management
3. **Phase 4**: Card system (most complex logic)
4. **Phase 5**: Game logic, waiting list & edge cases
5. **Phase 6**: Testing & polish
6. **Phase 7**: Documentation & deployment

## Key Technical Considerations
- Use `asyncio` for handling multiple WebSocket connections
- Implement proper error handling for network issues
- Use terminal clearing and positioning for dynamic UI updates
- Consider using `threading` for separating UI from network operations
- Implement proper cleanup on client disconnection
- Use JSON for message serialization between client/server

## Estimated Timeline
- **Setup & Architecture**: 1-2 days
- **WebSocket Layer**: 2-3 days
- **Card System**: 3-4 days (complex poker logic)
- **Game Logic**: 3-4 days
- **UI Implementation**: 2-3 days
- **Integration & Testing**: 2-3 days
- **Total**: ~2-3 weeks for full implementation 