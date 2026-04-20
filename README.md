# Surgical PDF Engine V2

**Absolute Vector-Level PDF Surgery & OCR-Powered Layout Reconstruction.**

Surgical PDF Engine V2 is a high-precision document modification tool designed for professional-grade PDF editing. Unlike standard editors that treat PDFs as flat images, Surgical PDF Engine reconstructs the underlying vector layout, allowing for surgical precision in text replacement and element positioning.

## 🚀 Core Features

- **Reconstructive Vector Parsing:** Directly analyzes PDF command streams to identify exact coordinates, font metrics, and layer hierarchies.
- **Hybrid OCR Engine:**
  - **Browser-Side:** Fast, localized OCR using `Tesseract.js` with **Advanced Confidence Filtering** (>60%) to eliminate noise.
  - **Server-Side (Advanced):** High-precision OCR using `ocrmypdf` with support for multiple engines:
    - **Tesseract:** Reliable general-purpose OCR.
    - **PaddleOCR:** Superior accuracy for stylized fonts and handwriting.
    - **EasyOCR:** Optimized for complex layouts and diverse character sets.
- **Paperless-ngx Bridge:** One-click synchronization to send edited documents directly to your document management system with preserved metadata.

## 🛠️ Technical Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand.
- **Backend (OCR & API):** Python (Flask) wrapping `ocrmypdf` and `requests` for external integrations.
- **System Dependencies:** `ghostscript`, `qpdf`, `tesseract-ocr`.

## ⚙️ System Dependencies

The backend OCR service relies on several system-level binaries to process PDFs. Ensure these are installed on your host system or inside your container:

- **Ghostscript (`gs`):** Required for PDF rendering and optimization.
- **Tesseract OCR (`tesseract`):** The core engine for text recognition.
- **qpdf (`qpdf`):** Used for structural PDF transformations.

### Installation

#### Debian/Ubuntu
```bash
sudo apt-get update && sudo apt-get install -y ghostscript tesseract-ocr qpdf
```

#### macOS (Homebrew)
```bash
brew install ghostscript tesseract qpdf
```

#### Docker
The provided `Dockerfile` already handles these dependencies automatically.

## ⚙️ Configuration (Environment Variables)

For Paperless-ngx integration, set the following variables in your environment or Docker container:
- `PAPERLESS_URL`: Your Paperless instance URL (e.g., `https://paperless.example.com`).
- `PAPERLESS_TOKEN`: Your API Secret Token.
- `PAPERLESS_CUSTOM_FIELD_ID_CERT_NUMBER`: ID of the custom field for Certificate Number.
- `PAPERLESS_CUSTOM_FIELD_ID_ISSUE_DATE`: ID of the custom field for Issue Date.
- `PAPERLESS_CUSTOM_FIELD_ID_RECIPIENT`: ID of the custom field for Recipient Name.

### Finding Custom Field IDs
You can find these IDs by querying the Paperless API:
```bash
curl -H "Authorization: Token YOUR_TOKEN" https://paperless.example.com/api/custom_fields/
```

## 📦 Installation & Setup

1. **Clone & Install:**
   ```bash
   pnpm install
   ```

2. **Run via Docker (Recommended):**
   ```bash
   docker build -t surgical-pdf-engine .
   docker run -p 5001:5001 -e PAPERLESS_URL=... -e PAPERLESS_TOKEN=... surgical-pdf-engine
   ```

3. **Development Mode (Manual):**
   ```bash
   # Start OCR service
   python3 server/ocr_service.py
   # Start Frontend
   npm run dev
   ```

## 📖 How it Works

1. **Upload:** Process any PDF document.
2. **Scan:** The engine performs a dual-pass scan (Vector + OCR) to identify editable nodes.
3. **Surgically Edit:** Replace values, adjust font sizes, and toggle styles.
4. **Compile:** Export a high-fidelity native PDF.

## 🛡️ License

MIT License. Developed by Oracle69 Systems.
