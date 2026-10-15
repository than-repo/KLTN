import cv2
import numpy as np

from insightface.app import FaceAnalysis


REFERENCE_IMAGE = "images/reference/student.jpg"

VERIFICATION_THRESHOLD = 0.65


class FaceVerifier:
    def __init__(self):
        print("Loading Face Verifier...")

        self.app = FaceAnalysis(
            providers=["CPUExecutionProvider"]
        )

        self.app.prepare(
            ctx_id=0,
            det_size=(640, 640),
        )

        self.reference_embedding = (
            self._load_reference_embedding()
        )

        print("Face Verifier ready")

    def _load_reference_embedding(self):
        image = cv2.imread(REFERENCE_IMAGE)

        if image is None:
            raise FileNotFoundError(
                f"Reference image not found: "
                f"{REFERENCE_IMAGE}"
            )

        faces = self.app.get(image)

        if len(faces) == 0:
            raise RuntimeError(
                "No face found in reference image."
            )

        if len(faces) > 1:
            raise RuntimeError(
                "Multiple faces found in reference image."
            )

        embedding = faces[0].embedding

        return self._normalize_embedding(
            embedding
        )

    def _normalize_embedding(
        self,
        embedding: np.ndarray,
    ):
        norm = np.linalg.norm(embedding)

        if norm == 0:
            raise RuntimeError(
                "Invalid face embedding."
            )

        return embedding / norm

    def verify_frame(self, frame):
        """
        Verify one OpenCV frame against the
        registered reference image.

        Returns:
            {
                "status": "MATCH" | "NOT_MATCH" | "NO_FACE",
                "similarity": float | None
            }
        """

        faces = self.app.get(frame)

        if len(faces) == 0:
            return {
                "status": "NO_FACE",
                "similarity": None,
            }

        # For identity verification we require
        # exactly one person in the frame.
        if len(faces) > 1:
            return {
                "status": "MULTIPLE_FACES",
                "similarity": None,
            }

        current_embedding = (
            self._normalize_embedding(
                faces[0].embedding
            )
        )

        similarity = float(
            np.dot(
                self.reference_embedding,
                current_embedding,
            )
        )

        similarity = round(
            similarity,
            4,
        )

        if similarity >= VERIFICATION_THRESHOLD:
            status = "MATCH"
        else:
            status = "NOT_MATCH"

        return {
            "status": status,
            "similarity": similarity,
        }