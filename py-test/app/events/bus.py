from collections import defaultdict
from typing import Callable

from .event import Event
from .types import EventType


class EventBus:
    def __init__(self):
        self._handlers = defaultdict(list)

    def subscribe(
        self,
        event_type: EventType,
        handler: Callable[[Event], None]
    ):
        self._handlers[event_type].append(handler)

    def publish(self, event: Event):
        handlers = self._handlers.get(event.type, [])

        for handler in handlers:
            handler(event)