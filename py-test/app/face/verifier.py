import cv2
import time
import numpy as np

from insightface.app import FaceAnalysis

REFERENCE_IMAGE = "images/reference/student.jpg"

VERIFICATION_THRESHOLD = 0.65
VERIFICATION_ATTEMPTS = 5
VERIFICATION_INTERVAL = 0.5

CAMERA_WIDTH = 640
CAMERA_HEIGHT = 480


face_app = FaceAnalysis(
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


def get_face_embedding(image):
    faces = face_app.get(image)

    if len(faces) == 0:
        return None

    face = faces[0]
    embedding = face.embedding
    embedding = embedding / np.linalg.norm(embedding)

    return embedding


def compare_faces(embedding1, embedding2):
    return np.dot(
        embedding1,
        embedding2
    )


def verify_face(reference_embedding, frame):
    current_embedding = get_face_embedding(frame)

    if current_embedding is None:
        return None

    score = float(
        compare_faces(
            reference_embedding,
            current_embedding
        )
    )

    return score


reference_image = cv2.imread(
    REFERENCE_IMAGE
)

if reference_image is None:
    print("Cannot load reference image")
    exit()

reference_embedding = get_face_embedding(
    reference_image
)

if reference_embedding is None:
    print("No face found in reference image")
    exit()

print("Reference face loaded")


camera = cv2.VideoCapture(0)

camera.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    CAMERA_WIDTH
)

camera.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    CAMERA_HEIGHT
)

if not camera.isOpened():
    print("Cannot open camera")
    exit()


matches = 0
not_matches = 0
no_face = 0
similarities = []

last_attempt_time = 0.0
attempts = 0


while attempts < VERIFICATION_ATTEMPTS:
    ret, frame = camera.read()

    if not ret:
        print("Cannot read camera frame")
        break

    current_time = time.monotonic()

    if (
        attempts == 0
        or current_time - last_attempt_time
        >= VERIFICATION_INTERVAL
    ):
        last_attempt_time = current_time
        attempts += 1

        score = verify_face(
            reference_embedding,
            frame
        )

        if score is None:
            no_face += 1
            print(
                f"Attempt {attempts}: NO_FACE"
            )
        else:
            score = round(score, 3)
            similarities.append(score)

            if score >= VERIFICATION_THRESHOLD:
                matches += 1
                result = "MATCH"
            else:
                not_matches += 1
                result = "NOT_MATCH"

            print(
                f"Attempt {attempts}: "
                f"{result} ({score})"
            )

    cv2.imshow(
        "Face Verification",
        frame
    )

    cv2.waitKey(1)


camera.release()
cv2.destroyAllWindows()


if matches >= 3:
    final_result = "MATCH"
elif not_matches >= 3:
    final_result = "NOT_MATCH"
elif matches == 0 and not_matches == 0:
    final_result = "NO_FACE"
else:
    final_result = "INCONCLUSIVE"


print()
print("Verification finished")
print(f"Attempts: {attempts}")
print(f"MATCH: {matches}")
print(f"NOT_MATCH: {not_matches}")
print(f"NO_FACE: {no_face}")
print(f"Similarities: {similarities}")
print(f"FINAL RESULT: {final_result}")