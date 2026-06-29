import { desktopCapturer, screen, clipboard } from 'electron';

export interface CaptureBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function captureRegionToClipboard(bounds: CaptureBounds): Promise<void> {
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const display = screen.getDisplayNearestPoint(center);
  const scale = display.scaleFactor;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.floor(display.size.width * scale),
      height: Math.floor(display.size.height * scale),
    },
  });

  const source =
    sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
  if (!source) {
    throw new Error('无法获取屏幕源，请检查屏幕录制权限');
  }

  const image = source.thumbnail;
  if (image.isEmpty()) {
    throw new Error('截图为空，请授予屏幕录制权限后重试');
  }

  const localX = (bounds.x - display.bounds.x) * scale;
  const localY = (bounds.y - display.bounds.y) * scale;
  const cropW = bounds.width * scale;
  const cropH = bounds.height * scale;

  const imgSize = image.getSize();
  const cropX = Math.max(0, Math.min(Math.round(localX), imgSize.width - 1));
  const cropY = Math.max(0, Math.min(Math.round(localY), imgSize.height - 1));
  const cropWidth = Math.max(1, Math.min(Math.round(cropW), imgSize.width - cropX));
  const cropHeight = Math.max(1, Math.min(Math.round(cropH), imgSize.height - cropY));

  const cropped = image.crop({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  if (cropped.isEmpty()) {
    throw new Error('截图裁剪失败');
  }

  clipboard.writeImage(cropped);
}
