interface ScreenshotBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotAPI {
  completeSelection: (bounds: ScreenshotBounds) => void;
  cancelSelection: () => void;
}

declare global {
  interface Window {
    screenshotAPI: ScreenshotAPI;
  }
}

const root = document.getElementById('root')!;
const MIN_SIZE = 10;

let startScreenX = 0;
let startScreenY = 0;
let selecting = false;
let box: HTMLDivElement | null = null;
let sizeLabel: HTMLDivElement | null = null;

function updateBox(screenX: number, screenY: number) {
  if (!box) return;
  const x = Math.min(startScreenX, screenX);
  const y = Math.min(startScreenY, screenY);
  const w = Math.abs(screenX - startScreenX);
  const h = Math.abs(screenY - startScreenY);

  box.style.left = `${x - window.screenX}px`;
  box.style.top = `${y - window.screenY}px`;
  box.style.width = `${w}px`;
  box.style.height = `${h}px`;

  if (sizeLabel) {
    sizeLabel.textContent = `${Math.round(w)} × ${Math.round(h)}`;
  }
}

function finishSelection(screenX: number, screenY: number) {
  const x = Math.min(startScreenX, screenX);
  const y = Math.min(startScreenY, screenY);
  const width = Math.abs(screenX - startScreenX);
  const height = Math.abs(screenY - startScreenY);

  selecting = false;
  box = null;
  sizeLabel = null;

  if (width < MIN_SIZE || height < MIN_SIZE) {
    window.screenshotAPI.cancelSelection();
    return;
  }

  window.screenshotAPI.completeSelection({ x, y, width, height });
}

root.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  selecting = true;
  startScreenX = e.screenX;
  startScreenY = e.screenY;

  box = document.createElement('div');
  box.className = 'selection';
  sizeLabel = document.createElement('div');
  sizeLabel.className = 'size-label';
  box.appendChild(sizeLabel);
  root.appendChild(box);
  updateBox(e.screenX, e.screenY);
});

root.addEventListener('mousemove', (e) => {
  if (!selecting) return;
  updateBox(e.screenX, e.screenY);
});

root.addEventListener('mouseup', (e) => {
  if (!selecting || e.button !== 0) return;
  finishSelection(e.screenX, e.screenY);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.screenshotAPI.cancelSelection();
  }
});
