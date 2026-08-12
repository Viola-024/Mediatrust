import cv2
import av
import hashlib
import base64
import numpy as np

def extract_and_hash_frames(video_path):
    """
    Extract every frame from video using av library.
    Works with .webm, .mp4, and other formats.
    """
    try:
        container = av.open(video_path)
        frame_hashes = []
        previous_hash = ""
        frame_count = 0

        for frame in container.decode(video=0):
            # Convert frame to numpy array
            img = frame.to_ndarray(format='bgr24')

            # Convert frame to bytes
            _, buffer = cv2.imencode('.jpg', img)
            frame_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')

            # Chain hash
            combined = frame_bytes + previous_hash
            current_hash = hashlib.sha256(combined.encode()).hexdigest()

            frame_hashes.append({
                "frame_index": frame_count,
                "hash": current_hash
            })

            previous_hash = current_hash
            frame_count += 1

        container.close()

        return {
            "total_frames": frame_count,
            "final_hash": previous_hash,
            "frame_hashes": frame_hashes
        }

    except Exception as e:
        return {"error": str(e)}


def verify_frame_hashes(video_path, stored_hashes):
    """
    Re-extract frames and compare with stored hashes.
    Returns exactly which frames were tampered.
    """
    try:
        container = av.open(video_path)
        tampered_frames = []
        previous_hash = ""
        frame_count = 0

        for frame in container.decode(video=0):
            img = frame.to_ndarray(format='bgr24')

            _, buffer = cv2.imencode('.jpg', img)
            frame_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')

            combined = frame_bytes + previous_hash
            current_hash = hashlib.sha256(combined.encode()).hexdigest()

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

        container.close()

        total = frame_count
        tamper_percentage = (len(tampered_frames) / total * 100) if total > 0 else 0

        return {
            "total_frames": total,
            "tampered_frames": tampered_frames,
            "tampered_count": len(tampered_frames),
            "intact_count": total - len(tampered_frames),
            "tamper_percentage": round(tamper_percentage, 2),
            "verdict": "TAMPERED" if len(tampered_frames) > 0 else "AUTHENTIC",
            "first_tampered_frame": tampered_frames[0]["frame_index"] if tampered_frames else None
        }

    except Exception as e:
        return {"error": str(e)}


def hash_image(image_path):
    """
    Hash a single image file.
    Divides into blocks and hashes each block for localization.
    """
    img = cv2.imread(image_path)

    if img is None:
        return {"error": "Could not open image file"}

    height, width = img.shape[:2]
    block_size = 64

    block_hashes = []
    overall_data = base64.b64encode(img.tobytes()).decode('utf-8')
    overall_hash = hashlib.sha256(overall_data.encode()).hexdigest()

    row = 0
    while row < height:
        col = 0
        while col < width:
            block = img[row:row+block_size, col:col+block_size]
            _, buffer = cv2.imencode('.jpg', block)
            block_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
            block_hash = hashlib.sha256(block_bytes.encode()).hexdigest()

            block_hashes.append({
                "frame_index": len(block_hashes),
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
    Also generates visual overlay data for tampered regions.
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
                        "col": col,
                        "width": min(block_size, width - col),
                        "height": min(block_size, height - row)
                    })
                else:
                    intact_blocks.append(block_index)

            block_index += 1
            col += block_size
        row += block_size

    tamper_percentage = (len(tampered_blocks) / block_index * 100) if block_index > 0 else 0

    # Generate tamper description
    tamper_description = generate_tamper_description(
        tampered_blocks, width, height
    )

    return {
        "total_blocks": block_index,
        "tampered_blocks": tampered_blocks,
        "tampered_count": len(tampered_blocks),
        "intact_count": len(intact_blocks),
        "tamper_percentage": round(tamper_percentage, 2),
        "verdict": "TAMPERED" if len(tampered_blocks) > 0 else "AUTHENTIC",
        "image_width": width,
        "image_height": height,
        "block_size": block_size,
        "tamper_description": tamper_description
    }


def generate_tamper_description(tampered_blocks, width, height):
    """
    Generate human readable description of where tampering occurred.
    """
    if not tampered_blocks:
        return "No tampering detected."

    descriptions = []

    for block in tampered_blocks:
        row = block["row"]
        col = block["col"]

        # Determine vertical position
        if row < height / 3:
            v_pos = "top"
        elif row < 2 * height / 3:
            v_pos = "middle"
        else:
            v_pos = "bottom"

        # Determine horizontal position
        if col < width / 3:
            h_pos = "left"
        elif col < 2 * width / 3:
            h_pos = "center"
        else:
            h_pos = "right"

        region = f"{v_pos}-{h_pos}"
        if region not in descriptions:
            descriptions.append(region)

    return f"Tampering detected in: {', '.join(descriptions)} region(s)"