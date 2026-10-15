from enum import Enum


class EventType(str, Enum):
    FACE_MISSING = "FACE_MISSING"
    FACE_RETURNED = "FACE_RETURNED"
    MULTIPLE_FACES = "MULTIPLE_FACES"