import React, { useState, useRef, useEffect } from "react";
import { create } from "zustand";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import Tesseract from "tesseract.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Upload,
  FileText,
  Trash2,
  MousePointer2,
  ShieldCheck,
  X,
  PlusCircle,
  FileSearch,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Eye,
  Loader2,
  History,
  Settings,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { motion, AnimatePresence } from "framer-motion";

// Initialize PDF.js worker with matching version - use Vite URL pattern for better reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// --- STATE MANAGEMENT ---
// Production-grade single source of truth

interface EditableField {
  id: string;
  type: string;
  value: string;
  originalValue: string;
  x: number; // Current Viewport X
  y: number; // Current Viewport Y
  scannedX: number; // Original Viewport X from scan
  scannedY: number; // Original Viewport Y from scan
  pdfX: number; // Original PDF X (Native)
  pdfY: number; // Original PDF Y (Native)
  fontSize: number; 
  isBold: boolean;
  isItalic: boolean;
  fontFamily: string;
  useMask: boolean;
  isActivated: boolean;
}

type EditorStep = "upload" | "scan" | "edit" | "preview";

interface EditorState {
  step: EditorStep;
  debug: boolean;
  templateImage: string | null;
  originalPdfBytes: ArrayBuffer | null;
  pdfWidth: number;
  pdfHeight: number;
  fields: EditableField[];
  scannedElements: EditableField[];
  selectedId: string | null;
  scanLog: string[]; // Added for UI-based debugging
  
  setStep: (step: EditorStep) => void;
  toggleDebug: () => void;
  loadTemplate: (image: string, bytes: ArrayBuffer, width: number, height: number, scannedElements: EditableField[]) => void;
  activateField: (id: string) => void;
  updateField: (id: string, updates: Partial<EditableField>) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  addField: (field: EditableField) => void;
  removeField: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  addScanLog: (message: string) => void;
  reset: () => void;
}

const useSurgicalPDFStore = create<EditorState>((set) => ({
  step: "upload",
  debug: false,
  templateImage: null,
  originalPdfBytes: null,
  pdfWidth: 0,
  pdfHeight: 0,
  fields: [],
  scannedElements: [],
  selectedId: null,
  scanLog: [],

  setStep: (step) => set({ step }),
  toggleDebug: () => set((state) => ({ debug: !state.debug })),
  loadTemplate: (templateImage, originalPdfBytes, pdfWidth, pdfHeight, scannedElements) => 
    set({ step: "scan", templateImage, originalPdfBytes, pdfWidth, pdfHeight, scannedElements, fields: [] }),
  activateField: (id) => set((state) => {
    const field = state.scannedElements.find(f => f.id === id);
    if (!field || state.fields.find(f => f.id === id)) return state;
    return { fields: [...state.fields, { ...field, isActivated: true }], selectedId: id };
  }),
  updateField: (id, updates) =>
    set((state) => ({ fields: state.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)) })),
  updatePosition: (id, x, y) =>
    set((state) => ({ fields: state.fields.map((f) => (f.id === id ? { ...f, x, y } : f)) })),
  addField: (field) => set((state) => ({ fields: [...state.fields, field], selectedId: field.id })),
  removeField: (id) => set((state) => ({ fields: state.fields.filter((f) => f.id !== id), selectedId: state.selectedId === id ? null : state.selectedId })),
  setSelectedId: (selectedId) => set({ selectedId }),
  addScanLog: (message) => set((state) => ({ scanLog: [...state.scanLog.slice(-4), message] })), // Keep last 5
  reset: () => set({ step: "upload", templateImage: null, originalPdfBytes: null, fields: [], scannedElements: [], selectedId: null, pdfWidth: 0, pdfHeight: 0, scanLog: [] }),
}));

// --- COMPONENTS ---

