"""
Helper functions for extracting image quality metadata from GCS blob bytes.
"""

from PIL import Image
from io import BytesIO
from typing import Dict, Any, Optional
import math
import logging

logger = logging.getLogger(__name__)


def extract_image_quality(blob_bytes: bytes) -> Dict[str, Any]:
    """
    Extract comprehensive quality metadata from image bytes.

    Args:
        blob_bytes: Raw image file bytes from GCS blob

    Returns:
        Dictionary containing:
        - width: Image width in pixels
        - height: Image height in pixels
        - resolution: Formatted string "width × height"
        - format: Image format (JPEG, PNG, etc.)
        - file_size_bytes: File size in bytes
        - file_size_kb: File size in KB (rounded to 2 decimals)
        - file_size_mb: File size in MB (rounded to 2 decimals, or null if < 1 MB)
        - file_size_formatted: Human-readable file size string
        - aspect_ratio_decimal: Aspect ratio as decimal (width/height)
        - aspect_ratio_label: Common aspect ratio label (e.g., "4:3", "16:9", "1:1")
        - orientation: "portrait", "landscape", or "square"
        - compression_quality: JPEG quality level if available (0-100), otherwise null
        - color_mode: Image color mode (RGB, RGBA, L, etc.)

    Raises:
        ValueError: If blob_bytes cannot be opened as an image
        IOError: If image is corrupted or unsupported format
    """
    logger.info(f"[EXTRACT-QUALITY] Function called with blob_bytes size: {len(blob_bytes)} bytes")

    try:
        # Open image from bytes
        logger.info("[EXTRACT-QUALITY] Opening image with Pillow...")
        image = Image.open(BytesIO(blob_bytes))
        logger.info(f"[EXTRACT-QUALITY] Image opened successfully")

        # Extract basic dimensions
        width, height = image.size
        image_format = image.format or "Unknown"
        color_mode = image.mode
        logger.info(f"[EXTRACT-QUALITY] Image info: {width}x{height}, format={image_format}, mode={color_mode}")

        # Calculate file size
        file_size_bytes = len(blob_bytes)
        file_size_kb = round(file_size_bytes / 1024, 2)
        file_size_mb = round(file_size_bytes / (1024 * 1024), 2) if file_size_bytes >= 1024 * 1024 else None
        logger.info(f"[EXTRACT-QUALITY] File size: {file_size_bytes} bytes = {file_size_kb} KB" + (f" = {file_size_mb} MB" if file_size_mb else ""))

        # Format file size for display
        if file_size_mb and file_size_mb >= 1:
            file_size_formatted = f"{file_size_mb} MB"
        else:
            file_size_formatted = f"{file_size_kb} KB"

        # Calculate aspect ratio
        aspect_ratio_decimal = round(width / height, 4) if height > 0 else 0
        aspect_ratio_label = _calculate_aspect_ratio_label(width, height)
        logger.info(f"[EXTRACT-QUALITY] Aspect ratio: {aspect_ratio_decimal} ({aspect_ratio_label})")

        # Determine orientation
        if width > height:
            orientation = "landscape"
        elif height > width:
            orientation = "portrait"
        else:
            orientation = "square"
        logger.info(f"[EXTRACT-QUALITY] Orientation: {orientation}")

        # Extract compression quality (JPEG-specific)
        compression_quality = None
        if image_format == "JPEG" and hasattr(image, 'info'):
            logger.info(f"[EXTRACT-QUALITY] JPEG detected. Image info keys: {list(image.info.keys())}")
            # Try to get quality from EXIF or image info
            # Note: Pillow doesn't always expose quality directly, but we can check
            if 'quality' in image.info:
                compression_quality = image.info['quality']
                logger.info(f"[EXTRACT-QUALITY] Found quality in image.info: {compression_quality}")
            elif 'progression' in image.info:
                # For progressive JPEGs, estimate quality based on file size and resolution
                # This is a rough estimate
                pixels = width * height
                bytes_per_pixel = file_size_bytes / pixels if pixels > 0 else 0
                # Rough quality estimation (higher bytes/pixel = higher quality)
                if bytes_per_pixel > 1.5:
                    compression_quality = 95
                elif bytes_per_pixel > 1.0:
                    compression_quality = 85
                elif bytes_per_pixel > 0.5:
                    compression_quality = 75
                else:
                    compression_quality = 65
                logger.info(f"[EXTRACT-QUALITY] Estimated quality from bytes/pixel ({bytes_per_pixel:.3f}): {compression_quality}")

        result = {
            "width": width,
            "height": height,
            "resolution": f"{width} × {height}",
            "format": image_format,
            "file_size_bytes": file_size_bytes,
            "file_size_kb": file_size_kb,
            "file_size_mb": file_size_mb,
            "file_size_formatted": file_size_formatted,
            "aspect_ratio_decimal": aspect_ratio_decimal,
            "aspect_ratio_label": aspect_ratio_label,
            "orientation": orientation,
            "compression_quality": compression_quality,
            "color_mode": color_mode,
        }

        logger.info(f"[EXTRACT-QUALITY] Successfully extracted quality data. Returning dictionary with {len(result)} fields")
        return result

    except Exception as e:
        logger.error(f"[EXTRACT-QUALITY] Exception during extraction: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"[EXTRACT-QUALITY] Stack trace:\n{traceback.format_exc()}")
        raise ValueError(f"Failed to extract image quality: {str(e)}")


def _calculate_aspect_ratio_label(width: int, height: int) -> str:
    """
    Calculate a human-readable aspect ratio label.

    Args:
        width: Image width in pixels
        height: Image height in pixels

    Returns:
        Aspect ratio label (e.g., "16:9", "4:3", "1:1", or "Custom")
    """
    if height == 0:
        return "Unknown"

    # Calculate GCD to simplify ratio
    def gcd(a: int, b: int) -> int:
        while b:
            a, b = b, a % b
        return a

    divisor = gcd(width, height)
    ratio_w = width // divisor
    ratio_h = height // divisor

    # Common aspect ratios
    common_ratios = {
        (1, 1): "1:1 (Square)",
        (4, 3): "4:3",
        (3, 2): "3:2",
        (16, 9): "16:9",
        (16, 10): "16:10",
        (21, 9): "21:9",
        (3, 4): "3:4",
        (2, 3): "2:3",
        (9, 16): "9:16",
    }

    if (ratio_w, ratio_h) in common_ratios:
        return common_ratios[(ratio_w, ratio_h)]

    # If not a common ratio, return the simplified fraction
    # But if the numbers are still too large, just show decimal
    if ratio_w > 50 or ratio_h > 50:
        decimal_ratio = round(width / height, 2)
        return f"{decimal_ratio}:1"

    return f"{ratio_w}:{ratio_h}"
