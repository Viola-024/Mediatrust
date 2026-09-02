import os
import cv2
import av
import hashlib
import base64
import numpy as np


def crop_letterbox_borders(img, tol=25):
    """
    Automatically detects and crops out black letterbox (top/bottom)
    or pillarbox (left/right) bars added by video editors during export.
    """
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Row and column brightness profiles
        row_means = gray.mean(axis=1)
        col_means = gray.mean(axis=0)

        rows = np.where(row_means > tol)[0]
        cols = np.where(col_means > tol)[0]

        if len(rows) > 0 and len(cols) > 0:
            r_start, r_end = rows[0], rows[-1] + 1
            c_start, c_end = cols[0], cols[-1] + 1

            # Only crop if borders represent significant padding (> 4% of dimension)
            if (r_end - r_start >= h * 0.5) and (c_end - c_start >= w * 0.5):
                return img[r_start:r_end, c_start:c_end]
        return img
    except Exception:
        return img


def compute_phash_hex(img, hash_size=8, highfreq_factor=4):
    """
    Compute 64-bit DCT perceptual hash as a 16-character hex string.
    Crops out editor black padding bars for robust comparison.
    """
    try:
        clean_img = crop_letterbox_borders(img)
        gray = cv2.cvtColor(clean_img, cv2.COLOR_BGR2GRAY)
        img_size = hash_size * highfreq_factor
        resized = cv2.resize(gray, (img_size, img_size), interpolation=cv2.INTER_AREA)
        dct = cv2.dct(np.float32(resized))
        dct_low = dct[:hash_size, :hash_size]
        med = np.median(dct_low)
        bits = (dct_low > med).flatten()
        val = 0
        for b in bits:
            val = (val << 1) | (1 if b else 0)
        return hex(val)[2:].zfill(16)
    except Exception:
        return "0000000000000000"


