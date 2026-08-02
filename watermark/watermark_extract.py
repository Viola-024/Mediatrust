import cv2
import numpy as np
import base64
import json

def extract_watermark_dct(image_array, watermark_length=500):
    img_float = np.float32(image_array)
    channels = cv2.split(img_float)
    channel = channels[0]
    h, w = channel.shape
    
    watermark_binary = ''
    bits_extracted = 0
    max_bits = watermark_length * 8
    
    for i in range(0, h - 8, 8):
        for j in range(0, w - 8, 8):
            if bits_extracted >= max_bits:
                break
            block = channel[i:i+8, j:j+8]
            dct_block = cv2.dct(block)
            if dct_block[4][4] > 0:
                watermark_binary += '1'
            else:
                watermark_binary += '0'
            bits_extracted += 1
    
    # Convert binary to string
    chars = []
    for i in range(0, len(watermark_binary) - 7, 8):
        byte = watermark_binary[i:i+8]
        chars.append(chr(int(byte, 2)))
    
    extracted_b64 = ''.join(chars)
    
    try:
        decoded_bytes = base64.b64decode(extracted_b64 + '==')
        watermark_str = decoded_bytes.decode('utf-8')
        watermark_data = json.loads(watermark_str)
        return {"success": True, "data": watermark_data}
    except:
        return {"success": False, "error": "Could not extract watermark"}

def extract_watermark_from_image(image_path):
    img = cv2.imread(image_path)
    if img is None:
        return {"error": "Could not read image"}
    return extract_watermark_dct(img)