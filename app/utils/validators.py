from typing import Set, Dict


class InvalidStateTransitionError(Exception):
    """Raised when an invalid state machine transition is attempted."""
    pass


class BusinessRuleViolationError(Exception):
    """Raised when a business guardrail or safety rule is violated."""
    pass


class CaseNotFoundError(Exception):
    """Raised when a recovery case is not found."""
    pass


VALID_RECOVERY_TRANSITIONS: Dict[str, Set[str]] = {
    "DETECTED": {"ANALYZED", "READY", "APPROVAL_REQUIRED", "IN_PROGRESS", "STOPPED", "ESCALATED"},
    "ANALYZED": {"READY", "APPROVAL_REQUIRED", "IN_PROGRESS", "STOPPED", "ESCALATED"},
    "READY": {"APPROVAL_REQUIRED", "IN_PROGRESS", "FAILED", "STOPPED", "ESCALATED"},
    "APPROVAL_REQUIRED": {"APPROVED", "STOPPED", "ESCALATED"},
    "APPROVED": {"IN_PROGRESS", "STOPPED", "ESCALATED"},
    "IN_PROGRESS": {"RECOVERED", "FAILED", "STOPPED", "ESCALATED"},
    "FAILED": {"IN_PROGRESS", "READY", "STOPPED", "ESCALATED"},
    "STOPPED": set(),    # Terminal state
    "ESCALATED": {"IN_PROGRESS", "STOPPED", "READY"},
    "RECOVERED": set(),  # Strictly terminal. Once recovered, cannot be modified or retried.
}


def validate_state_transition(current_state: str, new_state: str) -> None:
    """
    Ensures that the recovery case state machine only undergoes strictly permitted state transitions.
    """
    if current_state == new_state:
        return

    allowed_targets = VALID_RECOVERY_TRANSITIONS.get(current_state, set())
    if new_state not in allowed_targets:
        raise InvalidStateTransitionError(
            f"Invalid recovery state transition from '{current_state}' to '{new_state}'. "
            f"Allowed transitions: {sorted(list(allowed_targets)) if allowed_targets else 'None (Terminal state)'}"
        )
