import os
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
            img = frame.to_ndarray(format='bgr24')

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


def compute_dhash(img):
    """Compute 64-bit difference hash for perceptual image matching."""
    try:
        resized = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (9, 8))
        diff = resized[:, 1:] > resized[:, :-1]
        return diff
    except Exception:
        return np.zeros((8, 8), dtype=bool)


def generate_frame_comparison(orig_img, tamp_img):
    """
    Generate visual difference overlay between original and tampered frame.
    Returns base64 encoded images of original, tampered, and difference heatmap.
    """
    try:
        h, w = orig_img.shape[:2]
        if tamp_img.shape[:2] != (h, w):
            tamp_img_res = cv2.resize(tamp_img, (w, h))
        else:
            tamp_img_res = tamp_img

        diff = cv2.absdiff(orig_img, tamp_img_res)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray_diff, 20, 255, cv2.THRESH_BINARY)

        heatmap = cv2.applyColorMap(gray_diff, cv2.COLORMAP_JET)
        diff_vis = cv2.addWeighted(tamp_img_res, 0.5, heatmap, 0.5, 0)

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_boxes = 0
        for c in contours:
            if cv2.contourArea(c) > 40:
                x, y, bw, bh = cv2.boundingRect(c)
                cv2.rectangle(diff_vis, (x, y), (x + bw, y + bh), (0, 0, 255), 2)
                bounding_boxes += 1

        _, buf_orig = cv2.imencode('.jpg', orig_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        _, buf_tamp = cv2.imencode('.jpg', tamp_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        _, buf_diff = cv2.imencode('.jpg', diff_vis, [cv2.IMWRITE_JPEG_QUALITY, 85])

        return {
            "original_image": "data:image/jpeg;base64," + base64.b64encode(buf_orig.tobytes()).decode('utf-8'),
            "tampered_image": "data:image/jpeg;base64," + base64.b64encode(buf_tamp.tobytes()).decode('utf-8'),
            "diff_heatmap": "data:image/jpeg;base64," + base64.b64encode(buf_diff.tobytes()).decode('utf-8'),
            "bounding_boxes_count": bounding_boxes
        }
    except Exception as e:
        print(f"Error in generate_frame_comparison: {e}")
        return None


def verify_frame_hashes(video_path, stored_hashes, original_video_path=None):
    """
    Intelligent forensic verification of video frames.
    Performs perceptual temporal alignment when video is trimmed or re-encoded,
    identifying exact intact segments vs. trimmed/tampered segments.
    """
    try:
        # 1. Read submitted video frames
        sub_container = av.open(video_path)
        sub_frames = []
        for f in sub_container.decode(video=0):
            sub_frames.append(f.to_ndarray(format='bgr24'))
        sub_container.close()

        sub_total = len(sub_frames)

        # 2. If original video file is available, perform perceptual temporal alignment
        if original_video_path and os.path.exists(original_video_path):
            orig_container = av.open(original_video_path)
            orig_frames = []
            for f in orig_container.decode(video=0):
                orig_frames.append(f.to_ndarray(format='bgr24'))
            orig_container.close()

            orig_total = len(orig_frames)

            # Compute dHashes
            orig_dhashes = [compute_dhash(img) for img in orig_frames]
            sub_dhashes = [compute_dhash(img) for img in sub_frames]

            tampered_frames = []
            intact_frames = []
            trimmed_frames = []
            visual_comparisons = []
            extracted_tampered_samples = []

            # Check if videos are identical in frame count & content
            is_perfect_match = True

            for i in range(orig_total):
                oh = orig_dhashes[i]

                # Map original frame index to expected submitted frame range
                expected_sub_idx = int(round(i * (sub_total / max(1, orig_total))))

                if expected_sub_idx < sub_total:
                    # Search best match in a small local window around expected index
                    win_start = max(0, expected_sub_idx - 5)
                    win_end = min(sub_total, expected_sub_idx + 6)
                    best_dist = 64
                    best_j = expected_sub_idx

                    for j in range(win_start, win_end):
                        dist = np.count_nonzero(oh != sub_dhashes[j])
                        if dist < best_dist:
                            best_dist = dist
                            best_j = j

                    if best_dist <= 12:
                        intact_frames.append(i)
                    else:
                        is_perfect_match = False
                        tampered_frames.append({
                            "frame_index": i,
                            "expected": f"Frame #{i} (Original)",
                            "got": f"Altered (Distance: {best_dist})"
                        })
                        if len(extracted_tampered_samples) < 3:
                            extracted_tampered_samples.append((i, orig_frames[i], sub_frames[best_j]))
                else:
                    # Video ended before this frame -> Trimmed / Cut off
                    is_perfect_match = False
                    trimmed_frames.append(i)
                    tampered_frames.append({
                        "frame_index": i,
                        "expected": f"Frame #{i}",
                        "got": "TRIMMED / CUT OFF"
                    })

            # Check for extra frames at end of submitted video
            if sub_total > orig_total:
                extra_count = sub_total - orig_total
                is_perfect_match = False

            total_frames = orig_total
            intact_count = len(intact_frames)
            tampered_count = len(tampered_frames) + len(trimmed_frames)
            # Cap tampered count to total
            tampered_count = total_frames - intact_count
            tamper_percentage = round((tampered_count / max(1, total_frames)) * 100, 2)
            is_tampered = not is_perfect_match or tampered_count > 0

            # Generate visual comparisons
            for f_idx, orig_img, tamp_img in extracted_tampered_samples:
                comp = generate_frame_comparison(orig_img, tamp_img)
                if comp:
                    comp["frame_index"] = f_idx
                    visual_comparisons.append(comp)

            # Formulate diagnostics
            edit_diagnostics = []
            if len(trimmed_frames) > 0:
                edit_diagnostics.append(
                    f"✂️ Video Trimmed at End: {len(trimmed_frames)} frame(s) removed (Frames #{trimmed_frames[0]} to #{trimmed_frames[-1]} cut off)."
                )
            if intact_count > 0 and is_tampered:
                edit_diagnostics.append(
                    f"✅ Content Preserved: {intact_count} frame(s) ({round(intact_count/total_frames*100, 1)}% of original video) match the authentic recording."
                )
            if sub_total != orig_total:
                edit_diagnostics.append(
                    f"⏱️ Stream Resampling: Submitted video has {sub_total} frames (Original: {orig_total} frames)."
                )
            if len(tampered_frames) > len(trimmed_frames):
                visual_tampered_count = len(tampered_frames) - len(trimmed_frames)
                edit_diagnostics.append(
                    f"🎨 Visual Modifications: {visual_tampered_count} frame(s) exhibit pixel modifications."
                )

            return {
                "total_frames": total_frames,
                "original_total_frames": orig_total,
                "submitted_total_frames": sub_total,
                "tampered_frames": tampered_frames,
                "tampered_count": tampered_count,
                "intact_count": intact_count,
                "tamper_percentage": tamper_percentage,
                "verdict": "TAMPERED" if is_tampered else "AUTHENTIC",
                "first_tampered_frame": tampered_frames[0]["frame_index"] if tampered_frames else None,
                "edit_diagnostics": edit_diagnostics,
                "visual_comparisons": visual_comparisons
            }

        # 3. Fallback to strict hash-by-hash checking if original video file is not stored on disk
        tampered_frames = []
        previous_hash = ""
        frame_count = 0

        for img in sub_frames:
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
            else:
                tampered_frames.append({
                    "frame_index": frame_count,
                    "expected": "NONE (Extra frame)",
                    "got": current_hash[:16] + "..."
                })

            previous_hash = current_hash
            frame_count += 1

        total = max(frame_count, len(stored_hashes))
        tamper_percentage = (len(tampered_frames) / total * 100) if total > 0 else 0
        is_tampered = len(tampered_frames) > 0

        return {
            "total_frames": total,
            "original_total_frames": len(stored_hashes),
            "submitted_total_frames": frame_count,
            "tampered_frames": tampered_frames,
            "tampered_count": len(tampered_frames),
            "intact_count": max(0, total - len(tampered_frames)),
            "tamper_percentage": round(tamper_percentage, 2),
            "verdict": "TAMPERED" if is_tampered else "AUTHENTIC",
            "first_tampered_frame": tampered_frames[0]["frame_index"] if tampered_frames else None,
            "edit_diagnostics": ["⚠️ Re-encoded or modified stream detected."],
            "visual_comparisons": []
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
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

        if row < height / 3:
            v_pos = "top"
        elif row < 2 * height / 3:
            v_pos = "middle"
        else:
            v_pos = "bottom"

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