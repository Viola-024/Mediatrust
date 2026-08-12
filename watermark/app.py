from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import json
from watermark_embed import embed_watermark_to_image
from watermark_extract import extract_watermark_from_image
from frame_hasher import (
    extract_and_hash_frames,
    verify_frame_hashes,
    hash_image,
    verify_image_blocks
)

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Existing watermark routes ────────────────────────────────────────────────

@app.route('/embed', methods=['POST'])
def embed():
    try:
        file = request.files.get('media')
        watermark_data = request.form.get('watermarkData')

        if not file or not watermark_data:
            return jsonify({'error': 'Missing file or watermark data'}), 400

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        output_path = filepath.replace('.', '_watermarked.')
        result = embed_watermark_to_image(filepath, json.loads(watermark_data), output_path)

        return jsonify({
            'message': 'Watermark embedded successfully',
            'output_path': output_path,
            'result': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/extract', methods=['POST'])
def extract():
    try:
        file = request.files.get('media')

        if not file:
            return jsonify({'error': 'Missing file'}), 400

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        watermark_data = extract_watermark_from_image(filepath)

        return jsonify({
            'message': 'Watermark extracted successfully',
            'watermarkData': watermark_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Helper to save uploaded file ─────────────────────────────────────────────

def save_upload(file, suffix):
    """Save uploaded file to disk and return path. Windows-safe."""
    tmp_path = os.path.join(UPLOAD_FOLDER, f"tmp_{os.urandom(8).hex()}{suffix}")
    file.save(tmp_path)
    return tmp_path


# ─── Frame hashing routes ─────────────────────────────────────────────────────

@app.route('/hash-frames', methods=['POST'])
def hash_frames():
    tmp_path = None
    try:
        file = request.files.get('media')
        if not file:
            return jsonify({'error': 'No file provided'}), 400

        suffix = os.path.splitext(file.filename)[1] or '.webm'
        tmp_path = save_upload(file, suffix)

        result = extract_and_hash_frames(tmp_path)

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.route('/verify-frames', methods=['POST'])
def verify_frames():
    tmp_path = None
    try:
        file = request.files.get('media')
        stored_hashes = request.form.get('storedHashes')

        if not file or not stored_hashes:
            return jsonify({'error': 'Missing file or stored hashes'}), 400

        stored_hashes = json.loads(stored_hashes)

        suffix = os.path.splitext(file.filename)[1] or '.webm'
        tmp_path = save_upload(file, suffix)

        print(f"Verifying video: {tmp_path}")
        print(f"Stored hashes count: {len(stored_hashes)}")

        result = verify_frame_hashes(tmp_path, stored_hashes)

        print(f"Verification result: {result.get('verdict')} - {result.get('tampered_count')} tampered")

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.route('/hash-image', methods=['POST'])
def hash_image_route():
    tmp_path = None
    try:
        file = request.files.get('media')
        if not file:
            return jsonify({'error': 'No file provided'}), 400

        suffix = os.path.splitext(file.filename)[1] or '.png'
        tmp_path = save_upload(file, suffix)

        result = hash_image(tmp_path)

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.route('/verify-image', methods=['POST'])
def verify_image_route():
    tmp_path = None
    try:
        file = request.files.get('media')
        stored_block_hashes = request.form.get('storedBlockHashes')
        stored_overall_hash = request.form.get('storedOverallHash')

        if not file or not stored_block_hashes:
            return jsonify({'error': 'Missing file or stored hashes'}), 400

        stored_block_hashes = json.loads(stored_block_hashes)

        suffix = os.path.splitext(file.filename)[1] or '.png'
        tmp_path = save_upload(file, suffix)

        result = verify_image_blocks(
            tmp_path,
            stored_block_hashes,
            stored_overall_hash
        )

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == '__main__':
    app.run(debug=True, port=5001)