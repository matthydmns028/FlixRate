// ============================================================
// FlixRate – Dominant Color Extractor
// Uses Canvas API to sample pixels from a hero image and
// determine the most vibrant/dominant RGB color.
// ============================================================

const ColorExtractor = (() => {

  // Proxy to bypass CORS for images from external domains
  function buildProxiedUrl(url) {
    // For same-origin or data URIs, use as-is
    return url;
  }

  /**
   * Extracts the dominant color from an image URL.
   * Returns a Promise<{r, g, b, hex, css}>.
   */
  function getDominantColor(imageUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const SIZE = 80; // downscale for speed
          canvas.width = SIZE;
          canvas.height = SIZE;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, SIZE, SIZE);

          const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
          const colorMap = {};
          const STEP = CONFIG.COLOR_SAMPLE_SIZE;

          for (let i = 0; i < data.length; i += 4 * STEP) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip near-transparent, near-black, near-white, and near-gray pixels
            if (a < 128) continue;
            if (r < 25 && g < 25 && b < 25) continue;
            if (r > 230 && g > 230 && b > 230) continue;

            // Quantize to reduce noise
            const qr = Math.round(r / 12) * 12;
            const qg = Math.round(g / 12) * 12;
            const qb = Math.round(b / 12) * 12;

            // Boost more saturated colors
            const max = Math.max(qr, qg, qb);
            const min = Math.min(qr, qg, qb);
            const saturation = max === 0 ? 0 : (max - min) / max;
            if (saturation < 0.25) continue; // skip near-gray

            const key = `${qr},${qg},${qb}`;
            colorMap[key] = (colorMap[key] || 0) + (1 + saturation * 3); // weight by saturation
          }

          // Find the top color
          let bestColor = null;
          let bestCount = 0;

          for (const [key, count] of Object.entries(colorMap)) {
            if (count > bestCount) {
              bestCount = count;
              const [r, g, b] = key.split(',').map(Number);
              bestColor = { r, g, b };
            }
          }

          if (!bestColor) {
            // Fallback: vibrant purple
            bestColor = { r: 120, g: 40, b: 200 };
          }

          const hex = rgbToHex(bestColor.r, bestColor.g, bestColor.b);
          resolve({ ...bestColor, hex, css: `rgb(${bestColor.r},${bestColor.g},${bestColor.b})` });

        } catch (e) {
          console.warn('ColorExtractor canvas error:', e);
          resolve({ r: 120, g: 40, b: 200, hex: '#7828c8', css: 'rgb(120,40,200)' });
        }
      };

      img.onerror = () => {
        resolve({ r: 120, g: 40, b: 200, hex: '#7828c8', css: 'rgb(120,40,200)' });
      };

      img.src = imageUrl;
    });
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Given an RGB color, returns a lighter or darker variant for glow/shadow effects.
   */
  function lighten({ r, g, b }, amount = 40) {
    return {
      r: Math.min(255, r + amount),
      g: Math.min(255, g + amount),
      b: Math.min(255, b + amount),
    };
  }

  function toRgbaString({ r, g, b }, alpha = 1) {
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { getDominantColor, lighten, toRgbaString, rgbToHex };
})();
