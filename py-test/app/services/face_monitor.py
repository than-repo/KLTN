import time

import cv2


MODEL_PATH = "models/face_detection_yunet_2023mar.onnx"

NO_FACE_TIMEOUT = 3.0
MULTIPLE_FACE_TIMEOUT = 3.0


class FaceMonitor:
    def __init__(self):
        self.detector = cv2.FaceDetectorYN.create(
            MODEL_PATH,
            "",
            (320, 320),
            0.9,
            0.3,
            5000,
        )

        self.face_missing_since = None
        self.face_missing = False

        self.multiple_faces_since = None
        self.multiple_faces = False

    def process_frame(self, frame):
        """
        Process one OpenCV frame.

        Returns:
            dict with current detection information
            and an optional event.
        """

        height, width = frame.shape[:2]

        self.detector.setInputSize(
            (width, height)
        )

        _, faces = self.detector.detect(frame)

        face_count = (
            0
            if faces is None
            else len(faces)
        )

        current_time = time.monotonic()

        event = None

        # -----------------------------------------
        # No face
        # -----------------------------------------
        if face_count == 0:
            self.multiple_faces_since = None
            self.multiple_faces = False

            if self.face_missing_since is None:
                self.face_missing_since = current_time

            elif (
                current_time - self.face_missing_since
                >= NO_FACE_TIMEOUT
            ):
                if not self.face_missing:
                    self.face_missing = True

                    event = {
                        "type": "FACE_MISSING",
                        "duration": round(
                            current_time
                            - self.face_missing_since,
                            2,
                        ),
                    }

        # -----------------------------------------
        # Exactly one face
        # -----------------------------------------
        elif face_count == 1:
            self.multiple_faces_since = None
            self.multiple_faces = False

            if self.face_missing:
                self.face_missing = False
                self.face_missing_since = None

                event = {
                    "type": "FACE_RETURNED",
                }

            else:
                self.face_missing_since = None

        # -----------------------------------------
        # Multiple faces
        # -----------------------------------------
        else:
            self.face_missing_since = None
            self.face_missing = False

            if self.multiple_faces_since is None:
                self.multiple_faces_since = current_time

            elif (
                current_time - self.multiple_faces_since
                >= MULTIPLE_FACE_TIMEOUT
            ):
                if not self.multiple_faces:
                    self.multiple_faces = True

                    event = {
                        "type": "MULTIPLE_FACES",
                        "face_count": face_count,
                        "duration": round(
                            current_time
                            - self.multiple_faces_since,
                            2,
                        ),
                    }

        return {
            "face_count": face_count,
            "event": event,
        }

    def reset(self):
        self.face_missing_since = None
        self.face_missing = False

        self.multiple_faces_since = None
        self.multiple_faces = False