import pytest
from src.dispatcher.state_machine import (
    DispatcherState, StateMachine, InvalidTransitionError
)

def test_initial_state_is_idle():
    sm = StateMachine()
    assert sm.current_state == DispatcherState.IDLE

def test_idle_to_building_outline():
    sm = StateMachine()
    sm.transition(DispatcherState.BUILDING_OUTLINE)
    assert sm.current_state == DispatcherState.BUILDING_OUTLINE

def test_building_to_awaiting_outline_confirm():
    sm = StateMachine()
    sm.transition(DispatcherState.BUILDING_OUTLINE)
    sm.transition(DispatcherState.AWAITING_OUTLINE_CONFIRM)
    assert sm.current_state == DispatcherState.AWAITING_OUTLINE_CONFIRM

def test_first_confirm_to_writing_chapter():
    sm = StateMachine()
    sm.transition(DispatcherState.BUILDING_OUTLINE)
    sm.transition(DispatcherState.AWAITING_OUTLINE_CONFIRM)
    sm.transition(DispatcherState.WRITING_CHAPTER)
    assert sm.current_state == DispatcherState.WRITING_CHAPTER

def test_writing_to_awaiting_chapter_confirm():
    sm = StateMachine()
    sm.transition(DispatcherState.BUILDING_OUTLINE)
    sm.transition(DispatcherState.AWAITING_OUTLINE_CONFIRM)
    sm.transition(DispatcherState.WRITING_CHAPTER)
    sm.transition(DispatcherState.AWAITING_CHAPTER_CONFIRM)
    assert sm.current_state == DispatcherState.AWAITING_CHAPTER_CONFIRM

def test_confirm_triggers_supplementing():
    sm = StateMachine()
    sm.force_state(DispatcherState.AWAITING_CHAPTER_CONFIRM)
    sm.transition(DispatcherState.SUPPLEMENTING)
    assert sm.current_state == DispatcherState.SUPPLEMENTING

def test_supplementing_back_to_writing():
    sm = StateMachine()
    sm.force_state(DispatcherState.SUPPLEMENTING)
    sm.transition(DispatcherState.WRITING_CHAPTER)
    assert sm.current_state == DispatcherState.WRITING_CHAPTER

def test_invalid_transition_raises():
    sm = StateMachine()
    with pytest.raises(InvalidTransitionError):
        sm.transition(DispatcherState.WRITING_CHAPTER)

def test_user_modify_allowed_from_valid_states():
    valid_states = [
        DispatcherState.AWAITING_OUTLINE_CONFIRM,
        DispatcherState.WRITING_CHAPTER,
        DispatcherState.AWAITING_CHAPTER_CONFIRM,
    ]
    for state in valid_states:
        sm = StateMachine()
        sm.force_state(state)
        sm.transition(DispatcherState.USER_MODIFY)

def test_error_allowed_from_active_states():
    for state in [DispatcherState.BUILDING_OUTLINE, DispatcherState.WRITING_CHAPTER, DispatcherState.SUPPLEMENTING]:
        sm = StateMachine()
        sm.force_state(state)
        sm.transition(DispatcherState.ERROR)

def test_completed_is_terminal():
    sm = StateMachine()
    sm.force_state(DispatcherState.AWAITING_CHAPTER_CONFIRM)
    sm.transition(DispatcherState.SUPPLEMENTING)
    sm.transition(DispatcherState.COMPLETED)
    with pytest.raises(InvalidTransitionError):
        sm.transition(DispatcherState.WRITING_CHAPTER)

def test_can_transition():
    sm = StateMachine()
    assert sm.can_transition(DispatcherState.BUILDING_OUTLINE)
    assert not sm.can_transition(DispatcherState.WRITING_CHAPTER)
