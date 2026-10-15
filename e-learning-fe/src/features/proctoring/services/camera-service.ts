export async function requestCameraStream(): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error("Camera access is not supported by this browser.");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      width: {
        ideal: 640,
      },
      height: {
        ideal: 480,
      },
      facingMode: "user",
    },
    audio: false,
  });
}

export function stopCameraStream(stream: MediaStream | null) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}
