# Document Engine V2: Precision Vector Layout Reconstructor

Document Engine V2 is a high-performance, browser-based PDF layout analysis and modification system. Designed for extreme precision, it reconstructs native PDF vector layers into an interactive DOM-mapped workspace, allowing for surgical edits with absolute 1:1 coordinate accuracy.

## 🚀 Key Features

- **Strict Vector Parsing:** Utilizes a custom reconstruction engine to extract text nodes, font matrices, and absolute coordinates directly from the PDF's native stream.
- **Dynamic 1:1 Coordinate Mapping:** Ensures that every interaction on the viewport translates perfectly to PDF points (pt), maintaining layout integrity across all devices.
- **Intelligent Field Detection:** Employs rule-based heuristics to automatically identify and categorize certificate fields such as Names, Degrees, Dates, and Serial IDs.
- **Smart Masking Technology:** Implements opaque vector overlays to seamlessly "white-out" original document parts before re-layering edited content.
- **Native Vector Export:** Unlike raster-based editors, Document Engine V2 recompiles a clean, selectable, and searchable vector PDF using `pdf-lib`.
- **Real-time Preview Engine:** Leverages Framer Motion for a fluid, high-fidelity editing experience.

## 🛠 Technical Stack

- **Framework:** React 19 (TypeScript)
- **Build System:** Vite 7
- **State Management:** Zustand (Single source of truth)
- **PDF Core:** `pdfjs-dist` (Parsing) & `pdf-lib` (Export)
- **Styling:** Tailwind CSS + Radix UI Primitives
- **Animations:** Framer Motion
- **Icons:** Lucide React

## 📂 Project Structure

```text
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Modular UI & Layout components
│   │   ├── pages/       # Core views (Editor, Upload)
│   │   ├── hooks/       # Custom React logic
│   │   └── lib/         # Utility functions
├── server/              # Node.js backend (if applicable)
├── shared/              # Shared constants and types
└── package.json         # Project dependencies
```

## 🛠 Installation & Development

### Prerequisites

- **Node.js:** v18+ (Recommended v20+)
- **pnpm:** v10+

### Setup

1. **Clone and Install:**
   ```bash
   pnpm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root directory (refer to `.env.example` if available).

3. **Start Development Server:**
   ```bash
   pnpm run dev
   ```

## 👨‍💻 Author

Developed by **Oracle69 Systems**.

## 📜 License

MIT License. See `LICENSE` for details.
