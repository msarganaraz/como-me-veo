export async function initCamera(videoEl) {
  let stream;

  // Intentar con constraints ideales primero
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
  } catch {
    // Fallback: cualquier cámara disponible
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }

  videoEl.srcObject = stream;
  await videoEl.play();
  return videoEl;
}