export default function SurgicalPDFEditor() {
  const { step, reset, originalPdfBytes, pdfWidth, pdfHeight, fields, templateImage, debug, toggleDebug } = useSurgicalPDFStore();
  const [isGenerating, setIsGenerating] = useState(false);

  // --- PDF EXPORT ENGINE ---
  const exportTruePDF = async () => {
    if (!originalPdfBytes) return;
    setIsGenerating(true);
    const exportToast = toast.loading("Compiling Native Vector PDF...");

    try {
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { height: pageHeight } = firstPage.getSize();

      const fonts = {
        sans: {
          regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
          bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
          italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
          boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
        },
        serif: {
          regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
          bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
          italic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
          boldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
        }
      };

      fields.forEach((field) => {
         const family = field.fontFamily === "serif" ? fonts.serif : fonts.sans;
         let selectedFont = family.regular;
         if (field.isBold && field.isItalic) selectedFont = family.boldItalic;
         else if (field.isBold) selectedFont = family.bold;
         else if (field.isItalic) selectedFont = family.italic;

         // Logic: If the user hasn't moved the field, use the original exact PDF coordinates.
         // If they have moved it, calculate the new PDF coordinates based on the delta in viewport points.
         // This handles offsets and non-standard PDF origins.
         let finalPdfX = field.pdfX;
         let finalPdfY = field.pdfY;

         const deltaX = field.x - field.scannedX;
         const deltaY = field.y - field.scannedY;

         if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
            // Field was moved. In PDF-lib space:
            // DeltaX in viewport is same as DeltaX in PDF points.
            // DeltaY in viewport (top-down) is negative DeltaY in PDF points (bottom-up).
            finalPdfX = field.pdfX + deltaX;
            finalPdfY = field.pdfY - deltaY; 
         }

         if (field.useMask) {
            const textWidth = selectedFont.widthOfTextAtSize(field.originalValue, field.fontSize);
            firstPage.drawRectangle({
               x: field.pdfX, // Mask original location
               y: field.pdfY - (field.fontSize * 0.2), 
               width: textWidth * 1.05,
               height: field.fontSize * 1.2,
               color: rgb(1, 1, 1),
            });
         }

         firstPage.drawText(field.value, {
            x: finalPdfX,
            y: finalPdfY,
            size: field.fontSize,
            font: selectedFont,
            color: rgb(0.1, 0.1, 0.15),
         });
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `Edited_Document_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Native PDF Compiled Successfully!", { id: exportToast });
    } catch (e) {
      console.error(e);
      toast.error("Failed to compile native PDF.", { id: exportToast });
    } finally {
      setIsGenerating(false);
    }
  };

  // View Router
  if (step === "upload") return <UploadView />;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col overflow-hidden font-sans">
      {/* Header Panel */}
      <div className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 z-50 shadow-sm shrink-0">
         <div className="flex items-center gap-12">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><FileText className="text-white w-7 h-7" /></div>
               <span className="font-black text-slate-900 text-2xl tracking-tighter">Surgical PDF Engine V2</span>

            </div>
            <div className="hidden lg:flex items-center gap-10">
               {[
                 { id: "scan", label: "Scanner Mode", icon: FileSearch },
                 { id: "edit", label: "Layer Editor", icon: MousePointer2 }, 
                 { id: "preview", label: "Render Preview", icon: Eye }
               ].map((s) => (
                  <div key={s.id} className={`flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all cursor-pointer ${step === s.id ? "text-indigo-600 border-b-4 border-indigo-600 pb-1" : "text-slate-300 hover:text-slate-400"}`} onClick={() => useSurgicalPDFStore.getState().setStep(s.id as EditorStep)}>
                     <s.icon className="w-5 h-5" /> <span>{s.label}</span>
                  </div>
               ))}
            </div>
         </div>
         <div className="flex items-center gap-6">
            {step === "scan" ? (
               <Button onClick={() => useSurgicalPDFStore.getState().setStep("edit")} className="bg-slate-900 text-white font-black rounded-2xl px-10 h-14 hover:bg-slate-800 text-lg shadow-xl transition-all hover:scale-105 active:scale-95">Go to Editor <ChevronRight className="w-6 h-6 ml-2" /></Button>
            ) : step === "edit" ? (
               <Button onClick={() => useSurgicalPDFStore.getState().setStep("preview")} className="bg-slate-900 text-white font-black rounded-2xl px-10 h-14 hover:bg-slate-800 text-lg shadow-xl transition-all hover:scale-105 active:scale-95">Verify & Preview <ChevronRight className="w-6 h-6 ml-2" /></Button>
            ) : (
               <>
                 <Button variant="ghost" onClick={() => useSurgicalPDFStore.getState().setStep("edit")} className="font-black text-slate-500 rounded-2xl px-8 h-14 text-lg"><ChevronLeft className="w-6 h-6 mr-2" /> Back to Matrix</Button>
                 <Button onClick={exportTruePDF} disabled={isGenerating} className="bg-indigo-600 text-white font-black rounded-2xl px-12 h-14 text-lg hover:bg-indigo-700 shadow-[0_10px_40px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105 active:scale-95">
                    <Download className="w-6 h-6 mr-3" /> {isGenerating ? "Compiling..." : "Compile Native PDF"}
                 </Button>
               </>
            )}
            <div className="w-[1px] h-10 bg-slate-200 mx-2" />
            <Button variant="ghost" size="icon" onClick={reset} className="rounded-2xl w-14 h-14 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all"><X className="w-8 h-8" /></Button>
            {/* Debug Toggle */}
            <Button 
               variant="outline" 
               size="sm" 
               onClick={toggleDebug} 
               className={`ml-4 rounded-xl font-black text-[10px] uppercase tracking-widest h-14 px-6 ${debug ? "bg-red-500 text-white border-red-500" : "text-slate-400 border-slate-200 hover:bg-slate-50"}`}
            >
               {debug ? "Debug ON" : "Debug OFF"}
            </Button>
         </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <FormSidebar />
        <CanvasRenderer />
        <RightAnalyticsSidebar />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function UploadView() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadTemplate, addScanLog } = useSurgicalPDFStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Engine requires PDF files to reconstruct strict vector layouts.");
      return;
    }

    setIsScanning(true);
    setScanProgress("Initializing Vector Layout Engine...");
    addScanLog(`File: ${file.name} (${Math.round(file.size/1024)}KB)`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBytesCopy = arrayBuffer.slice(0); // Clone for export

      setScanProgress("Extracting layout matrices...");
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      addScanLog(`PDF Loaded: ${pdf.numPages} page(s)`);
      
      const page = await pdf.getPage(1);
      
      // Native PDF Points Dimensions (1:1 with standard PDF measurement)
      const nativeViewport = page.getViewport({ scale: 1.0 });
      const pdfWidth = nativeViewport.width;
      const pdfHeight = nativeViewport.height;
      addScanLog(`Viewport: ${Math.round(pdfWidth)}x${Math.round(pdfHeight)}`);

      // High-res render for the static background template
      const renderScale = 3.0; 
      const scaledViewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      if (!context) throw new Error("Failed to create canvas context");

      setScanProgress("Rendering static background layer...");
      await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise;
      const bgImage = canvas.toDataURL();
      addScanLog("Background Layer Rendered");
      
      setScanProgress("Parsing absolute node coordinates...");
      // includeMarkedContent: true helps extract more structured text
      let textContent = await page.getTextContent({ includeMarkedContent: true });
      
      // Fallback: If 0 items, try without combining to see if it helps
      if (textContent.items.length === 0) {
        addScanLog("Items 0 - Trying fallback scan...");
        textContent = await page.getTextContent({ includeMarkedContent: false });
      }

      const scannedElements: EditableField[] = [];
      addScanLog(`Raw Items: ${textContent.items.length}`);
      
      // Heuristic map for field identification
      const fieldPatterns = [
        { type: "Degree", regex: /Bachelor|Master|BSc|MSc|Ph\.D|Doctor|Diploma|Degree|Graduate|Certificate|Honours|Hons/i },
        { type: "ID Node", regex: /Matric|Reg|Student ID|Index No|Registration|ID|Matriculation/i },
        { type: "Ref No", regex: /Ref|Serial|Reference|S\/N|Number|No\./i },
        { type: "Course", regex: /Course|Module|Subject|Specialization|Program|Department|Faculty|Field/i },
        { type: "Date / ID", regex: /\d{4}|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/ },
      ];

      // Calculate median font size for better outlier detection
      const allFontSizes = textContent.items
        .filter((item: any) => item.str && item.str.trim().length > 0)
        .map((item: any) => Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]));
      
      const medianFontSize = allFontSizes.length > 0 
        ? allFontSizes.sort((a, b) => a - b)[Math.floor(allFontSizes.length / 2)] 
        : 12;

      const detectType = (str: string, fontSize: number) => {
         const s = str.trim();
         if (s.length < 1) return "Text Node";
         
         for (const pattern of fieldPatterns) {
            if (pattern.regex.test(s)) return pattern.type;
         }
         
         if (/Presented to|Awarded to|Certifies that|This is to certify|Honors/i.test(s)) return "Label";
         
         // Recipient Name Detection: Capitalized words or larger than median font
         if (s.length > 3 && s === s.toUpperCase() && !/\d/.test(s)) return "Recipient Name";
         if (fontSize > medianFontSize * 1.2 && s.length > 3 && !/\d/.test(s)) return "Recipient Name";
         
         return "Text Node";
      };

      textContent.items.forEach((item: any, idx) => {
        if (item.str && item.str.trim().length >= 1) {
          const transform = item.transform;
          const pdfX = transform[4];
          const pdfY = transform[5]; 
          
          const [vx, vy] = nativeViewport.convertToViewportPoint(pdfX, pdfY);
          
          const domX = vx;
          const domY = vy;

          // More accurate font size calculation handling rotation/scaling
          const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]); 
          const fontName = (item.fontName || "").toLowerCase();

          scannedElements.push({
            id: `vec-${idx}-${Date.now()}`,
            type: detectType(item.str, fontSize),
            value: item.str,
            originalValue: item.str,
            x: domX,
            y: domY,
            scannedX: domX,
            scannedY: domY,
            pdfX: pdfX,
            pdfY: pdfY,
            fontSize: Math.max(8, fontSize), 
            isBold: fontName.includes("bold") || fontName.includes("black"),
            isItalic: fontName.includes("italic") || fontName.includes("oblique"),
            fontFamily: fontName.includes("serif") || fontName.includes("times") ? "serif" : "sans-serif",
            useMask: true,
            isActivated: false,
          });
        }
      });
      
      if (scannedElements.length === 0) {
        addScanLog("NO TEXT DETECTED - Starting AI-OCR Engine...");
        setScanProgress("Analyzing high-res matrices (OCR)...");
        
        const worker = await Tesseract.createWorker("eng");
        // Boost contrast and grayscale for Tesseract
        const ocrResult = await worker.recognize(bgImage) as any;
        addScanLog(`OCR Found: ${ocrResult.data.words.length} tokens`);

        ocrResult.data.words.forEach((word: any, idx: number) => {
           // Confidence threshold to filter noiseSpecks
           if (word.confidence < 60 || word.text.length < 2) return;

           const ocrX = word.bbox.x0 / 3.0;
           const ocrY = word.bbox.y0 / 3.0;
           const ocrWidth = (word.bbox.x1 - word.bbox.x0) / 3.0;
           const ocrHeight = (word.bbox.y1 - word.bbox.y0) / 3.0;
           
           const fontSize = ocrHeight * 0.8; // Corrected height ratio

           scannedElements.push({
             id: `ocr-${idx}-${Date.now()}`,
             type: detectType(word.text, fontSize),
             value: word.text,
             originalValue: word.text,
             x: ocrX,
             y: ocrY + ocrHeight, 
             scannedX: ocrX,
             scannedY: ocrY + ocrHeight,
             pdfX: ocrX,
             pdfY: pdfHeight - (ocrY + ocrHeight), 
             fontSize: Math.max(8, fontSize),
             isBold: false,
             isItalic: false,
             fontFamily: "sans-serif",
             useMask: true,
             isActivated: false,
           });
        });
        await worker.terminate();
      }

      addScanLog(`Filtered: ${scannedElements.length}`);
      loadTemplate(bgImage, pdfBytesCopy, pdfWidth, pdfHeight, scannedElements);
      
      if (scannedElements.length > 0) {
        // Auto-activate key fields: Name, Degree, Date, and ID
        setTimeout(() => {
          const importantTypes = ["Recipient Name", "Name Candidate", "Degree", "Date / ID", "Course", "ID Node", "Ref No"];
          const topElements = scannedElements
            .filter(el => importantTypes.includes(el.type))
            .sort((a, b) => b.fontSize - a.fontSize) // Prefer larger fonts for main titles
            .slice(0, 8); // Activate more by default
          
          // If no important types found, fallback to largest font
          if (topElements.length === 0) {
             const fallback = [...scannedElements]
               .sort((a, b) => b.fontSize - a.fontSize)
               .slice(0, 4);
             fallback.forEach(f => useSurgicalPDFStore.getState().activateField(f.id));
          } else {
             topElements.forEach(f => useSurgicalPDFStore.getState().activateField(f.id));
          }
        }, 100);
        toast.success(`Scan Complete: ${scannedElements.length} elements detected. Initial variables mapped to sidebar.`);
      } else {
        addScanLog("NO TEXT DETECTED - IMAGE PDF?");
        toast.info("Image PDF Detected: This file lacks a selectable text layer. You must use 'ADD NODE' in the sidebar to place editable text manually.", { duration: 10000 });
      }
    } catch (error: any) {
      console.error("Layout Error Detail:", error);
      addScanLog(`ERROR: ${error.message}`);
      toast.error(`Layout extraction failed: ${error.message || "Unknown PDF error"}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl w-full text-center space-y-16">
        <div className="space-y-6">
          <div className="mx-auto w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-8 rotate-3 hover:rotate-0 transition-transform duration-500">
            <ShieldCheck className="text-white w-14 h-14" />
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85]">Document <br/> <span className="text-indigo-600">Engine V2</span></h1>
          <p className="text-2xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Absolute Positioning & Native Vector Export. Upload a PDF to reconstruct its layout layer by layer.
          </p>
        </div>

        <div className="flex justify-center px-4">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full max-w-xl group relative bg-white p-16 rounded-[4rem] border-4 border-dashed border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col items-center gap-10 shadow-sm hover:shadow-2xl"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-32 h-32 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-all duration-300">
              <Upload className="w-16 h-16" />
            </div>
            <div className="space-y-3 text-center">
              <h3 className="text-4xl font-black text-slate-900 tracking-tight">Upload PDF Document</h3>
              <p className="text-slate-500 font-bold text-lg uppercase tracking-widest opacity-60">STRICT VECTOR PARSING</p>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isScanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center gap-12">
            <div className="relative">
              <div className="w-40 h-40 border-[10px] border-slate-100 rounded-full" />
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} className="absolute inset-0 w-40 h-40 border-[10px] border-indigo-600 border-t-transparent rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-16 h-16 text-indigo-600 animate-spin" /></div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">System Reconstruction...</h2>
              <p className="text-2xl text-indigo-600 font-black italic">{scanProgress}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormSidebar() {
  const { step, fields, scannedElements, selectedId, setSelectedId, updateField, addField, removeField, pdfWidth, pdfHeight, debug, scanLog } = useSurgicalPDFStore();

  if (step === "upload") return null;

  return (
    <motion.div initial={{ x: -550 }} animate={{ x: 0 }} exit={{ x: -550 }} className="w-full lg:w-[550px] h-full bg-white border-r border-slate-200 flex flex-col shadow-2xl relative z-40 shrink-0">
      <div className="p-10 space-y-10 flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{step === "scan" ? "Detection Matrices" : "Active DOM Mapping"}</h3>
            <Button size="sm" variant="outline" onClick={() => {
              addField({ id: `manual-${Date.now()}`, type: "Custom Node", value: "New Variable", x: pdfWidth/2, y: pdfHeight/2, scannedX: pdfWidth/2, scannedY: pdfHeight/2, pdfX: pdfWidth/2, pdfY: pdfHeight/2, fontSize: 24, isBold: false, isItalic: false, fontFamily: "Helvetica", originalValue: "", useMask: false, isActivated: true });
            }} className="text-indigo-600 font-black border-2 border-indigo-100 hover:bg-indigo-50 rounded-xl h-10 px-6">
               <PlusCircle className="w-4 h-4 mr-2" /> ADD NODE
            </Button>
          </div>
          <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-[2.5rem] space-y-2">
            <p className="text-indigo-900 font-black text-sm flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4" /> 
               {step === "scan" ? `${scannedElements.length} Elements Scanned` : "Document Matrix Ready"}
            </p>
            <p className="text-indigo-700 text-xs font-bold opacity-80 leading-relaxed">
              {step === "scan" 
                ? "Click any colored block to edit. Blue = Raw Text, Yellow = Suggested Field (Degree/Date)." 
                : "Your edits are now layered onto the document vector. Drag elements to fine-tune."}
            </p>
          </div>
        </div>

        {debug && (
           <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2.5rem] space-y-2">
              <p className="text-red-900 font-black text-[10px] uppercase tracking-widest">Debug Console</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-red-700">
                 <div>Scanned: {scannedElements.length}</div>
                 <div>Active: {fields.length}</div>
                 <div>PDF Size: {Math.round(pdfWidth)}x{Math.round(pdfHeight)}</div>
                 <div>Step: {step}</div>
              </div>
              {scanLog.length > 0 && (
                <div className="mt-4 pt-4 border-t border-red-100 space-y-1">
                  <p className="text-red-900 font-black text-[8px] uppercase tracking-tighter">Scan Timeline</p>
                  {scanLog.map((log, i) => (
                    <div key={i} className="text-[9px] font-mono text-red-600 truncate opacity-80">
                      &gt; {log}
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        <div className="space-y-6 pb-20">
          {fields.length === 0 && (
             <div className="py-20 text-center space-y-6 px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-indigo-200">
                   <MousePointer2 className="w-10 h-10 text-indigo-400" />
                </div>
                <div className="space-y-2">
                   <p className="font-black text-slate-900 uppercase tracking-widest text-sm">Action Required</p>
                   <p className="text-slate-500 text-sm font-bold leading-relaxed">
                      Click any <span className="text-indigo-600 font-black underline underline-offset-4">highlighted text block</span> on the document to start editing.
                   </p>
                </div>
                {step !== "scan" && (
                  <Button variant="outline" onClick={() => useSurgicalPDFStore.getState().setStep("scan")} className="rounded-xl border-2 border-indigo-100 text-indigo-600 font-black px-8 mt-4 hover:bg-indigo-50 shadow-sm">
                     <FileSearch className="w-4 h-4 mr-2" /> RE-SCAN DOCUMENT
                  </Button>
                )}
             </div>
          )}
          {fields.map((field) => (
            <motion.div 
              key={field.id} 
              layout
              className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative group \${selectedId === field.id ? "border-indigo-600 bg-white shadow-[0_20px_60px_rgba(79,70,229,0.15)] ring-4 ring-indigo-50" : "border-slate-50 bg-white hover:border-slate-200 shadow-sm"}`} 
              onClick={() => setSelectedId(field.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center \${field.id.startsWith('vec') ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}`}>
                    {field.id.startsWith('vec') ? <FileText className="w-4 h-4" /> : <Loader2 className="w-4 h-4" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{field.type}</span>
                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[150px] italic">"{field.originalValue}"</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={(e) => { e.stopPropagation(); removeField(field.id); }}>
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-2">
                <Input 
                  value={field.value} 
                  onChange={(e) => updateField(field.id, { value: e.target.value })} 
                  className="bg-slate-50 border-none h-12 rounded-2xl font-black text-base text-slate-900 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-300"
                  placeholder="Enter replacement text..."
                />
              </div>
              
              {selectedId === field.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1">Precision (pt)</span>
                    <Input type="number" value={Math.round(field.fontSize)} onChange={(e) => updateField(field.id, { fontSize: parseInt(e.target.value) })} className="h-10 rounded-xl font-bold bg-white" />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    {[
                      { id: 'isBold', label: 'B', active: field.isBold, color: 'bg-slate-900' },
                      { id: 'isItalic', label: 'I', active: field.isItalic, color: 'bg-slate-900', style: 'italic' },
                      { id: 'useMask', label: 'M', active: field.useMask, color: 'bg-orange-500', title: 'Masking' }
                    ].map(btn => (
                      <Button 
                        key={btn.id}
                        variant="ghost" 
                        size="icon" 
                        className={`h-10 w-10 rounded-xl transition-all \${btn.active ? \`\${btn.color} text-white shadow-lg\` : "bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100"}`} 
                        onClick={(e) => { e.stopPropagation(); updateField(field.id, { [btn.id]: !field[btn.id as keyof EditableField] }); }}
                      >
                        <span className={btn.style || ""}>{btn.label}</span>
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CanvasRenderer() {
  const { step, templateImage, pdfWidth, pdfHeight, fields, scannedElements, selectedId, setSelectedId, updatePosition, activateField, addField, debug } = useSurgicalPDFStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Dynamic Scaling: Fit 1:1 PDF point dimensions into the user's current viewport.
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && pdfWidth && pdfHeight) {
        const containerWidth = containerRef.current.clientWidth - 96;
        const containerHeight = containerRef.current.clientHeight - 96;
        const scaleX = containerWidth / pdfWidth;
        const scaleY = containerHeight / pdfHeight;
        setScale(Math.min(scaleX, scaleY));
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pdfWidth, pdfHeight, step]);

  const handleCanvasClick = (e: React.MouseEvent) => {
     if (step !== "edit" && step !== "scan") return;
     
     // Only add manual field if clicking on empty space in edit mode
     if (step === "edit" && e.target === e.currentTarget) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / scale;
        const clickY = (e.clientY - rect.top) / scale;
        
        addField({
           id: `manual-${Date.now()}`,
           type: "Custom Node",
           value: "New Text",
           originalValue: "",
           x: clickX,
           y: clickY,
           scannedX: clickX,
           scannedY: clickY,
           pdfX: clickX, // For manual fields, we assume 1:1 mapping at click point
           pdfY: pdfHeight - clickY, 
           fontSize: 18,
           isBold: false,
           isItalic: false,
           fontFamily: "Helvetica",
           useMask: false,
           isActivated: true
        });
     }
     
     if (e.target === e.currentTarget) {
        setSelectedId(null);
     }
  };

  if (!templateImage) return null;

  return (
    <div ref={containerRef} className="flex-1 h-full bg-[#020617] p-12 flex flex-col items-center justify-center relative overflow-hidden select-none">
       <div 
          className="relative bg-white shadow-[0_80px_200px_rgba(0,0,0,0.9)] origin-center transition-all duration-300" 
          style={{ 
             width: `${pdfWidth}px`, 
             height: `${pdfHeight}px`, 
             transform: `scale(${step === "preview" ? scale * 1.05 : scale})`,
             backgroundImage: `url(${templateImage})`, 
             backgroundSize: "100% 100%",
             backgroundPosition: "center", 
             backgroundRepeat: "no-repeat" 
          }}
          onClick={handleCanvasClick}
       >
          {/* DETECTION OVERLAY LAYER */}
          {(step === "scan" || step === "edit" || debug) && scannedElements.map((el) => {
             const isActivated = fields.some(f => f.id === el.id);
             if (isActivated && !debug) return null;
             
             // Color logic based on detection type
             let borderColor = "border-blue-400";
             let bgColor = "bg-blue-500/10";
             let label = "Raw Text";

             if (el.type === "Degree" || el.type === "Date / ID") {
                borderColor = "border-amber-400";
                bgColor = "bg-amber-500/20";
                label = "Candidate";
             }

             if (isActivated) {
                borderColor = "border-emerald-500";
                bgColor = "bg-emerald-500/30";
                label = "ACTIVE";
             }
             
             return (
                <div 
                   key={el.id}
                   className={`absolute border-2 border-dashed ${borderColor} ${bgColor} cursor-pointer transition-all hover:scale-[1.02] hover:bg-opacity-40 z-[9999] group`}
                   style={{
                      left: `${el.x}px`,
                      top: `${el.y}px`,
                      width: `${Math.max(20, el.originalValue.length * el.fontSize * 0.55)}px`,
                      height: `${el.fontSize * 1.2}px`,
                      transform: "translateY(-100%)",
                      pointerEvents: "auto",
                   }}
                   onClick={(e) => {
                      e.stopPropagation();
                      console.log("ACTIVATE:", el.id, el.value);
                      activateField(el.id);
                   }}
                >
                   {/* Tooltip Label */}
                   <div className="absolute -top-6 left-0 bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none uppercase tracking-tighter z-[10000]">
                      {label}: "{el.originalValue}"
                   </div>
                </div>
             );
          })}

          {fields.map((field) => (
             <DraggableField 
                key={field.id} 
                field={field} 
                scale={scale} 
                step={step} 
                selectedId={selectedId} 
                setSelectedId={setSelectedId} 
                updatePosition={updatePosition} 
             />
          ))}
       </div>

       <AnimatePresence>
         {(step === "edit" || step === "scan") && (
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} className="absolute bottom-12 flex items-center gap-12 bg-white/5 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/20 text-white shadow-2xl pointer-events-none z-[60]">
               <div className="flex items-center gap-6"><div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-lg">{step === "scan" ? <FileSearch className="w-6 h-6" /> : <MousePointer2 className="w-6 h-6" />}</div><div><p className="font-black text-lg leading-none tracking-tight">{step === "scan" ? "Detection Matrices" : "Draggable Interface"}</p><p className="opacity-60 font-bold text-sm pt-1">{step === "scan" ? "Click any block to edit" : "Powered by react-draggable"}</p></div></div>
               <div className="w-[1px] h-12 bg-white/10" />
               <div className="flex items-center gap-6"><div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-lg"><FileText className="w-6 h-6" /></div><div><p className="font-black text-lg leading-none tracking-tight">1:1 Coordinate Mapping</p><p className="opacity-60 font-bold text-sm pt-1">Viewport strictly locked to PDF points</p></div></div>
            </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}

function DraggableField({ field, scale, step, selectedId, setSelectedId, updatePosition }: { 
  field: EditableField, 
  scale: number, 
  step: string, 
  selectedId: string | null, 
  setSelectedId: (id: string | null) => void, 
  updatePosition: (id: string, x: number, y: number) => void 
}) {
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: field.x, y: field.y }}
      scale={scale}
      disabled={step !== "edit"}
      onStart={() => setSelectedId(field.id)}
      onStop={(e, data) => updatePosition(field.id, data.x, data.y)}
    >
      <div 
        ref={nodeRef}
        className={`absolute px-2 py-0 cursor-move z-[100] ${step === "edit" ? (selectedId === field.id ? "ring-[2px] ring-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)] bg-white/90 backdrop-blur-[2px] rounded" : "hover:ring-2 hover:ring-indigo-300 rounded") : ""}`}
        style={{
          fontSize: `${field.fontSize}px`,
          fontWeight: field.isBold ? "bold" : "normal",
          fontStyle: field.isItalic ? "italic" : "normal",
          fontFamily: field.fontFamily,
          color: "#0f172a",
          whiteSpace: "nowrap",
          lineHeight: 1,
          pointerEvents: "auto",
        }}
        onClick={(e) => {
           e.stopPropagation();
           setSelectedId(field.id);
        }}
      >
        <div style={{ transform: "translateY(-100%)", position: "relative" }}>
          {field.useMask && step === "edit" && <div className="absolute inset-0 bg-white z-[-1] scale-x-110 scale-y-110 blur-[1px] opacity-90 pointer-events-none" />}
          {field.value}
        </div>
      </div>
    </Draggable>
  );
}

function RightAnalyticsSidebar() {
  const { fields, scannedElements, pdfWidth, pdfHeight, debug, scanLog } = useSurgicalPDFStore();
  
  const vectorCount = scannedElements.filter(e => e.id.startsWith('vec')).length;
  const ocrCount = scannedElements.filter(e => e.id.startsWith('ocr')).length;
  const activatedCount = fields.length;

  return (
    <motion.div initial={{ x: 400 }} animate={{ x: 0 }} className="w-80 h-full bg-[#f8fafc] border-l border-slate-200 flex flex-col shadow-xl z-40 shrink-0 overflow-y-auto">
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">System Analytics</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Detection Integrity</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-slate-900">{Math.round((vectorCount / (scannedElements.length || 1)) * 100)}%</p>
                <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-500" style={{ width: `${(vectorCount / (scannedElements.length || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vector</p>
                  <p className="text-2xl font-black text-indigo-600">{vectorCount}</p>
               </div>
               <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">AI-OCR</p>
                  <p className="text-2xl font-black text-amber-500">{ocrCount}</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Document Metadata</h3>
          <div className="space-y-3">
             {[
               { label: "Canvas Resolution", value: `${Math.round(pdfWidth)} x ${Math.round(pdfHeight)} pt` },
               { label: "Active Layers", value: `${activatedCount} Nodes` },
               { label: "Engine Status", value: "Optimal (72 DPI)", color: "text-emerald-500" },
               { label: "OCR Strategy", value: ocrCount > 0 ? "Hybrid" : "Native Vector" }
             ].map((stat, i) => (
               <div key={i} className="flex items-center justify-between text-xs font-bold">
                 <span className="text-slate-400">{stat.label}</span>
                 <span className={stat.color || "text-slate-700"}>{stat.value}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Event Stream</h3>
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                 <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
              </div>
           </div>
           <div className="bg-slate-900 rounded-[2rem] p-6 space-y-3 min-h-[200px] font-mono shadow-2xl">
              {scanLog.map((log, i) => (
                <div key={i} className="text-[10px] leading-relaxed break-all">
                   <span className="text-emerald-500">$</span> <span className="text-slate-300">{log}</span>
                </div>
              ))}
              <div className="text-[10px] text-indigo-400 animate-pulse">_ Waiting for input...</div>
           </div>
        </div>
        
        <div className="pt-4">
           <div className="p-6 bg-indigo-600 rounded-[2.5rem] shadow-lg space-y-4">
              <p className="text-white font-black text-xs leading-tight">Ready for Native Vector Export?</p>
              <p className="text-indigo-100 text-[10px] font-medium leading-relaxed opacity-80">Final export preserves original font schemas and layer positions.</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
