import pytest
from user_manager import initialize_user_system, authenticate_user, disconnect_user, host_manager


@pytest.mark.asyncio
async def test_host_transfer_on_host_disconnect():
    # Initialize DB and session system (in-memory DB for test)
    await initialize_user_system()

    # User1 joins and becomes host
    success, msg, user1 = await authenticate_user("HostUser", None)
    assert success and user1 is not None
    host_manager.set_host(user1.id)

    # Another user joins
    success, msg, user2 = await authenticate_user("PlayerTwo", None)
    assert success and user2 is not None

    # Disconnect the host
    new_host = await disconnect_user(user1.id)

    # New host should be player2
    assert new_host is not None
    assert new_host.id == user2.id
    assert host_manager.is_host(user2.id) 