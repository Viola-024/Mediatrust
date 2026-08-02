from flask import Flask, request, jsonify
from watermark_embed import embed_watermark_to_image
from watermark_extract import extract_watermark_from_image
import os

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/embed', methods=['POST'])
def embed():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    watermark_data = request.form.get('watermark_data', '{}')
    
    import json
    watermark_dict = json.loads(watermark_data)
    
    input_path = os.path.join(UPLOAD_FOLDER, 'input_' + file.filename)
    output_path = os.path.join(UPLOAD_FOLDER, 'watermarked_' + file.filename)
    
    file.save(input_path)
    result = embed_watermark_to_image(input_path, watermark_dict, output_path)
    
    return jsonify(result)

@app.route('/extract', methods=['POST'])
def extract():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files['image']
    input_path = os.path.join(UPLOAD_FOLDER, 'extract_' + file.filename)
    file.save(input_path)
    
    result = extract_watermark_from_image(input_path)
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "Watermark service running"})

if __name__ == '__main__':
    app.run(port=5001, debug=True)