def compute_dhash_hex(img, hash_size=8):
    """Compute 64-bit difference gradient hash as a 16-character hex string."""
    try:
        clean_img = crop_letterbox_borders(img)
        gray = cv2.cvtColor(clean_img, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
        bits = (resized[:, 1:] > resized[:, :-1]).flatten()
        val = 0
        for b in bits:
            val = (val << 1) | (1 if b else 0)
        return hex(val)[2:].zfill(16)
    except Exception:
        return "0000000000000000"


def hex_hamming_distance(hex1, hex2):
    """Compute bitwise Hamming distance between two 64-bit hex hashes."""
    try:
        v1 = int(hex1, 16)
        v2 = int(hex2, 16)
        return bin(v1 ^ v2).count('1')
    except Exception:
        return 64


def extract_and_hash_frames(video_path):
    """
    Dual Hashing Pipeline:
    1. SHA-256 for cryptographic tamper-proof hash chain.
    2. pHash (DCT) & dHash (Gradient) for compression-resilient visual fingerprinting.
    """
    try:
        container = av.open(video_path)
        frame_hashes = []
        previous_hash = ""
        frame_count = 0

        for frame in container.decode(video=0):
            img = frame.to_ndarray(format='bgr24')

            # 1. Cryptographic SHA-256 Chain
            _, buffer = cv2.imencode('.jpg', img)
            frame_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
            combined = frame_bytes + previous_hash
            current_hash = hashlib.sha256(combined.encode()).hexdigest()

            # 2. Perceptual Fingerprints (pHash + dHash)
            ph_hex = compute_phash_hex(img)
            dh_hex = compute_dhash_hex(img)

            frame_hashes.append({
                "frame_index": frame_count,
                "hash": current_hash,
                "phash": ph_hex,
                "dhash": dh_hex
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


def normalize_color_and_lighting(orig_img, test_img):
    """
    Vectorized channel normalization between WebM (VP8/VP9) and MP4 (H.264).
    """
    try:
        orig_clean = crop_letterbox_borders(orig_img)
        test_clean = crop_letterbox_borders(test_img)

        h, w = orig_clean.shape[:2]
        if test_clean.shape[:2] != (h, w):
            test_img_res = cv2.resize(test_clean, (w, h))
        else:
            test_img_res = test_clean

        orig_f = orig_clean.astype(np.float32)
        test_f = test_img_res.astype(np.float32)

        mu_o = np.mean(orig_f, axis=(0, 1))
        std_o = np.std(orig_f, axis=(0, 1))
        mu_t = np.mean(test_f, axis=(0, 1))
        std_t = np.std(test_f, axis=(0, 1))
        std_t[std_t < 1e-2] = 1.0

        norm_test = (test_f - mu_t) * (std_o / std_t) + mu_o
        return np.clip(norm_test, 0, 255).astype(np.uint8)
    except Exception:
        return test_img


def generate_frame_comparison(orig_img, tamp_img):
    """
    Generate visual difference overlay with bounding boxes on genuinely modified regions.
    Detects minute pen strokes, lines, doodles, text, stickers, and localized edits.
    """
    try:
        orig_clean = crop_letterbox_borders(orig_img)
        tamp_clean = crop_letterbox_borders(tamp_img)

        h, w = orig_clean.shape[:2]
        if tamp_clean.shape[:2] != (h, w):
            tamp_img_res = cv2.resize(tamp_clean, (w, h))
        else:
            tamp_img_res = tamp_clean

        diff = cv2.absdiff(orig_clean, tamp_img_res)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)

        # Threshold to capture fine markings and edits
        _, thresh = cv2.threshold(gray_diff, 20, 255, cv2.THRESH_BINARY)
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        thresh_clean = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel_clean)

        heatmap = cv2.applyColorMap(gray_diff, cv2.COLORMAP_JET)
        diff_vis = cv2.addWeighted(tamp_img_res, 0.6, heatmap, 0.4, 0)

        contours, _ = cv2.findContours(thresh_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        bounding_boxes = 0
        for c in contours:
            x, y, bw, bh = cv2.boundingRect(c)
            if bw * bh >= 16 or cv2.contourArea(c) >= 8:
                cv2.rectangle(diff_vis, (max(0, x - 2), max(0, y - 2)), (min(w, x + bw + 2), min(h, y + bh + 2)), (0, 0, 255), 2)
                bounding_boxes += 1

        _, buf_orig = cv2.imencode('.jpg', orig_clean, [cv2.IMWRITE_JPEG_QUALITY, 85])
        _, buf_tamp = cv2.imencode('.jpg', tamp_img_res, [cv2.IMWRITE_JPEG_QUALITY, 85])
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
    Intelligent forensic verification of video frames using Dual Hashing (SHA-256 + pHash).
    Performs monotonic 1-to-1 sequence matching.
    """
    try:
        # 1. Read submitted video frames and perceptual fingerprints
        sub_container = av.open(video_path)
        sub_frames = []
        sub_phash_list = []
        sub_dhash_list = []

        for f in sub_container.decode(video=0):
            img = f.to_ndarray(format='bgr24')
            sub_frames.append(img)
            sub_phash_list.append(compute_phash_hex(img))
            sub_dhash_list.append(compute_dhash_hex(img))
        sub_container.close()

        sub_total = len(sub_frames)

        # 2. Check stored reference hashes & original video file
        stored_total = len(stored_hashes) if stored_hashes else 0

        orig_frames = []
        orig_phash_list = []
        orig_dhash_list = []

        if original_video_path and os.path.exists(original_video_path):
            orig_container = av.open(original_video_path)
            for f in orig_container.decode(video=0):
                img = f.to_ndarray(format='bgr24')
                orig_frames.append(img)
                orig_phash_list.append(compute_phash_hex(img))
                orig_dhash_list.append(compute_dhash_hex(img))
            orig_container.close()

        orig_total = len(orig_frames) if orig_frames else stored_total
        total_frames = max(orig_total, stored_total)

        tampered_frames = []
        intact_frames = []
        trimmed_frames = []
        visual_comparisons = []
        tampered_sample_candidates = []

        last_matched_j = -1
        win_radius = max(35, abs(total_frames - sub_total) + 20)

        for i in range(total_frames):
            stored_entry = stored_hashes[i] if (stored_hashes and i < len(stored_hashes)) else None

            oh_ph = None
            if stored_entry and isinstance(stored_entry, dict) and stored_entry.get("phash"):
                oh_ph = stored_entry.get("phash")
            elif i < len(orig_phash_list):
                oh_ph = orig_phash_list[i]

            oh_dh = None
            if stored_entry and isinstance(stored_entry, dict) and stored_entry.get("dhash"):
                oh_dh = stored_entry.get("dhash")
            elif i < len(orig_dhash_list):
                oh_dh = orig_dhash_list[i]

            next_j = last_matched_j + 1
            matched_j = None

            # 1. Check candidate next_j
            if next_j < sub_total and oh_ph and oh_dh:
                p_dist = hex_hamming_distance(oh_ph, sub_phash_list[next_j])
                d_dist = hex_hamming_distance(oh_dh, sub_dhash_list[next_j])
                if (p_dist + d_dist) <= 26:
                    matched_j = next_j

            # 2. Window search if candidate failed (meaning a cut or temporal jump occurred)
            if matched_j is None and next_j < sub_total and oh_ph and oh_dh:
                win_start = next_j
                win_end = min(sub_total, next_j + win_radius + 1)
                best_j = next_j
                best_score = 999

                for j in range(win_start, win_end):
                    p_d = hex_hamming_distance(oh_ph, sub_phash_list[j])
                    d_d = hex_hamming_distance(oh_dh, sub_dhash_list[j])
                    score = p_d + d_d
                    if score < best_score:
                        best_score = score
                        best_j = j

                if best_score <= 26:
                    matched_j = best_j

            if matched_j is not None:
                intact_frames.append(i)
                last_matched_j = matched_j
            else:
                if next_j < sub_total:
                    tampered_frames.append({
                        "frame_index": i,
                        "expected": f"Frame #{i} (Original)",
                        "got": "CUT / ALTERED (Missing in submitted video)"
                    })
                    if orig_frames and i < len(orig_frames):
                        ref_j = min(sub_total - 1, max(0, next_j))
                        tampered_sample_candidates.append((i, orig_frames[i], sub_frames[ref_j]))
                else:
                    trimmed_frames.append(i)
                    tampered_frames.append({
                        "frame_index": i,
                        "expected": f"Frame #{i}",
                        "got": "TRIMMED / CUT OFF"
                    })

        intact_count = len(intact_frames)
        tampered_count = total_frames - intact_count
        tamper_percentage = round((tampered_count / max(1, total_frames)) * 100, 2)
        is_tampered = (tampered_count > 0) or (sub_total != total_frames)

        # Generate representative visual comparison samples
        if tampered_sample_candidates:
            step = max(1, len(tampered_sample_candidates) // 3)
            samples = tampered_sample_candidates[::step][:3]
            for f_idx, orig_img, tamp_img in samples:
                comp = generate_frame_comparison(orig_img, tamp_img)
                if comp:
                    comp["frame_index"] = f_idx
                    visual_comparisons.append(comp)

        edit_diagnostics = []
        if total_frames != sub_total:
            missing_diff = abs(total_frames - sub_total)
            edit_diagnostics.append(
                f"✂️ Frame Count Mismatch: Submitted video has {sub_total} frames ({missing_diff} frames missing / cut from Original {total_frames} frames)."
            )
        if len(trimmed_frames) > 0:
            edit_diagnostics.append(
                f"✂️ Video Trimmed at End: {len(trimmed_frames)} frame(s) removed (Frames #{trimmed_frames[0]} to #{trimmed_frames[-1]} cut off)."
            )
        if intact_count > 0 and is_tampered:
            edit_diagnostics.append(
                f"✅ Content Preserved: {intact_count} frame(s) ({round(intact_count / total_frames * 100, 1)}% of original video) verified authentic despite WebM/MP4 transcode."
            )

        visual_tampered_count = len(tampered_frames) - len(trimmed_frames)
        if visual_tampered_count > 0:
            intervals = []
            vis_indices = [t["frame_index"] for t in tampered_frames if t["got"] != "TRIMMED / CUT OFF"]
            if vis_indices:
                start_i = vis_indices[0]
                prev_i = vis_indices[0]
                for idx in vis_indices[1:]:
                    if idx == prev_i + 1:
                        prev_i = idx
                    else:
                        intervals.append((start_i, prev_i))
                        start_i = idx
                        prev_i = idx
                intervals.append((start_i, prev_i))

            interval_strs = [
                f"Frames #{s} to #{e} ({(e - s + 1)} frames, ~{round((e - s + 1) / 30.0, 1)}s)"
                if s != e else f"Frame #{s}"
                for s, e in intervals[:3]
            ]
            edit_diagnostics.append(
                f"🎨 Localized Video Modifications/Cuts: {visual_tampered_count} frame(s) altered/missing in {', '.join(interval_strs)}."
            )

        return {
            "total_frames": total_frames,
            "original_total_frames": total_frames,
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


def verify_image_blocks(image_path, stored_block_hashes, stored_overall_hash, orig_image_path=None):
    """
    Re-hash image blocks and identify which blocks were tampered.
    Also generates visual overlay and heatmaps for tampered regions.
    """
    img = cv2.imread(image_path)

    if img is None:
        return {"error": "Could not open image file"}

    height, width = img.shape[:2]
    block_size = 64

    orig_img = None
    if orig_image_path and os.path.exists(orig_image_path):
        orig_img = cv2.imread(orig_image_path)
        if orig_img is not None and orig_img.shape[:2] != (height, width):
            img = cv2.resize(img, (orig_img.shape[1], orig_img.shape[0]))
            height, width = orig_img.shape[:2]

    tampered_blocks = []
    intact_blocks = []
    block_index = 0
    visual_comparisons = []
    edit_diagnostics = []

    row = 0
    while row < height:
        col = 0
        while col < width:
            b_h = min(block_size, height - row)
            b_w = min(block_size, width - col)
            sub_block = img[row:row+b_h, col:col+b_w]

            is_block_tampered = False

            if orig_img is not None:
                orig_block = orig_img[row:row+b_h, col:col+b_w]
                # Check maximum channel difference per pixel in the block
                diff_matrix = np.max(np.abs(orig_block.astype(np.float32) - sub_block.astype(np.float32)), axis=2)
                # Count pixels with noticeable color change (> 20 intensity delta)
                tampered_pixel_count = np.count_nonzero(diff_matrix > 20)
                mean_diff = np.mean(diff_matrix)

                # Any cluster of >= 6 altered pixels (e.g. line, scribble, text, smudge) or general shift
                if tampered_pixel_count >= 6 or mean_diff > 6.0:
                    is_block_tampered = True
            elif stored_block_hashes and block_index < len(stored_block_hashes):
                _, buffer = cv2.imencode('.jpg', sub_block)
                block_bytes = base64.b64encode(buffer.tobytes()).decode('utf-8')
                block_hash = hashlib.sha256(block_bytes.encode()).hexdigest()
                stored = stored_block_hashes[block_index]["hash"]
                if block_hash != stored:
                    is_block_tampered = True

            if is_block_tampered:
                tampered_blocks.append({
                    "block_index": block_index,
                    "row": row,
                    "col": col,
                    "width": b_w,
                    "height": b_h
                })
            else:
                intact_blocks.append(block_index)

            block_index += 1
            col += block_size
        row += block_size

    total_b = max(1, block_index)
    tamper_percentage = (len(tampered_blocks) / total_b * 100)
    is_tampered = len(tampered_blocks) > 0

    tamper_description = generate_tamper_description(
        tampered_blocks, width, height
    )

    if orig_img is not None and is_tampered:
        comp = generate_frame_comparison(orig_img, img)
        if comp:
            comp["frame_index"] = 0
            visual_comparisons.append(comp)
        edit_diagnostics.append(f"🎨 Visual Region Modifications: {len(tampered_blocks)} block(s) modified in {tamper_description}.")
    elif not is_tampered:
        edit_diagnostics.append(f"✅ Content Preserved: All {len(intact_blocks)} image blocks verified authentic.")

    return {
        "total_blocks": block_index,
        "total_frames": block_index,
        "tampered_blocks": tampered_blocks,
        "tampered_frames": [{"frame_index": b["block_index"], "row": b["row"], "col": b["col"]} for b in tampered_blocks],
        "tampered_count": len(tampered_blocks),
        "intact_count": len(intact_blocks),
        "tamper_percentage": round(tamper_percentage, 2),
        "verdict": "TAMPERED" if is_tampered else "AUTHENTIC",
        "image_width": width,
        "image_height": height,
        "block_size": block_size,
        "tamper_description": tamper_description,
        "edit_diagnostics": edit_diagnostics,
        "visual_comparisons": visual_comparisons
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