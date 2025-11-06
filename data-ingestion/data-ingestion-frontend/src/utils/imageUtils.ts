export const resizeImage = (
  base64Str: string,
  maxWidth: number,
  maxHeight: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      // Use higher quality JPEG encoding (0.95 instead of default 0.92)
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Crops an image to a square from the center
 * @param base64Str - Input image as data URL
 * @returns Promise resolving to square-cropped data URL
 */
export const cropToSquare = (base64Str: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const width = img.width;
      const height = img.height;

      // Determine the size of the largest possible square from the center
      const size = Math.min(width, height);

      // Calculate the starting coordinates to crop from the center
      const sx = (width - size) / 2;
      const sy = (height - size) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      // Draw the cropped square from the center of the image
      ctx.drawImage(
        img,
        sx,   // Source X
        sy,   // Source Y
        size, // Source Width
        size, // Source Height
        0,    // Destination X
        0,    // Destination Y
        size, // Destination Width
        size  // Destination Height
      );

      // Use 95% quality to match our quality standard
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
};
