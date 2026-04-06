# Document Engine V2: User Guide

Welcome to Document Engine V2. This guide provides step-by-step instructions on how to use the editor to surgically modify PDF documents with vector-level precision.

## 🏁 1. Getting Started

1.  **Launch the App:** Open the Document Engine V2 in your browser.
2.  **Upload Your Document:** On the home screen, click the **"Upload PDF Document"** box or drag and drop your file.
    -   *Note: Only native PDF files with text layers are recommended for full feature support. Scanned image PDFs will function in "Manual Mode".*

## 🔍 2. Scanning & Element Detection

Once uploaded, the system automatically analyzes the document's vector layout.

1.  **Automatic Detection:** The engine will highlight detected text nodes with dashed boxes.
    -   **Blue Blocks:** Raw text nodes.
    -   **Amber Blocks:** High-probability candidate fields (Names, Degrees, Dates).
    -   **Green Blocks:** Already active/selected for editing.
2.  **Auto-Activation:** The system intelligently selects the top 3 most relevant fields for you as a starting point.

## ✍️ 3. Editing Layer Elements

1.  **Selecting an Element:** Click any highlighted block on the document to move it to the **"Active Mapping"** sidebar.
2.  **Modifying Text:**
    -   Type the new value in the **"Replacement Value"** input field.
    -   The document preview will update in real-time.
3.  **Fine-Tuning:**
    -   **Positioning:** Drag elements directly on the document to adjust their placement.
    -   **Font Size:** Use the pt input to resize text.
    -   **Styling:** Toggle **Bold (B)** or *Italic (I)* formatting.
    -   **Smart Masking (M):** Enable masking to hide the original text behind the replacement. This ensures a clean look without "ghosting".

## ➕ 4. Manual Node Insertion

If a specific text block wasn't detected automatically:
1.  Click the **"ADD NODE"** button in the sidebar.
2.  A new node will appear at the center of the document.
3.  Drag it to your desired location and edit its value.

## 📥 5. Finalizing & Exporting

1.  **Verify & Preview:** Switch to the **"Render Preview"** mode to see exactly how your final PDF will look without editing overlays.
2.  **Compile Native PDF:** Click the **"Compile Native PDF"** button. The engine will:
    -   Apply all vector modifications.
    -   Maintain original font and layout metadata.
    -   Download a high-fidelity, searchable PDF directly to your device.

---

### 💡 Pro Tips

-   **Debug Mode:** Toggle **"Debug ON"** in the header to view low-level coordinate matrices and system stats.
-   **Undo/Reset:** Use the **X** button in the header to clear all edits and start fresh with a new document.
-   **Precision:** For precise alignment, use the sidebar inputs for font size and replacement value before dragging.
