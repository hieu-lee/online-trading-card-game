"""
AI Bot Management for Online Card Game

This module provides tools to control AI-driven players that use
OpenAI's Responses API with structured output enforced via Pydantic.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Literal, Any, Callable, Coroutine

from openai import AsyncOpenAI
from pydantic import BaseModel, Field, model_validator

from user_manager import User


logger = logging.getLogger(__name__)


class BotDecision(BaseModel):
    """Structured decision returned by the LLM."""

    action: Literal["call_hand", "call_bluff"]
    hand_spec: Optional[str] = Field(
        default=None,
        description="Hand specification required when action is call_hand.",
    )

    @model_validator(mode="after")
    def _check_hand_spec(self) -> "BotDecision":
        if self.action == "call_hand" and not self.hand_spec:
            raise ValueError(
                "hand_spec must be provided when action is call_hand"
            )
        if self.action == "call_bluff":
            # Ensure hand_spec is not accidentally set
            object.__setattr__(self, "hand_spec", None)
        return self


BOT_DECISION_SCHEMA: Dict[str, Any] = {
    "name": "bot_decision",
    "strict": True,
    "schema": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        **BotDecision.model_json_schema(),
    },
}

RULES_TEXT: str = ""
RULES_PATH = Path(__file__).resolve().parent / "RULE.md"
try:
    RULES_TEXT = RULES_PATH.read_text(encoding="utf-8")
except FileNotFoundError:
    logger.warning("RULE.md not found for AI system prompt generation.")


def _build_system_prompt() -> str:
    """Compose the system prompt including rules and format guidance."""
    schema_preview = json.dumps(
        BOT_DECISION_SCHEMA["schema"], indent=2
    )
    rules = RULES_TEXT or "Rules unavailable. Assume standard gameplay rules."
    return (
        "You are an autonomous player in the bluff-based poker hand game. "
        "Follow the complete game rules and only respond with JSON that "
        "matches the provided schema.\n\n"
        "=== Game Rules ===\n"
        f"{rules}\n\n"
        "=== Response Schema ===\n"
        f"{schema_preview}\n\n"
        "Always provide legal moves that respect the rules and previously "
        "called hands. Never explain your reasoning outside the JSON."
    )


SYSTEM_PROMPT = _build_system_prompt()


def _format_prompt(context: Dict[str, Any]) -> str:
    """Format the user prompt supplied to the LLM."""
    players_summary = [
        {
            "username": player["username"],
            "card_count": player["card_count"],
            "losses": player["losses"],
            "is_eliminated": player["is_eliminated"],
        }
        for player in context.get("players", [])
    ]
    history = context.get("hand_history", [])
    history_lines = (
        [
            {
                "order": idx + 1,
                "player": entry["username"],
                "hand": entry["hand"],
            }
            for idx, entry in enumerate(history)
        ]
        if history
        else []
    )
    next_player = context.get("next_player", {})

    prompt_payload = {
        "round_number": context.get("round_number"),
        "current_bot": context.get("current_player", {}),
        "next_player": next_player,
        "players_card_counts": players_summary,
        "hand_history_this_round": history_lines,
        "requirements": [
            "You must either call a higher poker hand than the latest call "
            "or call bluff.",
            "Return JSON only. No explanations.",
            "When calling a hand, the hand_spec must match the game's required "
            "format for that hand type.",
        ],
    }

    return (
        "You are playing your turn in the described card game. "
        "Use the context JSON to decide.\n"
        f"{json.dumps(prompt_payload, indent=2)}"
    )


class AIBotController:
    """Controls a single AI bot player."""

    def __init__(
        self,
        user: User,
        model: Optional[str] = None,
        *,
        client: Optional[AsyncOpenAI] = None,
    ):
        self.user = user
        self._client = client or AsyncOpenAI()
        self._model = model or os.getenv(
            "OPENAI_BOT_MODEL", "gpt-4o-mini"
        )
        self._lock = asyncio.Lock()
        self._last_state_key: Optional[str] = None
        self._active_round: Optional[int] = None

    def reset_round(self, round_number: int):
        """Reset cached state for a new round."""
        self._active_round = round_number
        self._last_state_key = None

    def _state_signature(self, context: Dict[str, Any]) -> str:
        """Create a signature to debounce duplicate LLM calls."""
        hand_history_count = len(context.get("hand_history", []))
        phase = context.get("phase")
        return f"{context.get('round_number')}:{hand_history_count}:{phase}"

    def _should_act(self, context: Dict[str, Any]) -> bool:
        """Determine if the bot should act given the context."""
        current_player = context.get("current_player")
        if not current_player:
            return False
        if current_player.get("user_id") != self.user.id:
            return False
        if context.get("phase") != "calling":
            return False
        return True

    async def maybe_decide(
        self, context: Dict[str, Any]
    ) -> Optional[BotDecision]:
        """Run the LLM if needed and return the decision."""
        if not self._should_act(context):
            return None

        round_number = context.get("round_number")
        if round_number is not None and round_number != self._active_round:
            self.reset_round(round_number)

        async with self._lock:
            state_key = self._state_signature(context)
            if state_key == self._last_state_key:
                return None

            try:
                decision = await self._invoke_llm(context)
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Bot %s failed to get decision: %s",
                    self.user.username,
                    exc,
                )
                return None

            self._last_state_key = state_key
            return decision

    async def _invoke_llm(
        self, context: Dict[str, Any]
    ) -> BotDecision:
        """Call the OpenAI Responses API and parse the output."""
        user_prompt = _format_prompt(context)
        logger.debug(
            "Bot %s querying model %s with prompt: %s",
            self.user.username,
            self._model,
            user_prompt,
        )
        response = await self._client.responses.create(
            model=self._model,
            instructions=SYSTEM_PROMPT,
            input=user_prompt,
            response_format={
                "type": "json_schema",
                "json_schema": BOT_DECISION_SCHEMA,
            },
            temperature=0.7,
        )
        output_text = response.output_text
        decision = BotDecision.model_validate_json(output_text)
        logger.info(
            "Bot %s decided to %s",
            self.user.username,
            decision.action,
        )
        return decision


CallHandFn = Callable[[str, Dict[str, Any]], Coroutine[Any, Any, Any]]
CallBluffFn = Callable[[str], Coroutine[Any, Any, Any]]


@dataclass
class BotProfile:
    """Stores the metadata and controller for a bot."""

    user: User
    controller: AIBotController


class AIBotManager:
    """Manages all AI bots for the server."""

    def __init__(
        self,
        *,
        call_hand_fn: CallHandFn,
        call_bluff_fn: CallBluffFn,
    ):
        self._bots: Dict[str, BotProfile] = {}
        self._call_hand = call_hand_fn
        self._call_bluff = call_bluff_fn
        self._active_tasks: Dict[str, asyncio.Task] = {}

    def list_bots(self) -> Dict[str, BotProfile]:
        """Return all registered bots."""
        return self._bots

    def get_bot(self, bot_id: str) -> Optional[BotProfile]:
        """Return a bot profile by user ID."""
        return self._bots.get(bot_id)

    def _generate_unique_name(
        self, preferred_name: Optional[str], existing_names: set[str]
    ) -> str:
        base = (preferred_name or "Bot").strip() or "Bot"
        if base not in existing_names:
            return base
        suffix = 2
        while True:
            candidate = f"{base} {suffix}"
            if candidate not in existing_names:
                return candidate
            suffix += 1

    def _current_names(self) -> set[str]:
        return {profile.user.username for profile in self._bots.values()}

    def register_bot(
        self,
        *,
        desired_name: Optional[str],
        existing_usernames: set[str],
    ) -> User:
        """Create a bot user and register its controller."""
        username = self._generate_unique_name(
            desired_name, existing_usernames | self._current_names()
        )
        now = datetime.now()
        user = User(
            id=str(uuid.uuid4()),
            username=username,
            created_at=now,
            last_seen=now,
            is_online=True,
        )
        controller = AIBotController(user=user)
        self._bots[user.id] = BotProfile(user=user, controller=controller)
        logger.info("Registered bot %s (%s)", username, user.id)
        return user

    def unregister_bot(self, bot_id: str):
        """Remove bot from management."""
        profile = self._bots.pop(bot_id, None)
        if profile:
            if bot_id in self._active_tasks:
                task = self._active_tasks.pop(bot_id)
                task.cancel()
            logger.info(
                "Removed bot %s (%s)",
                profile.user.username,
                profile.user.id,
            )

    def reset_bot_round(self, bot_id: str, round_number: int):
        """Reset a bot for a new round."""
        profile = self._bots.get(bot_id)
        if profile:
            profile.controller.reset_round(round_number)

    def clear_all_round_caches(self):
        """Reset per-round state for all bots."""
        for profile in self._bots.values():
            profile.controller.reset_round(round_number=0)

    def schedule_turn(
        self, context: Dict[str, Any]
    ):
        """Schedule a bot turn if required by the context."""
        current_player = context.get("current_player")
        if not current_player:
            return
        bot_id = current_player.get("user_id")
        if not bot_id:
            return
        profile = self._bots.get(bot_id)
        if not profile:
            return

        # Avoid overlapping tasks per bot
        existing = self._active_tasks.get(bot_id)
        if existing and not existing.done():
            return

        async def _run_turn():
            try:
                decision = await profile.controller.maybe_decide(context)
                if not decision:
                    return
                if decision.action == "call_hand":
                    await self._call_hand(
                        profile.user.id,
                        {"hand_spec": decision.hand_spec},
                    )
                elif decision.action == "call_bluff":
                    await self._call_bluff(profile.user.id)
            except asyncio.CancelledError:
                pass
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "Bot %s turn execution failed: %s",
                    profile.user.username,
                    exc,
                )

        task = asyncio.create_task(_run_turn())
        self._active_tasks[bot_id] = task
        task.add_done_callback(
            lambda t, identifier=bot_id: self._active_tasks.pop(
                identifier, None
            )
        )
