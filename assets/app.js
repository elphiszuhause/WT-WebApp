function initSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let drawing = false;
  let lastX = 0;
  let lastY = 0;

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x;
    lastY = pos.y;
  });

  canvas.addEventListener('pointerup', (e) => {
    e.preventDefault();
    drawing = false;
    canvas.releasePointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointerleave', () => {
    drawing = false;
  });
}

function clearSignature(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll("canvas[id^='sig-']").forEach(canvas => {
    initSignaturePad(canvas.id);
  });
});
