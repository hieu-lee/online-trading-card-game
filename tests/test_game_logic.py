from datetime import datetime
import uuid

from game_logic import Game, GamePhase
from user_manager import User


def _make_user(username: str) -> User:
    return User(id=str(uuid.uuid4()), username=username, created_at=datetime.now(), last_seen=datetime.now(), is_online=True)


def test_game_start_and_auto_restart():
    game = Game()
    player1 = _make_user("Alice")
    player2 = _make_user("Bob")

    assert game.add_player(player1)
    assert game.add_player(player2)

    assert game.can_start_game()
    assert game.start_game()
    assert game.phase == GamePhase.PLAYING

    # Simulate Bob being eliminated/removed – should trigger game end and restart (waiting)
    game.remove_player(player2.id)

    assert game.phase == GamePhase.WAITING  # auto-restarted
    assert game.round_number == 0 