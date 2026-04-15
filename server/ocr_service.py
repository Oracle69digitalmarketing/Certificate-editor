import os
import tempfile
import subprocess
import requests
import json
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Map engine names to ocrmypdf plugin names
ENGINE_PLUGINS = {
    'tesseract': None,          # Default Tesseract (no plugin needed)
    'paddle': 'ocrmypdf_paddleocr',
    'easyocr': 'ocrmypdf_easyocr'
}

@app.route('/ocr', methods=['POST'])
def process_ocr():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    engine = request.form.get('engine', 'tesseract')  # Default to Tesseract

    if engine not in ENGINE_PLUGINS:
        return jsonify({'error': f'Unsupported engine: {engine}'}), 400

    # Create temporary files
    fd, input_path = tempfile.mkstemp(suffix='.pdf')
    os.close(fd)
    
    output_path = input_path.replace('.pdf', '_ocr.pdf')

    try:
        file.save(input_path)
        
        # Build ocrmypdf command
        cmd = [
            "ocrmypdf",
            "--force-ocr",
            "--deskew",
            "--clean",
            "--language", "eng",
            "--optimize", "1",
        ]

        plugin_name = ENGINE_PLUGINS[engine]
        if plugin_name:
            cmd.extend(["--plugin", plugin_name])

        cmd.extend([input_path, output_path])
        
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print("OCR Error:", result.stderr)
            return jsonify({'error': 'OCR failed', 'details': result.stderr}), 500

        # Return processed file
        return send_file(
            output_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='processed_document.pdf'
        )
    except Exception as e:
        print("System Error:", str(e))
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temp files
        if os.path.exists(input_path):
            os.unlink(input_path)
        # Note: we might want to delete output_path after some delay or use a better cleanup strategy

@app.route('/paperless/upload', methods=['POST'])
def upload_to_paperless():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    metadata_json = request.form.get('metadata', '{}')
    
    try:
        metadata = json.loads(metadata_json)
    except:
        metadata = {}
    
    # Paperless API configuration
    PAPERLESS_URL = os.environ.get('PAPERLESS_URL')
    PAPERLESS_TOKEN = os.environ.get('PAPERLESS_TOKEN')
    
    if not PAPERLESS_URL or not PAPERLESS_TOKEN:
        return jsonify({'error': 'Paperless configuration missing (PAPERLESS_URL/PAPERLESS_TOKEN)'}), 500

    try:
        headers = {
            'Authorization': f'Token {PAPERLESS_TOKEN}'
        }
        
        # Prepare file for requests
        file_content = file.read()
        files = {
            'document': (file.filename, file_content, 'application/pdf')
        }
        
        # Enhanced data mapping
        data = {
            'title': metadata.get('title', file.filename),
        }
        
        # If user provided tags (list of IDs)
        if 'tags' in metadata:
            data['tags'] = metadata['tags']
            
        # Mapping custom fields if IDs are known
        # In production, you'd map "Certificate ID" string to a Paperless Field ID
        if 'custom_fields' in metadata:
            data['custom_fields'] = metadata['custom_fields']
        
        # Send to Paperless-ngx
        response = requests.post(f"{PAPERLESS_URL}/api/documents/post_document/", 
                                headers=headers, 
                                files=files,
                                data=data)
        
        if response.status_code in [200, 201]:
            return jsonify({'success': True, 'paperless_response': response.json()})
        else:
            return jsonify({'error': 'Paperless upload failed', 'details': response.text}), response.status_code
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Serve React static files
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    static_folder = os.path.join(os.path.dirname(__file__), '../client/dist')
    
    # Check if path is a file in the static folder
    file_path = os.path.join(static_folder, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(static_folder, path)
    
    # Fallback to index.html for SPA routing
    index_path = os.path.join(static_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder, 'index.html')
    return "Frontend not built. Run 'npm run build' first.", 404

if __name__ == '__main__':
    # Run on port 5001 to avoid conflict with standard React dev port if running on same host
    app.run(host='0.0.0.0', port=5001, debug=False)
