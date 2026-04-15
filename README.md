# Surgical PDF Engine V2

**Absolute Vector-Level PDF Surgery & OCR-Powered Layout Reconstruction.**

Surgical PDF Engine V2 is a high-precision document modification tool designed for professional-grade PDF editing. Unlike standard editors that treat PDFs as flat images, Surgical PDF Engine reconstructs the underlying vector layout, allowing for surgical precision in text replacement and element positioning.

## 🚀 Core Features

- **Reconstructive Vector Parsing:** Directly analyzes PDF command streams to identify exact coordinates, font metrics, and layer hierarchies.
- **Intelligent OCR Fallback:** Integrated with `Tesseract.js` to handle scanned or "image-only" PDFs, automatically detecting text layers where native data is missing.
- **Absolute Positioning Engine:** Drag-and-drop interface with 1:1 viewport-to-PDF point mapping for pixel-perfect alignment.
- **Non-Destructive Editing:** Surgical replacement of text nodes using "Smart Masking" to seamlessly hide original content without affecting the document's vector integrity.
- **Native PDF Export:** Compiles modifications back into a standard, searchable PDF document while maintaining original metadata and layout.
- **Real-Time Render Matrix:** A high-performance preview system that renders documents at 3.0x scale for ultra-clear visibility during the editing phase.

## 🛠️ Technical Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Framer Motion.
- **Layout Parsing:** `PDF.js` (Custom Vector Matrix Implementation).
- **OCR Engine:** `Tesseract.js`.
- **Export Engine:** `PDF-lib` (Native Vector Composition).
- **State Management:** Zustand.

## 📦 Installation & Setup

1. **Clone & Install:**
   ```bash
   pnpm install
   ```

2. **Development Mode:**
   ```bash
   npm run dev
   ```

3. **Production Build:**
   ```bash
   npm run build
   npm run start
   ```

## 📖 How it Works

1. **Upload:** Process any PDF document.
2. **Scan:** The engine performs a dual-pass scan (Vector + OCR) to identify editable nodes.
3. **Surgically Edit:** Replace values, adjust font sizes, and toggle styles.
4. **Compile:** Export a high-fidelity native PDF.

## 🛡️ License

MIT License. Developed by Oracle69 Systems.
