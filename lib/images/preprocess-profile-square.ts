const OUTPUT_SIZE = 800;
const TARGET_BYTES = 300 * 1024;

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 불러오지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function canvasSupportsWebpEncoding() {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const dataUrl = canvas.toDataURL("image/webp");
  return dataUrl.startsWith("data:image/webp");
}

async function encodeUnderTarget(
  canvas: HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
  fileName: string,
  mime: "image/webp" | "image/jpeg"
): Promise<File> {
  const qualities =
    type === "image/webp"
      ? [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5, 0.45, 0.4, 0.36, 0.32]
      : [0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.42, 0.36, 0.32, 0.28];

  let bestOver: Blob | null = null;
  let bestUnder: Blob | null = null;

  for (const q of qualities) {
    const blob = await canvasToBlob(canvas, type, q);
    if (!blob) {
      continue;
    }

    if (blob.size <= TARGET_BYTES) {
      if (!bestUnder || blob.size > bestUnder.size) {
        bestUnder = blob;
      }
    } else if (!bestOver || blob.size < bestOver.size) {
      bestOver = blob;
    }
  }

  const chosen = bestUnder ?? bestOver;
  if (!chosen) {
    throw new Error("이미지를 인코딩하지 못했습니다.");
  }

  return new File([chosen], fileName, { type: mime, lastModified: Date.now() });
}

/**
 * Center-crops to a square, draws to 800×800, then encodes as WebP (preferred) or JPEG
 * targeting ~300KB (best-effort under {@link TARGET_BYTES}).
 */
export async function preprocessProfileSquareImage(source: File): Promise<{
  file: File;
  contentType: "image/webp" | "image/jpeg";
}> {
  if (!source.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const image = await loadImageElement(source);
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  if (!iw || !ih) {
    throw new Error("이미지 크기를 확인할 수 없습니다.");
  }

  const side = Math.min(iw, ih);
  const sx = (iw - side) / 2;
  const sy = (ih - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 처리를 시작할 수 없습니다.");
  }

  context.drawImage(image, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  if (canvasSupportsWebpEncoding()) {
    const file = await encodeUnderTarget(canvas, "image/webp", "photo.webp", "image/webp");
    return { file, contentType: "image/webp" };
  }

  const file = await encodeUnderTarget(canvas, "image/jpeg", "photo.jpg", "image/jpeg");
  return { file, contentType: "image/jpeg" };
}
