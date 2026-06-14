export async function initCamera(videoEl) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return videoEl;
}
