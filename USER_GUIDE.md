# Surgical PDF Engine V2: Professional User Guide

Welcome to Surgical PDF Engine V2. This guide provides comprehensive instructions on how to use the editor to surgically modify PDF documents with absolute vector-level precision.

## 🏁 1. Getting Started

1.  **Launch the App:** Open the Surgical PDF Engine V2 in your browser.
2.  **Upload Your Document:** On the home screen, click the **"Upload PDF Document"** box or drag and drop your file.
    -   *Note: Both native vector PDFs and scanned image PDFs are supported. The engine automatically chooses the best extraction method.*

## 🔍 2. Scanning & Layout Reconstruction

Once uploaded, the system performs a dual-pass analysis of the document.

1.  **Vector Pass:** Extracts native text coordinates and font metadata.
2.  **OCR Pass:** If no vector text is found (common in scanned documents), the integrated OCR engine analyzes the image layer to reconstruct editable nodes.

### Visual Indicators:
-   **Blue Blocks:** Native vector text nodes.
-   **Amber Blocks:** High-probability candidate fields (detected via pattern matching).
-   **Green Blocks:** Active nodes currently in the editing sidebar.

## ✍️ 3. Precision Editing

1.  **Activating a Node:** Click any highlighted block on the document to add it to the sidebar.
2.  **Modifying Values:**
    -   Update the text in the **"Replacement Value"** field.
    -   Changes are reflected instantly in the preview.
3.  **Fine-Tuning:**
    -   **Drag & Drop:** Move elements directly on the canvas. The engine handles coordinate translation automatically.
    -   **Font Size:** Adjust the pt size for perfect matching.
    -   **Styles:** Apply **Bold** or *Italic* formatting.
    -   **Smart Masking (M):** Enable masking to digitally white-out the original text, ensuring no "ghosting" occurs in the final export.

## ➕ 4. Manual Node Insertion

For elements not detected automatically:
1.  Click **"ADD NODE"** in the sidebar.
2.  A new node will be initialized at the document center.
3.  Drag to target position and configure as needed.

## 📥 5. Finalizing & Exporting

1.  **Render Preview:** Switch modes to see the final document without diagnostic overlays.
2.  **Compile Native PDF:** Click the final export button. The engine will perform a native vector composition, creating a high-fidelity PDF that remains searchable and professional.

---

### 💡 Engineering Tips

-   **Debug Console:** Toggle **"Debug ON"** to see real-time coordinate matrices and system logs.
-   **Reset Engine:** Use the **X** button to clear the current session and process a new document.
-   **Viewport Scaling:** The editor uses dynamic scaling to fit any document size while maintaining a 1:1 point relationship.
