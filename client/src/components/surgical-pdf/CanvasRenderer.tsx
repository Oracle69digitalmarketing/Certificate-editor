import React, { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileSearch, MousePointer2, FileText } from "lucide-react";
import { useSurgicalPDFStore } from "@/store/useSurgicalPDFStore";
import { DraggableField } from "./DraggableField";

export function CanvasRenderer() {
  const {
    step,
    templateImage,
    pdfWidth,
    pdfHeight,
    fields,
    scannedElements,
    selectedId,
    setSelectedId,
    updatePosition,
    activateField,
    addField,
    debug,
  } = useSurgicalPDFStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [pdfWidth, pdfHeight, step]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (step !== "edit" && step !== "scan") return;

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
        pdfX: clickX,
        pdfY: pdfHeight - clickY,
        fontSize: 18,
        isBold: false,
        isItalic: false,
        fontFamily: "Helvetica",
        useMask: false,
        isActivated: true,
      });
    }

    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  if (!templateImage) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full bg-[#020617] p-12 flex flex-col items-center justify-center relative overflow-hidden select-none"
    >
      <div
        className="relative bg-white shadow-[0_80px_200px_rgba(0,0,0,0.9)] origin-center transition-all duration-300"
        style={{
          width: `${pdfWidth}px`,
          height: `${pdfHeight}px`,
          transform: `scale(${step === "preview" ? scale * 1.05 : scale})`,
          backgroundImage: `url(${templateImage})`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        onClick={handleCanvasClick}
      >
        {(step === "scan" || step === "edit" || debug) &&
          scannedElements.map((el) => {
            const isActivated = fields.some((f) => f.id === el.id);
            if (isActivated && !debug) return null;

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
                  width: `${Math.max(
                    20,
                    el.originalValue.length * el.fontSize * 0.55
                  )}px`,
                  height: `${el.fontSize * 1.2}px`,
                  transform: "translateY(-100%)",
                  pointerEvents: "auto",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  activateField(el.id);
                }}
              >
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
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-12 flex items-center gap-12 bg-white/5 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/20 text-white shadow-2xl pointer-events-none z-[60]"
          >
            <div className="flex items-center gap-6">
              <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-lg">
                {step === "scan" ? (
                  <FileSearch className="w-6 h-6" />
                ) : (
                  <MousePointer2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="font-black text-lg leading-none tracking-tight">
                  {step === "scan" ? "Detection Matrices" : "Draggable Interface"}
                </p>
                <p className="opacity-60 font-bold text-sm pt-1">
                  {step === "scan"
                    ? "Click any block to edit"
                    : "Powered by react-draggable"}
                </p>
              </div>
            </div>
            <div className="w-[1px] h-12 bg-white/10" />
            <div className="flex items-center gap-6">
              <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-lg">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-lg leading-none tracking-tight">
                  1:1 Coordinate Mapping
                </p>
                <p className="opacity-60 font-bold text-sm pt-1">
                  Viewport strictly locked to PDF points
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
