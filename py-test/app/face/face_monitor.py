import cv2
import time

from app.events import Event, EventBus, EventType

MODEL_PATH = "models/face_detection_yunet_2023mar.onnx"

CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480

DETECTION_INTERVAL = 5

NO_FACE_TIMEOUT = 3.0
MULTIPLE_FACE_TIMEOUT = 3.0

MONITOR_DURATION = 60.0


event_bus = EventBus()


def handle_event(event: Event):
    print("EVENT:", event.to_dict())


event_bus.subscribe(
    EventType.FACE_MISSING,
    handle_event
)

event_bus.subscribe(
    EventType.FACE_RETURNED,
    handle_event
)

event_bus.subscribe(
    EventType.MULTIPLE_FACES,
    handle_event
)


class FaceMonitor:
    def __init__(self, duration):
        self.duration = duration
        self.event_bus = event_bus

        self.detector = cv2.FaceDetectorYN.create(
            MODEL_PATH,
            "",
            (320, 320),
            0.9,
            0.3,
            5000
        )

        self.camera = None
        self.frame_count = 0
        self.faces = None
        self.face_missing_since = None
        self.face_missing = False
        self.multiple_faces_since = None
        self.multiple_faces = False
        self.start_time = None
        self.finished = False

    def start(self):
        self.camera = cv2.VideoCapture(0)

        self.camera.set(
            cv2.CAP_PROP_FRAME_WIDTH,
            CAMERA_WIDTH
        )

        self.camera.set(
            cv2.CAP_PROP_FRAME_HEIGHT,
            CAMERA_HEIGHT
        )

        if not self.camera.isOpened():
            print("Cannot open camera")
            return

        self.start_time = time.monotonic()

        while not self.finished:
            ret, frame = self.camera.read()

            if not ret:
                print("Cannot read camera frame")
                break

            self.process_frame(frame)
            self.display(frame)

            cv2.waitKey(1)

            if self.is_finished():
                self.stop()

        self.stop()

    def process_frame(self, frame):
        if self.finished:
            return

        self.frame_count += 1

        if self.frame_count % DETECTION_INTERVAL != 0:
            return

        height, width, _ = frame.shape

        self.detector.setInputSize(
            (width, height)
        )

        _, self.faces = self.detector.detect(frame)

        face_count = (
            0
            if self.faces is None
            else len(self.faces)
        )

        current_time = time.monotonic()

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

                    self.event_bus.publish(
                        Event(
                            type=EventType.FACE_MISSING,
                            source="face_monitoring",
                            data={
                                "duration": round(
                                    current_time
                                    - self.face_missing_since,
                                    2
                                )
                            }
                        )
                    )

        elif face_count == 1:
            self.multiple_faces_since = None
            self.multiple_faces = False

            if self.face_missing:
                self.face_missing = False
                self.face_missing_since = None

                self.event_bus.publish(
                    Event(
                        type=EventType.FACE_RETURNED,
                        source="face_monitoring"
                    )
                )
            else:
                self.face_missing_since = None

        else:
            self.face_missing_since = None
            self.face_missing = False

            if self.multiple_faces_since is None:
                self.multiple_faces_since = current_time

            elif (
                current_time
                - self.multiple_faces_since
                >= MULTIPLE_FACE_TIMEOUT
            ):
                if not self.multiple_faces:
                    self.multiple_faces = True

                    self.event_bus.publish(
                        Event(
                            type=EventType.MULTIPLE_FACES,
                            source="face_monitoring",
                            data={
                                "face_count": face_count,
                                "duration": round(
                                    current_time
                                    - self.multiple_faces_since,
                                    2
                                )
                            }
                        )
                    )

    def is_finished(self):
        if self.start_time is None:
            return False

        return (
            time.monotonic() - self.start_time
            >= self.duration
        )

    def display(self, frame):
        if self.faces is not None:
            for face in self.faces:
                x, y, width, height = (
                    face[:4].astype(int)
                )

                cv2.rectangle(
                    frame,
                    (x, y),
                    (x + width, y + height),
                    (0, 255, 0),
                    2
                )

        elapsed = (
            time.monotonic()
            - self.start_time
        )

        remaining = max(
            0,
            self.duration - elapsed
        )

        if self.face_missing:
            status = "FACE NOT FOUND"
            status_color = (0, 0, 255)

        elif self.face_missing_since is not None:
            missing_elapsed = (
                time.monotonic()
                - self.face_missing_since
            )

            missing_remaining = max(
                0,
                NO_FACE_TIMEOUT
                - missing_elapsed
            )

            status = (
                f"FACE MISSING - "
                f"{missing_remaining:.1f}s"
            )

            status_color = (0, 165, 255)

        elif self.multiple_faces:
            count = (
                len(self.faces)
                if self.faces is not None
                else 2
            )

            status = (
                f"MULTIPLE FACES: {count}"
            )

            status_color = (0, 165, 255)

        elif self.multiple_faces_since is not None:
            multiple_elapsed = (
                time.monotonic()
                - self.multiple_faces_since
            )

            multiple_remaining = max(
                0,
                MULTIPLE_FACE_TIMEOUT
                - multiple_elapsed
            )

            status = (
                f"MULTIPLE FACES - "
                f"{multiple_remaining:.1f}s"
            )

            status_color = (0, 165, 255)

        else:
            status = "FACE OK"
            status_color = (0, 255, 0)

        cv2.putText(
            frame,
            status,
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            status_color,
            2
        )

        cv2.putText(
            frame,
            f"Remaining: {remaining:.1f}s",
            (20, 75),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2
        )

        cv2.imshow(
            "AI Proctor - Face Monitoring",
            frame
        )

    def stop(self):
        if self.finished:
            return

        self.finished = True

        if self.camera is not None:
            self.camera.release()
            self.camera = None

        cv2.destroyAllWindows()

        print(
            f"Face monitoring finished "
            f"after {self.duration:.1f}s"
        )


if __name__ == "__main__":
    monitor = FaceMonitor(
        duration=MONITOR_DURATION
    )

    monitor.start()