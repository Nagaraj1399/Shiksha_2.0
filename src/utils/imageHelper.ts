import sampleMathHomeworkUrl from '../assets/images/sample_math_homework_1794759161320.jpg';
import sampleScienceSyllabusUrl from '../assets/images/sample_science_syllabus_1794759162534.jpg';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  JPEG_COMPRESSION_QUALITY,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_LONGEST_SIDE,
} from '../../shared/config';
import { computeScaledDimensions, formatByteSize } from './imageMath';

export { formatByteSize };

/** Bundled sample math homework photo URL for quick Student Tutor testing. */
export const SAMPLE_MATH_HOMEWORK_URL = sampleMathHomeworkUrl;

/** Bundled sample science syllabus photo URL for quick Teacher Aide testing. */
export const SAMPLE_SCIENCE_SYLLABUS_URL = sampleScienceSyllabusUrl;

const ALLOWED_IMAGE_MIMES = new Set<string>(ALLOWED_IMAGE_MIME_TYPES);

/**
 * Compressed client-side image attachment ready for preview and JSON upload.
 */
export interface EncodedImageAttachment {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  previewUrl: string;
  label: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode selected image.'));
    img.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to encode compressed image.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read compressed image.'));
    reader.readAsDataURL(blob);
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas JPEG compression failed.'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}

/**
 * Compresses a browser {@link File} on an off-screen `<canvas>` by capping its
 * longest side to 1280px and exporting JPEG at quality 0.8.
 *
 * @param file User-selected image file (JPEG, PNG, or WebP).
 * @throws Error if the MIME type is unsupported or compressed output exceeds 4 MB.
 * @returns Compressed base64 attachment with original and compressed byte sizes.
 */
export async function readFileAsImageAttachment(
  file: File
): Promise<EncodedImageAttachment> {
  const normalizedMime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
  if (!ALLOWED_IMAGE_MIMES.has(normalizedMime)) {
    throw new Error('Please select a JPEG, PNG, or WebP image.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    const { width, height } = computeScaledDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      MAX_IMAGE_LONGEST_SIDE
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize canvas for image compression.');
    }

    // Fill white backdrop before exporting JPEG in case source PNG/WebP has alpha transparency
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const compressedBlob = await canvasToJpegBlob(canvas, JPEG_COMPRESSION_QUALITY);

    if (compressedBlob.size > MAX_IMAGE_BYTES) {
      throw new Error('Compressed image still exceeds the 4 MB limit.');
    }

    const dataUrl = await blobToDataUrl(compressedBlob);
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

    return {
      base64,
      mimeType: 'image/jpeg',
      previewUrl: dataUrl,
      label: file.name,
      width,
      height,
      originalBytes: file.size,
      compressedBytes: compressedBlob.size,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Fetches a bundled sample image asset and processes it through the standard
 * client-side canvas compression pipeline.
 *
 * @param url Asset URL to fetch.
 * @param label Human-readable file label shown in the composer preview.
 * @returns Compressed {@link EncodedImageAttachment}.
 */
export async function loadSampleImageAttachment(
  url: string,
  label: string
): Promise<EncodedImageAttachment> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load sample image (${response.status}).`);
  }
  const blob = await response.blob();
  const mime = ALLOWED_IMAGE_MIMES.has(blob.type) ? blob.type : 'image/jpeg';
  const file = new File([blob], label, { type: mime });
  return readFileAsImageAttachment(file);
}
