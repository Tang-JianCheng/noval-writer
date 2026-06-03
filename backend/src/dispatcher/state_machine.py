import enum
from datetime import datetime, UTC


class DispatcherState(str, enum.Enum):
    IDLE = "idle"
    BUILDING_OUTLINE = "building_outline"
    AWAITING_OUTLINE_CONFIRM = "awaiting_outline_confirm"
    WRITING_CHAPTER = "writing_chapter"
    AWAITING_CHAPTER_CONFIRM = "awaiting_chapter_confirm"
    SUPPLEMENTING = "supplementing"
    COMPLETED = "completed"
    USER_MODIFY = "user_modify"
    ERROR = "error"


TRANSITIONS: dict[DispatcherState, set[DispatcherState]] = {
    DispatcherState.IDLE: {DispatcherState.BUILDING_OUTLINE},
    DispatcherState.BUILDING_OUTLINE: {
        DispatcherState.AWAITING_OUTLINE_CONFIRM, DispatcherState.ERROR
    },
    DispatcherState.AWAITING_OUTLINE_CONFIRM: {
        DispatcherState.BUILDING_OUTLINE,
        DispatcherState.WRITING_CHAPTER,
        DispatcherState.USER_MODIFY,
    },
    DispatcherState.WRITING_CHAPTER: {
        DispatcherState.AWAITING_CHAPTER_CONFIRM, DispatcherState.ERROR, DispatcherState.USER_MODIFY
    },
    DispatcherState.AWAITING_CHAPTER_CONFIRM: {
        DispatcherState.WRITING_CHAPTER,
        DispatcherState.SUPPLEMENTING,
        DispatcherState.USER_MODIFY,
    },
    DispatcherState.SUPPLEMENTING: {
        DispatcherState.WRITING_CHAPTER,
        DispatcherState.COMPLETED,
        DispatcherState.ERROR,
    },
    DispatcherState.USER_MODIFY: {
        DispatcherState.AWAITING_OUTLINE_CONFIRM,
        DispatcherState.WRITING_CHAPTER,
        DispatcherState.AWAITING_CHAPTER_CONFIRM,
    },
    DispatcherState.ERROR: {
        DispatcherState.BUILDING_OUTLINE,
        DispatcherState.WRITING_CHAPTER,
        DispatcherState.SUPPLEMENTING,
        DispatcherState.IDLE,
    },
    DispatcherState.COMPLETED: set(),
}


class InvalidTransitionError(Exception):
    pass


class StateMachine:
    def __init__(self):
        self.current_state = DispatcherState.IDLE
        self.state_history: list[tuple[DispatcherState, datetime]] = []
        self.error_count: int = 0

    def transition(self, to_state: DispatcherState) -> None:
        valid = TRANSITIONS.get(self.current_state, set())
        if to_state not in valid:
            raise InvalidTransitionError(
                f"Cannot transition from {self.current_state.value} to {to_state.value}"
            )
        self.state_history.append((self.current_state, datetime.now(UTC)))
        self.current_state = to_state

    def force_state(self, state: DispatcherState) -> None:
        """Only for testing — bypass transition validation."""
        self.current_state = state

    def can_transition(self, to_state: DispatcherState) -> bool:
        return to_state in TRANSITIONS.get(self.current_state, set())
