import {
  JPEG_COMPRESSION_QUALITY,
  MAX_IMAGE_LONGEST_SIDE,
} from '../../shared/config.ts';

export { JPEG_COMPRESSION_QUALITY, MAX_IMAGE_LONGEST_SIDE };

/**
 * Computes aspect-ratio-preserving dimensions with the longest edge capped to
 * `maxLongestSide` (without upscaling smaller images).
 *
 * @param width Original image width in pixels.
 * @param height Original image height in pixels.
 * @param maxLongestSide Maximum allowed dimension for the longest edge.
 * @returns Target `{ width, height }` dimensions in integer pixels.
 */
export function computeScaledDimensions(
  width: number,
  height: number,
  maxLongestSide = MAX_IMAGE_LONGEST_SIDE
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxLongestSide) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxLongestSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Formats a byte count into a human-readable string (`B`, `KB`, or `MB`).
 *
 * @param bytes Size in bytes.
 * @returns Formatted size string.
 */
export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}
