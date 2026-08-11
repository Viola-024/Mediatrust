import cv2
import hashlib
import base64
import json
import sys
import os

def extract_and_hash_frames(video_path):
    """
    Extract every frame from video and hash each one.
    Returns list of frame hashes chained together.
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        return {"error": "Could not open video file"}
    
    frame_hashes = []
    previous_hash = ""
    frame_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Convert frame to bytes
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
        
        # Chain hash — combine frame data with previous hash
        combined = frame_bytes + previous_hash
        current_hash = hashlib.sha256(combined.encode()).hexdigest()
        
        frame_hashes.append({
            "frame_index": frame_count,
            "hash": current_hash
        })
        
        previous_hash = current_hash
        frame_count += 1
    
    cap.release()
    
    return {
        "total_frames": frame_count,
        "final_hash": previous_hash,
        "frame_hashes": frame_hashes
    }


def verify_frame_hashes(video_path, stored_hashes):
    """
    Re-extract frames and compare with stored hashes.
    Returns exactly which frames were tampered.
    """
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        return {"error": "Could not open video file"}
    
    tampered_frames = []
    previous_hash = ""
    frame_count = 0
    total_compared = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Convert frame to bytes
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
        
        # Recompute chained hash
        combined = frame_bytes + previous_hash
        current_hash = hashlib.sha256(combined.encode()).hexdigest()
        
        # Compare with stored hash
        if frame_count < len(stored_hashes):
            stored = stored_hashes[frame_count]["hash"]
            if current_hash != stored:
                tampered_frames.append({
                    "frame_index": frame_count,
                    "expected": stored[:16] + "...",
                    "got": current_hash[:16] + "..."
                })
        
        previous_hash = current_hash
        frame_count += 1
        total_compared += 1
    
    cap.release()
    
    # Calculate tamper percentage
    tamper_percentage = (len(tampered_frames) / total_compared * 100) if total_compared > 0 else 0
    
    return {
        "total_frames": total_compared,
        "tampered_frames": tampered_frames,
        "tampered_count": len(tampered_frames),
        "intact_count": total_compared - len(tampered_frames),
        "tamper_percentage": round(tamper_percentage, 2),
        "verdict": "TAMPERED" if len(tampered_frames) > 0 else "AUTHENTIC",
        "first_tampered_frame": tampered_frames[0]["frame_index"] if tampered_frames else None
    }


def hash_image(image_path):
    """
    Hash a single image file.
    Divides into blocks and hashes each block for localization.
    """
    img = cv2.imread(image_path)
    
    if img is None:
        return {"error": "Could not open image file"}
    
    height, width = img.shape[:2]
    block_size = 64  # 64x64 pixel blocks
    
    block_hashes = []
    overall_data = base64.b64encode(img.tobytes()).decode('utf-8')
    overall_hash = hashlib.sha256(overall_data.encode()).hexdigest()
    
    # Hash each block
    row = 0
    while row < height:
        col = 0
        while col < width:
            block = img[row:row+block_size, col:col+block_size]
            _, buffer = cv2.imencode('.jpg', block)
            block_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
            block_hash = hashlib.sha256(block_bytes.encode()).hexdigest()
            
            block_hashes.append({
                "row": row,
                "col": col,
                "hash": block_hash
            })
            col += block_size
        row += block_size
    
    return {
        "overall_hash": overall_hash,
        "block_hashes": block_hashes,
        "total_blocks": len(block_hashes),
        "image_width": width,
        "image_height": height,
        "block_size": block_size
    }


def verify_image_blocks(image_path, stored_block_hashes, stored_overall_hash):
    """
    Re-hash image blocks and identify which blocks were tampered.
    """
    img = cv2.imread(image_path)
    
    if img is None:
        return {"error": "Could not open image file"}
    
    height, width = img.shape[:2]
    block_size = 64
    
    tampered_blocks = []
    intact_blocks = []
    block_index = 0
    
    row = 0
    while row < height:
        col = 0
        while col < width:
            block = img[row:row+block_size, col:col+block_size]
            _, buffer = cv2.imencode('.jpg', block)
            block_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
            block_hash = hashlib.sha256(block_bytes.encode()).hexdigest()
            
            if block_index < len(stored_block_hashes):
                stored = stored_block_hashes[block_index]["hash"]
                if block_hash != stored:
                    tampered_blocks.append({
                        "block_index": block_index,
                        "row": row,
                        "col": col
                    })
                else:
                    intact_blocks.append(block_index)
            
            block_index += 1
            col += block_size
        row += block_size
    
    tamper_percentage = (len(tampered_blocks) / block_index * 100) if block_index > 0 else 0
    
    return {
        "total_blocks": block_index,
        "tampered_blocks": tampered_blocks,
        "tampered_count": len(tampered_blocks),
        "intact_count": len(intact_blocks),
        "tamper_percentage": round(tamper_percentage, 2),
        "verdict": "TAMPERED" if len(tampered_blocks) > 0 else "AUTHENTIC",
        "image_width": width,
        "image_height": height,
        "block_size": block_size
    }