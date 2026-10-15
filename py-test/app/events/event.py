from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .types import EventType


@dataclass
class Event:
    type: EventType
    source: str
    data: dict[str, Any] = field(default_factory=dict)
    request_id: str | None = None
    user_id: str | None = None
    session_id: str | None = None
    timestamp: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "source": self.source,
            "requestId": self.request_id,
            "userId": self.user_id,
            "sessionId": self.session_id,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
        }