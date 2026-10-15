import json

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket

from pydantic import BaseModel, Field, field_validator, model_validator


from app.services.face_monitor import FaceMonitor
from app.services.verifier import FaceVerifier
from app.services.embedding import EmbeddingService

app = FastAPI(
    title="E-Learning AI Server",
    version="0.1.0",
)


@app.get("/")
async def root():
    return {
        "service": "ai-server",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
    }


@app.websocket("/ws/proctoring")
async def proctoring_websocket(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket client connected")

    face_monitor = FaceMonitor()
    face_monitor_enabled = False

    face_verifier = None
    verification_requested = False

    await websocket.send_json({
        "type": "connection_ready",
        "message": "Connected to AI server",
    })

    while True:
        try:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                print("WebSocket client disconnected")
                break

            text_data = message.get("text")

            if text_data is not None:
                try:
                    data = json.loads(text_data)

                except json.JSONDecodeError:
                    print("Invalid JSON received")

                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON message",
                    })

                    continue

                print("Received JSON:", data)

                message_type = data.get("type")

                if message_type == "start_face_monitor":
                    face_monitor.reset()
                    face_monitor_enabled = True

                    print("Face monitor started")

                    await websocket.send_json({
                        "type": "face_monitor_started",
                    })

                    continue

                if message_type == "stop_face_monitor":
                    face_monitor_enabled = False
                    face_monitor.reset()

                    print("Face monitor stopped")

                    await websocket.send_json({
                        "type": "face_monitor_stopped",
                    })

                    continue

                if message_type == "verify_face":
                    if face_verifier is None:
                        print("Initializing Face Verifier...")
                        face_verifier = FaceVerifier()

                    verification_requested = True

                    print("Face verification requested")

                    await websocket.send_json({
                        "type": "face_verification_started",
                    })

                    continue

                await websocket.send_json({
                    "type": "ack",
                    "received": data,
                })

                continue

            frame_bytes = message.get("bytes")

            if frame_bytes is not None:
                np_buffer = np.frombuffer(
                    frame_bytes,
                    dtype=np.uint8,
                )

                frame = cv2.imdecode(
                    np_buffer,
                    cv2.IMREAD_COLOR,
                )

                if frame is None:
                    print("Cannot decode camera frame")

                    await websocket.send_json({
                        "type": "frame_error",
                        "message": "Cannot decode JPEG frame",
                    })

                    continue

                height, width = frame.shape[:2]

                if face_monitor_enabled:
                    result = face_monitor.process_frame(frame)

                    event = result["event"]

                    if event is not None:
                        print(
                            "Face monitor event:",
                            event,
                        )

                        await websocket.send_json({
                            "type": "face_monitor_event",
                            "event": event,
                        })

                if verification_requested:
                    verification_requested = False

                    print("Verifying face...")

                    result = face_verifier.verify_frame(frame)

                    print(
                        "Face verification result:",
                        result,
                    )

                    await websocket.send_json({
                        "type": "face_verification_result",
                        "result": result,
                    })

                # print(
                #     f"Received camera frame: "
                #     f"{width}x{height} "
                #     f"({len(frame_bytes)} bytes)"
                # )

                await websocket.send_json({
                    "type": "frame_received",
                    "width": width,
                    "height": height,
                    "bytes": len(frame_bytes),
                })

        except RuntimeError as error:
            if "disconnect message" in str(error):
                print("WebSocket client disconnected")
                break

            raise

        except Exception as error:
            print(
                f"WebSocket error: "
                f"{type(error).__name__}: {error}"
            )
            break

    print("WebSocket connection finished")


# ==================================Embedding==================================
class EmbeddingRequest(BaseModel):
    text: str

_embedding_service: EmbeddingService | None = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service

    if _embedding_service is None:
        _embedding_service = EmbeddingService()

    return _embedding_service


@app.post("/embedding")
def create_embedding(
    request: EmbeddingRequest,
) -> dict[str, int | list[float]]:
    service = get_embedding_service()
    vector: list[float] = service.embed(request.text)

    return {
        "dimensions": len(vector),
        "embedding": vector,
    }


class BatchEmbeddingItem(BaseModel):
    id: str = Field(min_length=1)
    text: str = Field(min_length=1)

    @field_validator("id", "text")
    @classmethod
    def validate_non_empty(cls, value: str) -> str:
        normalized: str = value.strip()

        if not normalized:
            raise ValueError("Value cannot be blank")

        return normalized


class BatchEmbeddingRequest(BaseModel):
    items: list[BatchEmbeddingItem] = Field(
        min_length=1,
        max_length=32,
    )

    @model_validator(mode="after")
    def validate_unique_ids(self) -> "BatchEmbeddingRequest":
        ids: list[str] = [item.id for item in self.items]

        if len(ids) != len(set(ids)):
            raise ValueError("Item IDs must be unique")

        return self


class BatchEmbeddingResult(BaseModel):
    id: str
    dimensions: int
    embedding: list[float]


class BatchEmbeddingResponse(BaseModel):
    items: list[BatchEmbeddingResult]

@app.post("/embeddings", response_model=BatchEmbeddingResponse)
def create_embeddings(
    request: BatchEmbeddingRequest,
) -> BatchEmbeddingResponse:
    service = get_embedding_service()

    texts: list[str] = [item.text for item in request.items]
    vectors: list[list[float]] = service.embed_many(texts)

    return BatchEmbeddingResponse(
        items=[
            BatchEmbeddingResult(
                id=item.id,
                dimensions=len(vector),
                embedding=vector,
            )
            for item, vector in zip(request.items, vectors, strict=True)
        ]
    )