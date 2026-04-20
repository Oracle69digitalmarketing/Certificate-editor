import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Upload, Loader2, Cpu, Zap } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import { useSurgicalPDFStore, EditableField } from "@/store/useSurgicalPDFStore";

export function UploadView() {
  const [isScanning, setIsScanning] = useState(false);
  const [useBackendOCR, setUseBackendOCR] = useState(false);
  const [ocrEngine, setOcrEngine] = useState<'tesseract' | 'paddle' | 'easyocr'>('tesseract');
  const [scanProgress, setScanProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadTemplate, addScanLog, activateField, setOcrText } = useSurgicalPDFStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    let file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Engine requires PDF files to reconstruct strict vector layouts.");
      return;
    }

    setIsScanning(true);
    
    if (useBackendOCR) {
      setScanProgress(`Sending to AI-OCR Backend (${ocrEngine.toUpperCase()})...`);
      addScanLog(`Advanced OCR Requested: engine=${ocrEngine}`);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("engine", ocrEngine);

      try {
        const apiBaseUrl = import.meta.env.VITE_OCR_API_URL || "http://localhost:5001";
        const response = await fetch(`${apiBaseUrl}/ocr`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || "Backend OCR failed");
        }

        const blob = await response.blob();
        file = new File([blob], file.name, { type: "application/pdf" });
        addScanLog("Backend OCR Complete: Searchable PDF received.");
        toast.success("AI-OCR Reconstruction Successful!");
      } catch (error: any) {
        console.error("Backend OCR Error:", error);
        addScanLog(`Backend OCR ERROR: ${error.message}`);
        toast.error(`Backend OCR failed: ${error.message}. Falling back to browser engine.`);
      }
    }

    setScanProgress("Initializing Vector Layout Engine...");
    addScanLog(`Processing: ${file.name} (${Math.round(file.size / 1024)}KB)`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBytesCopy = arrayBuffer.slice(0);

      setScanProgress("Extracting layout matrices...");
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      addScanLog(`PDF Loaded: ${pdf.numPages} page(s)`);

      const page = await pdf.getPage(1);
      const nativeViewport = page.getViewport({ scale: 1.0 });
      const pdfWidth = nativeViewport.width;
      const pdfHeight = nativeViewport.height;
      addScanLog(`Viewport: ${Math.round(pdfWidth)}x${Math.round(pdfHeight)}`);

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
      let textContent = await page.getTextContent({ includeMarkedContent: true });

      if (textContent.items.length === 0) {
        addScanLog("Items 0 - Trying fallback scan...");
        textContent = await page.getTextContent({ includeMarkedContent: false });
      }

      const scannedElements: EditableField[] = [];
      addScanLog(`Raw Items: ${textContent.items.length}`);

      const fieldPatterns = [
        { type: "Degree", regex: /Bachelor|Master|BSc|MSc|Ph\.D|Doctor|Diploma|Degree|Graduate|Certificate|Honours|Hons/i },
        { type: "ID Node", regex: /Matric|Reg|Student ID|Index No|Registration|ID|Matriculation/i },
        { type: "Ref No", regex: /Ref|Serial|Reference|S\/N|Number|No\./i },
        { type: "Course", regex: /Course|Module|Subject|Specialization|Program|Department|Faculty|Field/i },
        { type: "Date / ID", regex: /\d{4}|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/ },
      ];

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

          const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
          const fontName = (item.fontName || "").toLowerCase();

          scannedElements.push({
            id: `vec-${idx}-${Date.now()}`,
            type: detectType(item.str, fontSize),
            value: item.str,
            originalValue: item.str,
            x: vx,
            y: vy,
            scannedX: vx,
            scannedY: vy,
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
        addScanLog("NO TEXT DETECTED - Starting Browser OCR Engine...");
        setScanProgress("Analyzing high-res matrices (Browser OCR)...");

        const worker = await Tesseract.createWorker("eng");
        const ocrResult = await worker.recognize(bgImage) as any;
        addScanLog(`OCR Found: ${ocrResult.data.words.length} tokens`);
        
        // Save full OCR text for metadata extraction later
        setOcrText(ocrResult.data.text);

        ocrResult.data.words.forEach((word: any, idx: number) => {
          // ADVANCED CONFIDENCE FILTERING: Filter out noise (confidence > 60%)
          if (word.confidence < 60 || word.text.length < 2) return;

          const ocrX = word.bbox.x0 / 3.0;
          const ocrY = word.bbox.y0 / 3.0;
          const ocrWidth = (word.bbox.x1 - word.bbox.x0) / 3.0;
          const ocrHeight = (word.bbox.y1 - word.bbox.y0) / 3.0;

          const fontSize = ocrHeight * 0.8;

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

      // Save native text for metadata extraction
      if (scannedElements.length > 0) {
        const fullText = textContent.items.map((item: any) => item.str).join(" ");
        setOcrText(fullText);
      }

      if (scannedElements.length > 0) {
        setTimeout(() => {
          const importantTypes = ["Recipient Name", "Name Candidate", "Degree", "Date / ID", "Course", "ID Node", "Ref No"];
          const topElements = scannedElements
            .filter(el => importantTypes.includes(el.type))
            .sort((a, b) => b.fontSize - a.fontSize)
            .slice(0, 8);

          if (topElements.length === 0) {
            const fallback = [...scannedElements]
              .sort((a, b) => b.fontSize - a.fontSize)
              .slice(0, 4);
            fallback.forEach(f => activateField(f.id));
          } else {
            topElements.forEach(f => activateField(f.id));
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
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85]">Surgical PDF <br /> <span className="text-indigo-600">Engine V2</span></h1>
          <p className="text-2xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Absolute Positioning & Native Vector Export. Upload a PDF to reconstruct its layout layer by layer.
          </p>
        </div>

        <div className="flex flex-col items-center gap-10">
          <div className="flex flex-col gap-4 items-center">
            <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-3xl">
              <button 
                onClick={() => setUseBackendOCR(false)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${!useBackendOCR ? "bg-white text-indigo-600 shadow-md" : "text-slate-400"}`}
              >
                <Zap className="w-4 h-4" /> Browser Engine
              </button>
              <button 
                onClick={() => setUseBackendOCR(true)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${useBackendOCR ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}
              >
                <Cpu className="w-4 h-4" /> AI-OCR Server
              </button>
            </div>

            {useBackendOCR && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                {(['tesseract', 'paddle', 'easyocr'] as const).map((engine) => (
                  <button
                    key={engine}
                    onClick={() => setOcrEngine(engine)}
                    className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-tighter transition-all ${ocrEngine === engine ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    {engine}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <div className="w-full flex justify-center px-4">
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
