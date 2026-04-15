import React, { useState } from "react";
import {
  Download,
  FileText,
  X,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileSearch,
  MousePointer2,
  Share2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { useSurgicalPDFStore, EditorStep } from "@/store/useSurgicalPDFStore";

// Sub-components
import { UploadView } from "@/components/surgical-pdf/UploadView";
import { FormSidebar } from "@/components/surgical-pdf/FormSidebar";
import { CanvasRenderer } from "@/components/surgical-pdf/CanvasRenderer";
import { RightAnalyticsSidebar } from "@/components/surgical-pdf/RightAnalyticsSidebar";

export default function SurgicalPDFEditor() {
  const {
    step,
    setStep,
    reset,
    originalPdfBytes,
    fields,
    debug,
    toggleDebug,
  } = useSurgicalPDFStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingToPaperless, setIsSendingToPaperless] = useState(false);

  // --- PDF EXPORT ENGINE (Internal helper) ---
  const generateEditedPdfBytes = async () => {
    if (!originalPdfBytes) return null;
    
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

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
      },
    };

    fields.forEach((field) => {
      const family = field.fontFamily === "serif" ? fonts.serif : fonts.sans;
      let selectedFont = family.regular;
      if (field.isBold && field.isItalic) selectedFont = family.boldItalic;
      else if (field.isBold) selectedFont = family.bold;
      else if (field.isItalic) selectedFont = family.italic;

      let finalPdfX = field.pdfX;
      let finalPdfY = field.pdfY;

      const deltaX = field.x - field.scannedX;
      const deltaY = field.y - field.scannedY;

      if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
        finalPdfX = field.pdfX + deltaX;
        finalPdfY = field.pdfY - deltaY;
      }

      if (field.useMask) {
        const textWidth = selectedFont.widthOfTextAtSize(
          field.originalValue || field.value,
          field.fontSize
        );
        firstPage.drawRectangle({
          x: field.pdfX,
          y: field.pdfY - field.fontSize * 0.2,
          width: textWidth * 1.1,
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

    return await pdfDoc.save();
  };

  const exportTruePDF = async () => {
    setIsGenerating(true);
    const exportToast = toast.loading("Compiling Native Vector PDF...");

    try {
      const pdfBytes = await generateEditedPdfBytes();
      if (!pdfBytes) throw new Error("Failed to generate PDF");

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `Surgical_Edit_${Date.now()}.pdf`;
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

  const sendToPaperless = async () => {
    setIsSendingToPaperless(true);
    const paperlessToast = toast.loading("Syncing with Paperless-ngx...");

    try {
      const pdfBytes = await generateEditedPdfBytes();
      if (!pdfBytes) throw new Error("Failed to generate PDF");

      const formData = new FormData();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      formData.append("file", blob, `Surgical_Edit_${Date.now()}.pdf`);
      
      // Send extracted metadata
      const metadata = {
        fields: fields.map(f => ({ type: f.type, value: f.value }))
      };
      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch("http://localhost:5001/paperless/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || "Paperless sync failed");
      }

      toast.success("Successfully Synced to Paperless!", { id: paperlessToast });
    } catch (error: any) {
      console.error("Paperless Error:", error);
      toast.error(`Sync Failed: ${error.message}`, { id: paperlessToast });
    } finally {
      setIsSendingToPaperless(false);
    }
  };

  if (step === "upload") return <UploadView />;

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col overflow-hidden font-sans">
      {/* Header Panel */}
      <div className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="text-white w-7 h-7" />
            </div>
            <span className="font-black text-slate-900 text-2xl tracking-tighter">
              Surgical PDF Engine V2
            </span>
          </div>
          <div className="hidden lg:flex items-center gap-10">
            {[
              { id: "scan", label: "Scanner Mode", icon: FileSearch },
              { id: "edit", label: "Layer Editor", icon: MousePointer2 },
              { id: "preview", label: "Render Preview", icon: Eye },
            ].map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 font-black text-xs uppercase tracking-[0.2em] transition-all cursor-pointer ${
                  step === s.id
                    ? "text-indigo-600 border-b-4 border-indigo-600 pb-1"
                    : "text-slate-300 hover:text-slate-400"
                }`}
                onClick={() => setStep(s.id as EditorStep)}
              >
                <s.icon className="w-5 h-5" /> <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6">
          {step === "scan" ? (
            <Button
              onClick={() => setStep("edit")}
              className="bg-slate-900 text-white font-black rounded-2xl px-10 h-14 hover:bg-slate-800 text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Go to Editor <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          ) : step === "edit" ? (
            <Button
              onClick={() => setStep("preview")}
              className="bg-slate-900 text-white font-black rounded-2xl px-10 h-14 hover:bg-slate-800 text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              Verify & Preview <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep("edit")}
                className="font-black text-slate-500 rounded-2xl px-8 h-14 text-lg"
              >
                <ChevronLeft className="w-6 h-6 mr-2" /> Back to Matrix
              </Button>
              
              <Button 
                variant="outline"
                onClick={sendToPaperless}
                disabled={isSendingToPaperless}
                className="font-black text-slate-900 border-2 border-slate-900 rounded-2xl px-8 h-14 text-lg hover:bg-slate-50 shadow-sm"
              >
                <Share2 className="w-6 h-6 mr-2" /> {isSendingToPaperless ? "Syncing..." : "Sync Paperless"}
              </Button>

              <Button
                onClick={exportTruePDF}
                disabled={isGenerating}
                className="bg-indigo-600 text-white font-black rounded-2xl px-12 h-14 text-lg hover:bg-indigo-700 shadow-[0_10px_40px_rgba(79,70,229,0.4)] transition-all transform hover:scale-105 active:scale-95"
              >
                <Download className="w-6 h-6 mr-3" />{" "}
                {isGenerating ? "Compiling..." : "Compile Native PDF"}
              </Button>
            </>
          )}
          <div className="w-[1px] h-10 bg-slate-200 mx-2" />
          <Button
            variant="ghost"
            size="icon"
            onClick={reset}
            className="rounded-2xl w-14 h-14 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <X className="w-8 h-8" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDebug}
            className={`ml-4 rounded-xl font-black text-[10px] uppercase tracking-widest h-14 px-6 ${
              debug
                ? "bg-red-500 text-white border-red-500"
                : "text-slate-400 border-slate-200 hover:bg-slate-50"
            }`}
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
