import cv2
import numpy as np
import json
import base64
from PIL import Image
import io

def embed_watermark_dct(image_array, watermark_data):
    # Convert to float32
    img_float = np.float32(image_array)
    
    # Split into channels
    channels = cv2.split(img_float)
    
    # Encode watermark as binary
    watermark_str = json.dumps(watermark_data)
    watermark_bytes = watermark_str.encode('utf-8')
    watermark_b64 = base64.b64encode(watermark_bytes).decode('utf-8')
    watermark_binary = ''.join(format(ord(c), '08b') for c in watermark_b64)
    
    # Embed in blue channel using DCT
    channel = channels[0]
    h, w = channel.shape
    bit_index = 0
    
    for i in range(0, h - 8, 8):
        for j in range(0, w - 8, 8):
            if bit_index >= len(watermark_binary):
                break
            block = channel[i:i+8, j:j+8]
            dct_block = cv2.dct(block)
            # Embed bit in mid-frequency coefficient
            if watermark_binary[bit_index] == '1':
                dct_block[4][4] = abs(dct_block[4][4]) + 25
            else:
                dct_block[4][4] = -(abs(dct_block[4][4]) + 25)
            channel[i:i+8, j:j+8] = cv2.idct(dct_block)
            bit_index += 1
    
    channels[0] = channel
    result = cv2.merge(channels)
    result = np.clip(result, 0, 255).astype(np.uint8)
    return result

def embed_watermark_to_image(image_path, watermark_data, output_path):
    img = cv2.imread(image_path)
    if img is None:
        return {"error": "Could not read image"}
    
    watermarked = embed_watermark_dct(img, watermark_data)
    cv2.imwrite(output_path, watermarked)
    return {"success": True, "output": output_path}