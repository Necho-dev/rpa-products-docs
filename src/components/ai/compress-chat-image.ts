import {
  CHAT_IMAGE_JPEG_QUALITY,
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MAX_EDGE,
  rawImageBase64,
} from '@/lib/ai/chat-vision';

async function blobFromSource(source: Blob | string): Promise<Blob> {
  if (typeof source !== 'string') return source;
  const res = await fetch(source);
  if (!res.ok) {
    throw new Error(`读取图片失败 (${res.status})`);
  }
  return res.blob();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(rawImageBase64(String(reader.result ?? '')));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(blob);
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('无法压缩图片'))),
      'image/jpeg',
      quality,
    );
  });
}

function drawScaled(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法压缩图片');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function compressChatImage(
  source: Blob | string,
  maxEdge = CHAT_IMAGE_MAX_EDGE,
): Promise<{ mediaType: 'image/jpeg'; data: string; preview: string }> {
  const blob = await blobFromSource(source);
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = drawScaled(bitmap, maxEdge);
    let quality = CHAT_IMAGE_JPEG_QUALITY;
    let jpeg = await canvasToJpeg(canvas, quality);
    while (jpeg.size > CHAT_IMAGE_MAX_BYTES && quality > 0.35) {
      quality = Math.max(0.35, quality - 0.1);
      jpeg = await canvasToJpeg(canvas, quality);
    }

    const previewCanvas = drawScaled(bitmap, 160);
    const previewBlob = await canvasToJpeg(previewCanvas, 0.5);
    const [data, previewRaw] = await Promise.all([blobToBase64(jpeg), blobToBase64(previewBlob)]);
    return {
      mediaType: 'image/jpeg',
      data,
      preview: `data:image/jpeg;base64,${previewRaw}`,
    };
  } finally {
    bitmap.close();
  }
}
