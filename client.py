"""
Terminal Client for Online Card Game

This module handles:
- WebSocket client connection
- Terminal user interface
- User input handling
- Real-time game display
"""

import asyncio
import websockets
import json
import sys
import os
from typing import Optional, Dict, List
import threading
import ssl  # Added for SSL context handling

# Attempt to use certifi for an up-to-date CA bundle if available
try:
    import certifi  # type: ignore
except ImportError:  # pragma: no cover – certifi optional
    certifi = None

from colorama import Fore, Back, Style, init
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live

from message_protocol import MessageType, create_message, parse_message
from card_system import Suit, Rank

# Initialize colorama for cross-platform colored terminal text
init(autoreset=True)

# Rich console for enhanced terminal UI
console = Console()

# Enable command history navigation (arrow up/down) on supported terminals
try:
    import readline  # GNU readline or libedit on macOS
except ImportError:
    readline = None

# Mapping abbreviations to full rank names
RANK_ALIASES = {
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


def _normalize_rank(token: str) -> Optional[str]:
    """Return canonical rank word or None if not recognized"""
    token = token.lower().rstrip("s")  # remove plural s
    return RANK_ALIASES.get(token)


def translate_shorthand_to_spec(cmd: str) -> Optional[str]:
    """Convert shorthand user input into canonical hand specification string understood by the server.
    Returns None if unable to translate.
    Examples:
        '2 kings'   -> 'pair of king'
        '3 j'       -> 'three of a kind jack'
        'straight 10' -> 'straight from 10'
        '2 3 2 4'   -> 'two pairs 3 and 4'
    """
    import re

    s = cmd.strip().lower()

    # If already prefixed with 'call ', strip it because outer logic handles
    if s.startswith("call "):
        s = s[5:]

    tokens = s.split()
    if not tokens:
        return None

    # Numeric pattern 2/3/4 etc.
    if tokens[0] in {"2", "3", "4"}:
        if len(tokens) == 2:
            rank_word = _normalize_rank(tokens[1])
            if not rank_word:
                return None
            if tokens[0] == "2":
                return f"pair of {rank_word}"
            elif tokens[0] == "3":
                return f"three of a kind {rank_word}"
            elif tokens[0] == "4":
                return f"four of a kind {rank_word}"
        elif len(tokens) == 4 and tokens[0] == "2" and tokens[2] == "2":
            r1 = _normalize_rank(tokens[1])
            r2 = _normalize_rank(tokens[3])
            if r1 and r2 and r1 != r2:
                return f"two pairs {r1} and {r2}"
        elif len(tokens) == 4 and (
            (tokens[0] == "2" and tokens[2] == "3")
            or (tokens[0] == "3" and tokens[2] == "2")
        ):
            # Full house shorthand
            pair_rank = (
                _normalize_rank(tokens[1])
                if tokens[0] == "2"
                else _normalize_rank(tokens[3])
            )
            three_rank = (
                _normalize_rank(tokens[3])
                if tokens[2] == "3"
                else _normalize_rank(tokens[1])
            )
            if pair_rank and three_rank:
                return f"full house: 3 {three_rank} and 2 {pair_rank}"

    # Handle words-based patterns with abbreviations/plurals corrections
    # Straight shorthand: 'straight 10' or 'straight j'
    m = re.match(r"^straight\s+(\w+)$", s)
    if m:
        rank_word = _normalize_rank(m.group(1))
        if rank_word:
            return f"straight from {rank_word}"

    # Pair / three / four of a kind with abbreviations
    m = re.match(r"^(pair of|pair)\s+(\w+)", s)
    if m:
        rank_word = _normalize_rank(m.group(2))
        if rank_word:
            return f"pair of {rank_word}"

    m = re.match(r"^(three of a kind|3 of a kind|three of|triple)\s+(\w+)", s)
    if m:
        rank_word = _normalize_rank(m.group(2))
        if rank_word:
            return f"three of a kind {rank_word}"

    m = re.match(r"^(four of a kind|4 of a kind|four of|quad)\s+(\w+)", s)
    if m:
        rank_word = _normalize_rank(m.group(2))
        if rank_word:
            return f"four of a kind {rank_word}"

    # Two pairs verbal e.g. 'pair 3 pair 4' not handled; rely on numeric version

    # Already looks like standard spec; let caller prefix 'call'
    keywords = [
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
    if any(s.startswith(k) for k in keywords):
        return s

    return None


# ------- Hand-call Tab-completion (module level) -------
KEYWORDS_COMPLETIONS = [
    "highcard",
    "pair of",
    "two pairs",
    "three of a kind",
    "straight from",
    "flush",
    "royal flush",
    "bluff",
    "quit",
    "clear",
    "help",
]

if readline:
    # Detect if the underlying readline is the BSD libedit shim (macOS default)
    _using_libedit = False
    try:
        _using_libedit = "libedit" in readline.__doc__ or "libedit" in getattr(
            readline, "__file__", ""
        )
    except Exception:
        pass

    # Configure TAB completion for the detected backend without issuing incompatible commands
    if _using_libedit:
        readline.parse_and_bind("bind ^I rl_complete")
    else:  # GNU readline
        readline.parse_and_bind("tab: complete")

    # Ensure normal letters like 'b' remain self-insert to avoid accidental beeps
    if _using_libedit:
        readline.parse_and_bind("bind b self-insert")
    else:
        readline.parse_and_bind('"b": self-insert')

    def _hand_completer(text: str, state: int):
        """Return Tab-completion candidates for poker hand phrases."""
        buf = readline.get_line_buffer().lstrip()
        if buf.lower().startswith("call "):
            buf = buf[5:]
        prefix = buf.lower()

        if state == 0:
            _hand_completer.matches = [p for p in KEYWORDS_COMPLETIONS if p.startswith(prefix.lower())]  # type: ignore

        try:
            return _hand_completer.matches[state]  # type: ignore
        except (AttributeError, IndexError):
            return None

    readline.set_completer(_hand_completer)


class GameClient:
    """Terminal client for the card game"""

    def __init__(self, server_uri: str = None):
        # Determine default server URI – environment variable overrides hard-coded default
        default_uri = os.getenv(
            "CARDGAME_SERVER",
            "ws://localhost:8765",
        )
        self.server_uri = server_uri or default_uri
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.user_id: Optional[str] = None
        self.username: Optional[str] = None
        self.is_host: bool = False
        self.connected: bool = False
        self.game_state: Dict = {}
        self.your_cards: List[Dict] = []
        self.message_log: List[str] = []
        self.input_thread: Optional[threading.Thread] = None
        self.running: bool = False

        # Track latest hand call for each player
        self.player_last_calls: Dict[str, str] = {}

        # Used to skip unnecessary terminal redraws for performance optimisation
        self._last_render_signature: Optional[str] = None

    async def connect_to_server(self):
        """Connect to the WebSocket server"""
        # Retry connection up to 3 times, while displaying a loading spinner
        for attempt in range(3):
            try:
                with console.status(
                    "[bold cyan]Connecting to server...[/bold cyan]", spinner="dots"
                ):
                    # First, try with proper certificate verification using certifi if available
                    ssl_context = None
                    if self.server_uri.startswith("wss://"):
                        try:
                            if certifi:
                                ssl_context = ssl.create_default_context(
                                    cafile=certifi.where()
                                )  # refreshed CA bundle
                            else:
                                ssl_context = ssl.create_default_context()
                        except Exception:
                            # Fallback to default context if creating a custom one fails
                            ssl_context = None

                    try:
                        self.websocket = await websockets.connect(
                            self.server_uri, ssl=ssl_context
                        )
                    except ssl.SSLCertVerificationError:
                        # If verification fails (e.g., self-signed cert), retry without verification so the user doesn't need to tweak anything
                        insecure_context = ssl._create_unverified_context()
                        self.websocket = await websockets.connect(
                            self.server_uri, ssl=insecure_context
                        )

                self.connected = True
                console.print(
                    f"[green]Connected to server at {self.server_uri}[/green]"
                )
                return True
            except Exception as e:
                console.print(f"[red]Connection attempt {attempt+1} failed: {e}[/red]")
                await asyncio.sleep(1)
        console.print(f"[red]Failed to connect after 3 attempts[/red]")
        return False

    async def disconnect(self):
        """Disconnect from the server"""
        self.running = False
        self.connected = False
        if self.websocket:
            await self.websocket.close()

    async def send_message(self, message_type: MessageType, data: Dict):
        """Send message to server"""
        if not self.websocket:
            return

        message = create_message(message_type, data)
        try:
            await self.websocket.send(json.dumps(message))
        except Exception as e:
            console.print(f"[red]Error sending message: {e}[/red]")

    async def join_game(self, username: str) -> bool:
        """Join the game with a username"""
        await self.send_message(MessageType.USER_JOIN, {"username": username})

        # Wait for response
        try:
            response_str = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            response = parse_message(response_str)

            if response.type == MessageType.USER_JOIN:
                data = response.data
                if data.get("success"):
                    self.user_id = data.get("user_id")
                    self.username = data.get("username")
                    self.is_host = data.get("is_host", False)
                    console.print(f"[green]{data.get('message')}[/green]")
                    if self.is_host:
                        console.print(f"[yellow]You are the host![/yellow]")
                    return True
                else:
                    console.print(f"[red]Failed to join: {data.get('message')}[/red]")
                    return False
            elif response.type == MessageType.USERNAME_ERROR:
                console.print(f"[red]{response.data.get('message')}[/red]")
                return False
        except asyncio.TimeoutError:
            console.print("[red]Timeout waiting for server response[/red]")
            return False
        except Exception as e:
            console.print(f"[red]Error joining game: {e}[/red]")
            return False

        return False

    def format_card(self, card: Dict) -> str:
        """Format a card for display"""
        suit_symbols = {
            "♥": "[bold red]♥[/bold red]",
            "♦": "[bold red]♦[/bold red]",
            "♣": "[bold black]♣[/bold black]",
            "♠": "[bold black]♠[/bold black]",
        }

        rank_names = {
            2: "2",
            3: "3",
            4: "4",
            5: "5",
            6: "6",
            7: "7",
            8: "8",
            9: "9",
            10: "10",
            11: "J",
            12: "Q",
            13: "K",
            14: "A",
        }

        suit = card.get("suit", "♠")
        rank = card.get("rank", 2)

        suit_colored = suit_symbols.get(suit, suit)
        rank_str = rank_names.get(rank, str(rank))

        # Create a card-like appearance with background
        return f"[white on blue] {rank_str}{suit_colored} [/white on blue]"

    def format_card_ascii(self, card: Dict) -> List[str]:
        """Return ASCII art lines for a single card"""
        # Map suits and ranks
        rank_names = {
            2: "2",
            3: "3",
            4: "4",
            5: "5",
            6: "6",
            7: "7",
            8: "8",
            9: "9",
            10: "10",
            11: "J",
            12: "Q",
            13: "K",
            14: "A",
        }
        suit = card.get("suit", "♠")
        rank = card.get("rank", 2)
        rank_str = rank_names.get(rank, str(rank))
        # ASCII art template
        top = "┌─────┐"
        second = f"|{rank_str:<2}   |"
        third = f"|  {suit}  |"
        fourth = f"|   {rank_str:>2}|"
        bottom = "└─────┘"
        return [top, second, third, fourth, bottom]

    def format_cards_ascii(self, cards: List[Dict]) -> str:
        """Combine multiple cards into a horizontal ASCII art string"""
        ascii_cards = [self.format_card_ascii(c) for c in cards]
        # Build lines
        lines = []
        for i in range(len(ascii_cards[0])):
            line = " ".join(card[i] for card in ascii_cards)
            lines.append(line)
        return "\n".join(lines)

    def display_game_state(self):
        """Display current game state"""
        # Create a lightweight signature of the state to avoid redundant redraws
        try:
            import json as _json

            state_signature = _json.dumps(
                {
                    "game_state": self.game_state,
                    "your_cards": self.your_cards,
                    "messages": self.message_log[-5:],
                },
                sort_keys=True,
                default=str,
            )
        except Exception:
            # Fallback if serialization fails
            state_signature = (
                str(self.game_state) + str(self.your_cards) + str(self.message_log[-5:])
            )

        if state_signature == self._last_render_signature:
            # No meaningful change – skip redraw to improve performance
            return
        self._last_render_signature = state_signature

        # Preserve any partially typed input so it isn't lost/duplicated when we refresh
        current_input = ""
        if readline:
            try:
                current_input = readline.get_line_buffer()
            except Exception:
                current_input = ""

        console.clear()

        # Header
        console.print("[bold blue]Online Card Game[/bold blue]", justify="center")
        console.print("=" * 60, justify="center")

        # User info
        host_indicator = " (HOST)" if self.is_host else ""
        console.print(f"Username: {self.username}{host_indicator}")
        console.print(f"Connected: {'Yes' if self.connected else 'No'}")
        console.print()

        # Your cards
        if self.your_cards:
            console.print("Your cards:", style="bold")
            ascii_art = self.format_cards_ascii(self.your_cards)
            console.print(ascii_art)
            console.print()

        # Game state
        if self.game_state:
            game_data = self.game_state.get("game_state", {})
            phase = game_data.get("phase", "waiting")
            round_number = game_data.get("round_number", 0)
            current_player_id = game_data.get("current_player_id")
            current_call = game_data.get("current_call")

            console.print(f"Game Phase: {phase.title()}")
            if round_number > 0:
                console.print(f"Round: {round_number}")
            console.print()

            # Players table with latest call and turn indicator
            players = game_data.get("players", [])
            if players:
                table = Table(title="Players")
                table.add_column("Username", style="cyan")
                table.add_column("Cards", justify="center")
                table.add_column("Losses", justify="center")
                table.add_column("Status", style="magenta")
                table.add_column("Last Call", style="green")
                table.add_column("Turn", justify="center")

                for player in players:
                    username = player.get("username", "")
                    card_count = player.get("card_count", 0)
                    losses = player.get("losses", 0)
                    is_eliminated = player.get("is_eliminated", False)
                    user_id = player.get("user_id", "")
                    # Status label
                    status = "Eliminated" if is_eliminated else "Active"
                    # Latest call for this player
                    last_call = self.player_last_calls.get(user_id, "")
                    # Turn indicator only during playing phase
                    turn_indicator = ""
                    if phase == "playing" and user_id == current_player_id:
                        turn_indicator = "→"
                    table.add_row(
                        username,
                        str(card_count),
                        str(losses),
                        status,
                        last_call,
                        turn_indicator,
                    )

                console.print(table)
                console.print()

            # Current call
            if current_call:
                console.print(f"Current call: {current_call.get('hand', 'None')}")
                console.print()

        # Online users
        online_users = self.game_state.get("online_users", [])
        if online_users:
            console.print(
                f"Online users ({len(online_users)}): {', '.join(online_users)}"
            )
            console.print()

        # Waiting players
        waiting_count = self.game_state.get("game_state", {}).get(
            "waiting_players_count", 0
        )
        if waiting_count > 0:
            console.print(f"Waiting players: {waiting_count}")
            console.print()

        # Message log
        if self.message_log:
            console.print("[bold]Recent messages:[/bold]")
            for msg in self.message_log[-5:]:  # Show last 5 messages
                console.print(f"  {msg}")
            console.print()

        # Commands
        self.display_available_commands()

        # Restore any partially typed input
        if current_input:
            try:
                # Use readline to restore the buffer and refresh display (POSIX)
                readline.set_startup_hook(lambda: readline.insert_text(current_input))
                # Trigger redisplay of line buffer
                sys.stdout.write("\r")
                sys.stdout.flush()
                readline.redisplay()
            finally:
                # Remove the startup hook so it only affects this redraw
                readline.set_startup_hook(None)

    def display_available_commands(self):
        """Display available commands based on current state"""
        console.print("[bold]Available commands:[/bold]")

        if self.is_host:
            game_data = self.game_state.get("game_state", {})
            phase = game_data.get("phase", "waiting")

            if phase == "waiting":
                console.print("  start - Start the game")
            console.print("  restart - Restart the game")
            console.print("  kick <username> - Kick a player")

        game_data = self.game_state.get("game_state", {})
        phase = game_data.get("phase", "waiting")
        current_player_id = game_data.get("current_player_id")

        if phase == "playing" and current_player_id == self.user_id:
            console.print("  call <hand_spec> - Call a poker hand")
            console.print("  bluff - Call bluff on previous hand")

        console.print("  quit - Quit the game")
        console.print("  help - Show game instructions")
        console.print()

    async def handle_server_message(self, message_str: str):
        """Handle message from server"""
        try:
            message = parse_message(message_str)

            if message.type == MessageType.GAME_STATE_UPDATE:
                self.game_state = message.data
                # Update per-player last calls mapping
                current_call_info = self.game_state.get("game_state", {}).get(
                    "current_call"
                )
                if current_call_info:
                    pid = current_call_info.get("player_id")
                    hand_str = current_call_info.get("hand")
                    if pid and hand_str:
                        self.player_last_calls[pid] = hand_str
                # Clear last calls if game not in playing phase
                phase_now = self.game_state.get("game_state", {}).get(
                    "phase", "waiting"
                )
                if phase_now != "playing":
                    self.player_last_calls.clear()
                # Clear cached hand when game not in playing phase
                phase = self.game_state.get("game_state", {}).get("phase", "waiting")
                if phase != "playing":
                    self.your_cards = []
                self.display_game_state()

            elif message.type == MessageType.PLAYER_UPDATE:
                self.your_cards = message.data.get("your_cards", [])
                self.display_game_state()

            elif message.type == MessageType.GAME_START:
                self.add_message("Game started!")
                self.display_game_state()

            elif message.type == MessageType.GAME_RESTART:
                self.player_last_calls.clear()
                self.add_message("Game restarted!")
                self.your_cards = []  # Reset visible cards on restart
                self.display_game_state()

            elif message.type == MessageType.HOST_CHANGED:
                new_host = message.data.get("new_host", "")
                host_id = message.data.get("host_id")
                # Update host flag based on host_id
                self.is_host = host_id == self.user_id
                self.add_message(f"New host: {new_host}")
                if self.is_host:
                    self.add_message("You are now the host!")
                self.display_game_state()

            elif message.type == MessageType.USER_KICKED:
                self.add_message(message.data.get("message", "You were kicked"))
                await self.disconnect()

            elif message.type == MessageType.USER_LEAVE:
                username = message.data.get("username", "")
                self.add_message(f"{username} has left the game")
                self.display_game_state()

            elif message.type == MessageType.WAITING_FOR_GAME:
                self.add_message(
                    message.data.get("message", "Please wait for next game")
                )
                self.your_cards = []
                self.display_game_state()

            elif message.type == MessageType.ROUND_START:
                rn = message.data.get("round_number")
                self.player_last_calls.clear()
                self.add_message(f"Round {rn} has started")
                self.display_game_state()

            elif message.type == MessageType.ROUND_END:
                rn = message.data.get("round_number")
                loser = message.data.get("loser_id")
                self.add_message(f"Round {rn} ended. Player {loser} lost")
                self.display_game_state()

            elif message.type == MessageType.SHOW_CARDS:
                self.add_message("Revealing cards to all players")
                self.display_game_state()

            elif message.type == MessageType.CALL_BLUFF:
                self.add_message(message.data.get("message", "Bluff called"))
                self.add_message(message.data.get("previous_round_cards", ""))
                self.display_game_state()

            elif message.type == MessageType.ERROR:
                self.add_message(
                    f"Error: {message.data.get('message', 'Unknown error')}"
                )
                self.display_game_state()

        except Exception as e:
            console.print(f"[red]Error handling server message: {e}[/red]")

    def add_message(self, message: str):
        """Add a message to the log"""
        self.message_log.append(message)
        if len(self.message_log) > 10:
            self.message_log.pop(0)

    async def handle_user_input(self):
        """Handle user input commands"""
        while self.running:
            try:
                # Ensure prompt visible before awaiting input
                self._print_prompt()
                # Pass empty string so input doesn't duplicate the prompt
                command = await asyncio.get_event_loop().run_in_executor(
                    None, input, ""
                )
                # Store in history so arrow up/down works during the session
                if readline and command.strip():
                    readline.add_history(command.strip())
                await self.process_command(command.strip())
            except EOFError:
                break
            except Exception as e:
                console.print(f"[red]Error processing input: {e}[/red]")

    async def process_command(self, command: str):
        """Process user command"""
        if not command:
            return

        parts = command.split()
        cmd = parts[0].lower()

        if cmd == "quit":
            await self.disconnect()
            return

        if cmd == "clear":
            # Clear the console and force a full UI redraw
            console.clear()
            # Reset last render signature so display_game_state doesn't skip redraw
            self._last_render_signature = None
            self.display_game_state()
            return

        if cmd == "start" and self.is_host:
            await self.send_message(MessageType.GAME_START, {"user_id": self.user_id})

        elif cmd == "restart" and self.is_host:
            await self.send_message(MessageType.GAME_RESTART, {"user_id": self.user_id})

        elif cmd == "kick" and self.is_host and len(parts) > 1:
            target_username = parts[1]
            await self.send_message(
                MessageType.KICK_USER,
                {"host_id": self.user_id, "target_username": target_username},
            )

        elif cmd == "call":
            # Send a hand call specification to the server
            if len(parts) < 2:
                console.print("[red]Usage: call <hand_spec>[/red]")
            else:
                # Extract the hand spec after the command
                spec = command[len("call ") :].strip()
                if spec:
                    await self.send_message(
                        MessageType.CALL_HAND,
                        {"user_id": self.user_id, "hand_spec": spec},
                    )
                else:
                    console.print("[red]Usage: call <hand_spec>[/red]")

        elif cmd == "bluff":
            await self.send_message(MessageType.CALL_BLUFF, {"user_id": self.user_id})

        elif cmd == "help":
            self.show_help()

        else:
            # Try to interpret as shorthand poker hand specification
            spec = translate_shorthand_to_spec(command)
            if spec is None:
                # Fallback: treat the entire input as a direct hand specification.
                # Rely on the server-side HandParser for validation so that users can
                # type any format accepted by the server (e.g. "straight flush hearts from 10").
                spec = command
            await self.send_message(
                MessageType.CALL_HAND, {"user_id": self.user_id, "hand_spec": spec}
            )

    def show_help(self):
        """Display game instructions and command reference"""
        console.rule("[bold green]Game Instructions & Help[/bold green]")
        console.print(
            "[bold]Objective:[/bold] Be the last player standing by avoiding five losses."
        )
        console.print(
            "Each round players receive cards equal to their losses + 1. On your turn you must either call a poker hand that you claim to have or call bluff on the previous player."
        )
        console.print()
        console.print(
            "[bold]Poker Hand Rankings (low → high):[/bold] High Card, Pair, Two Pairs, Three of a Kind, Straight, Flush, Full House, Four of a Kind, Straight Flush, Royal Flush"
        )
        console.print()
        console.print("[bold]Common Commands:[/bold]")
        console.print(" • [cyan]start[/cyan] – Start the game (host only)")
        console.print(" • [cyan]restart[/cyan] – Restart the game (host only)")
        console.print(" • [cyan]kick <username>[/cyan] – Remove a player (host only)")
        console.print(
            " • [cyan]call <hand_spec>[/cyan] – Declare a poker hand. You can also just type the hand without the word 'call'. Examples: 'pair of jacks', '3 queens', '2 4 2 9', 'straight 10'."
        )
        console.print(" • [cyan]bluff[/cyan] – Call bluff on the previous declaration")
        console.print(" • [cyan]quit[/cyan] – Leave the game")
        console.print()
        console.print("Type the command and press Enter to execute. Enjoy the game!")
        # After help screen, show prompt again
        self._print_prompt()

    async def message_listener(self):
        """Listen for messages from server"""
        try:
            async for message in self.websocket:
                await self.handle_server_message(message)
        except websockets.exceptions.ConnectionClosed:
            console.print("[yellow]Connection to server lost[/yellow]")
            self.connected = False
        except Exception as e:
            console.print(f"[red]Error in message listener: {e}[/red]")

    async def run(self):
        """Main client loop"""
        # Get username
        console.print("[bold blue]Welcome to Online Card Game![/bold blue]")
        username = console.input("Enter your username: ").strip()

        if not username:
            console.print("[red]Username cannot be empty[/red]")
            return

        # Connect to server
        if not await self.connect_to_server():
            return

        # Join game
        if not await self.join_game(username):
            await self.disconnect()
            return

        self.running = True

        # Start concurrent tasks
        listener_task = asyncio.create_task(self.message_listener())
        input_task = asyncio.create_task(self.handle_user_input())

        # Initial display
        self.display_game_state()

        try:
            # Wait for either task to complete
            done, pending = await asyncio.wait(
                [listener_task, input_task], return_when=asyncio.FIRST_COMPLETED
            )

            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        except KeyboardInterrupt:
            console.print("\n[yellow]Interrupted by user[/yellow]")

        finally:
            await self.disconnect()
            console.print("[green]Goodbye![/green]")

    # ---------- Helper UI Elements ----------
    def _print_prompt(self):
        """Disabled: UI no longer shows command prompt text."""
        return


async def main():
    """Main client entry point"""
    # Allow override via command-line arg: python client.py wss://custom-url
    import sys

    uri_arg = sys.argv[1] if len(sys.argv) > 1 else None
    client = GameClient(server_uri=uri_arg)
    await client.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Client stopped by user[/yellow]")
