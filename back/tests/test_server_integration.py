import asyncio
import json
import random
import pytest
import websockets

from message_protocol import MessageType, create_message, parse_message
from server import GameServer


@pytest.mark.asyncio
async def test_multiclient_join_and_waiting_list():
    # Pick random free port in range 8800-8900
    port = random.randint(8800, 8900)

    async def run_server():
        game_server = GameServer(host="localhost", port=port)
        async with websockets.serve(game_server.handle_client, "localhost", port):
            await asyncio.Future()  # run until cancelled

    server_task = asyncio.create_task(run_server())
    await asyncio.sleep(0.1)  # Give server a moment to start

    try:
        # Connect first client (will become host)
        async with websockets.connect(f"ws://localhost:{port}") as ws1:
            join_msg1 = create_message(MessageType.USER_JOIN, {"username": "Alice"})
            await ws1.send(json.dumps(join_msg1))

            # Wait for USER_JOIN response
            while True:
                resp1 = json.loads(await ws1.recv())
                if resp1["type"] == MessageType.USER_JOIN.value and resp1["data"].get("username") == "Alice":
                    assert resp1["data"]["success"] is True
                    assert resp1["data"]["is_host"] is True
                    host_id = resp1["data"]["user_id"]
                    break

            # Second client joins
            async with websockets.connect(f"ws://localhost:{port}") as ws2:
                join_msg2 = create_message(MessageType.USER_JOIN, {"username": "Bob"})
                await ws2.send(json.dumps(join_msg2))

                # Fetch Bob's join response on ws2
                while True:
                    resp2 = json.loads(await ws2.recv())
                    if resp2["type"] == MessageType.USER_JOIN.value and resp2["data"].get("username") == "Bob":
                        assert resp2["data"]["is_host"] is False
                        assert resp2["data"]["success"] is True
                        break

                # Host starts the game
                start_game_msg = create_message(MessageType.GAME_START, {"user_id": host_id})
                await ws1.send(json.dumps(start_game_msg))

                # Wait until GAME_START broadcast received by ws2
                received_game_start = False
                while not received_game_start:
                    broadcast = json.loads(await ws2.recv())
                    if broadcast["type"] == MessageType.GAME_START.value:
                        received_game_start = True

                # Third client attempts to join while game in progress
                async with websockets.connect(f"ws://localhost:{port}") as ws3:
                    join_msg3 = create_message(MessageType.USER_JOIN, {"username": "Charlie"})
                    await ws3.send(json.dumps(join_msg3))

                    waiting_message_received = False
                    while not waiting_message_received:
                        resp3 = json.loads(await ws3.recv())
                        if resp3["type"] == MessageType.USER_JOIN.value:
                            # Should indicate not joined the game
                            assert resp3["data"]["game_joined"] is False
                        if resp3["type"] == MessageType.WAITING_FOR_GAME.value:
                            waiting_message_received = True

    finally:
        server_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await server_task


# ---------------------------------------------------------------------------
# Additional integration tests for tasks 5.4‒5.7
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_host_quit_transfers_host_and_broadcasts():
    """Simulate host disconnecting and ensure HOST_CHANGED broadcast is sent."""
    port = random.randint(8901, 9000)

    async def run_server():
        gs = GameServer(host="localhost", port=port)
        async with websockets.serve(gs.handle_client, "localhost", port):
            await asyncio.Future()

    server_task = asyncio.create_task(run_server())
    await asyncio.sleep(0.1)

    try:
        async with websockets.connect(f"ws://localhost:{port}") as host_ws:
            # Host joins
            await host_ws.send(json.dumps(create_message(MessageType.USER_JOIN, {"username": "Host"})))

            # Capture host id
            while True:
                msg = json.loads(await host_ws.recv())
                if msg["type"] == MessageType.USER_JOIN.value:
                    host_id = msg["data"]["user_id"]
                    break

            # Second user joins
            async with websockets.connect(f"ws://localhost:{port}") as player_ws:
                await player_ws.send(json.dumps(create_message(MessageType.USER_JOIN, {"username": "Player"})))

                # Consume join response on player_ws (not used)
                await player_ws.recv()

                # Host disconnects
                await host_ws.close()

                # Player should receive HOST_CHANGED broadcast
                changed = False
                async def wait_change():
                    nonlocal changed
                    while not changed:
                        msg = json.loads(await player_ws.recv())
                        if msg["type"] == MessageType.HOST_CHANGED.value:
                            changed = True

                await asyncio.wait_for(wait_change(), timeout=5)
                assert changed is True

    finally:
        server_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await server_task


@pytest.mark.asyncio
async def test_waiting_player_enters_game_after_end():
    """Player who joined during an ongoing game should be moved in after it ends."""
    port = random.randint(9001, 9100)

    async def run_server():
        gs = GameServer(host="localhost", port=port)
        async with websockets.serve(gs.handle_client, "localhost", port):
            await asyncio.Future()

    server_task = asyncio.create_task(run_server())
    await asyncio.sleep(0.1)

    try:
        # Host and opponent join
        async with websockets.connect(f"ws://localhost:{port}") as host_ws:
            await host_ws.send(json.dumps(create_message(MessageType.USER_JOIN, {"username": "HostA"})))
            host_id = None
            while host_id is None:
                m = json.loads(await host_ws.recv())
                if m["type"] == MessageType.USER_JOIN.value:
                    host_id = m["data"]["user_id"]

            async with websockets.connect(f"ws://localhost:{port}") as opp_ws:
                await opp_ws.send(json.dumps(create_message(MessageType.USER_JOIN, {"username": "OppB"})))
                await opp_ws.recv()  # consume response

                # Start game
                await host_ws.send(json.dumps(create_message(MessageType.GAME_START, {"user_id": host_id})))

                # Wait for GAME_START to reach opponent
                while True:
                    ms = json.loads(await opp_ws.recv())
                    if ms["type"] == MessageType.GAME_START.value:
                        break

                # Third player joins late (outside additional context so we can keep it open)
                late_ws = await websockets.connect(f"ws://localhost:{port}")
                await late_ws.send(json.dumps(create_message(MessageType.USER_JOIN, {"username": "LateC"})))

                waiting_ok = False
                while not waiting_ok:
                    lm = json.loads(await late_ws.recv())
                    if lm["type"] == MessageType.WAITING_FOR_GAME.value:
                        waiting_ok = True

                # Now, make opponent disconnect so game ends (only host remains).
                await opp_ws.close()

                # LateC should eventually receive a USER_JOIN response that indicates game_joined True
                joined = False
                async def watch_late():
                    nonlocal joined
                    while not joined:
                        msg = json.loads(await late_ws.recv())
                        if msg["type"] == MessageType.GAME_STATE_UPDATE.value:
                            if msg["data"]["game_state"]["phase"] == "waiting" and msg["data"]["game_state"]["waiting_players_count"] == 0:
                                joined = True

                await asyncio.wait_for(watch_late(), timeout=6)
                assert joined is True

                await late_ws.close()

    finally:
        server_task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await server_task 