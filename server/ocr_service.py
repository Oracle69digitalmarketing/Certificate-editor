import os
import tempfile
import subprocess
import requests
import json
import re
from datetime import datetime
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

def extract_certificate_metadata(text):
    """Extract structured data from OCR text using regex patterns."""
    metadata = {}

    # Certificate Number (e.g., "Cert No: ABC-12345" or "Serial: 2025-001")
    cert_patterns = [
        r'(?:Certificate|Cert|Serial)\s*(?:No|Number|ID)?[:\s#]*([A-Z0-9\-]+)',
        r'Ref\s*No[:\s]*([A-Z0-9\-]+)'
    ]
    for pattern in cert_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['certificate_number'] = match.group(1).strip()
            break

    # Date (MM/DD/YYYY, DD-MM-YYYY, Month DD, YYYY)
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'([A-Z][a-z]+ \d{1,2},? \d{4})'
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            date_str = match.group(0)
            try:
                parsed = None
                if '/' in date_str or '-' in date_str:
                    for fmt in ("%m/%d/%Y", "%d-%m-%Y", "%Y-%m-%d"):
                        try:
                            parsed = datetime.strptime(date_str, fmt)
                            break
                        except:
                            pass
                else:
                    parsed = datetime.strptime(date_str.replace(',', ''), "%B %d %Y")
                
                if parsed:
                    metadata['issue_date'] = parsed.strftime("%Y-%m-%d")
            except:
                pass
            break

    # Recipient Name
    name_patterns = [
        r'(?:awarded to|presented to|recipient|certifies that)\s*[:\n]*([A-Z][a-z]+ [A-Z][a-z]+)',
        r'This is to certify that\s+([A-Z][a-z]+ [A-Z][a-z]+)'
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            metadata['recipient_name'] = match.group(1).strip()
            break

    return metadata

@app.route('/ocr', methods=['POST'])
def process_ocr():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    engine = request.form.get('engine', 'tesseract')

    if engine not in ENGINE_PLUGINS:
        return jsonify({'error': f'Unsupported engine: {engine}'}), 400

    fd, input_path = tempfile.mkstemp(suffix='.pdf')
    os.close(fd)
    output_path = input_path.replace('.pdf', '_ocr.pdf')

    try:
        file.save(input_path)
        cmd = ["ocrmypdf", "--force-ocr", "--deskew", "--clean", "--language", "eng", "--optimize", "1"]
        plugin_name = ENGINE_PLUGINS[engine]
        if plugin_name:
            cmd.extend(["--plugin", plugin_name])
        cmd.extend([input_path, output_path])
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            return jsonify({'error': 'OCR failed', 'details': result.stderr}), 500

        return send_file(output_path, mimetype='application/pdf', as_attachment=True, download_name='processed_document.pdf')
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(input_path):
            os.unlink(input_path)

@app.route('/paperless/upload', methods=['POST'])
def upload_to_paperless():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    metadata_json = request.form.get('metadata', '{}')
    ocr_text = request.form.get('ocr_text', '')
    
    try:
        metadata = json.loads(metadata_json)
    except:
        metadata = {}
    
    extracted = extract_certificate_metadata(ocr_text) if ocr_text else {}
    
    PAPERLESS_URL = os.environ.get('PAPERLESS_URL')
    PAPERLESS_TOKEN = os.environ.get('PAPERLESS_TOKEN')
    
    if not PAPERLESS_URL or not PAPERLESS_TOKEN:
        return jsonify({'error': 'Paperless configuration missing'}), 500

    try:
        headers = {'Authorization': f'Token {PAPERLESS_TOKEN}'}
        files = {'document': (file.filename, file.read(), 'application/pdf')}
        
        title = extracted.get('recipient_name') or metadata.get('title') or file.filename
        data = {'title': title}
        
        if 'tags' in metadata:
            data['tags'] = metadata['tags']
            
        custom_fields = metadata.get('custom_fields', [])
        field_mappings = [
            ('certificate_number', 'PAPERLESS_CUSTOM_FIELD_ID_CERT_NUMBER'),
            ('issue_date', 'PAPERLESS_CUSTOM_FIELD_ID_ISSUE_DATE'),
            ('recipient_name', 'PAPERLESS_CUSTOM_FIELD_ID_RECIPIENT')
        ]
        
        for key, env_var in field_mappings:
            if key in extracted:
                field_id = os.environ.get(env_var)
                if field_id:
                    if not any(f.get('field') == int(field_id) for f in custom_fields):
                        custom_fields.append({"field": int(field_id), "value": extracted[key]})
        
        if custom_fields:
            data['custom_fields'] = custom_fields
        
        response = requests.post(f"{PAPERLESS_URL}/api/documents/post_document/", headers=headers, files=files, data=data)
        
        if response.status_code in [200, 201]:
            return jsonify({'success': True, 'paperless_response': response.json()})
        else:
            return jsonify({'error': 'Paperless upload failed', 'details': response.text}), response.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    static_folder = os.path.join(os.path.dirname(__file__), '../client/dist')
    file_path = os.path.join(static_folder, path)
    if path and os.path.isfile(file_path):
        return send_from_directory(static_folder, path)
    index_path = os.path.join(static_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(static_folder, 'index.html')
    return "Frontend not built. Run 'npm run build' first.", 404

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
