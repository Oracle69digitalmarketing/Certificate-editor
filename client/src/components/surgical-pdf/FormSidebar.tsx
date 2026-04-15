import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Trash2,
  MousePointer2,
  PlusCircle,
  FileSearch,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSurgicalPDFStore, EditableField } from "@/store/useSurgicalPDFStore";

export function FormSidebar() {
  const {
    step,
    fields,
    scannedElements,
    selectedId,
    setSelectedId,
    updateField,
    addField,
    removeField,
    pdfWidth,
    pdfHeight,
    debug,
    scanLog,
  } = useSurgicalPDFStore();

  if (step === "upload") return null;

  return (
    <motion.div
      initial={{ x: -550 }}
      animate={{ x: 0 }}
      exit={{ x: -550 }}
      className="w-full lg:w-[550px] h-full bg-white border-r border-slate-200 flex flex-col shadow-2xl relative z-40 shrink-0"
    >
      <div className="p-10 space-y-10 flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
              {step === "scan" ? "Detection Matrices" : "Active DOM Mapping"}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                addField({
                  id: `manual-${Date.now()}`,
                  type: "Custom Node",
                  value: "New Variable",
                  x: pdfWidth / 2,
                  y: pdfHeight / 2,
                  scannedX: pdfWidth / 2,
                  scannedY: pdfHeight / 2,
                  pdfX: pdfWidth / 2,
                  pdfY: pdfHeight / 2,
                  fontSize: 24,
                  isBold: false,
                  isItalic: false,
                  fontFamily: "Helvetica",
                  originalValue: "",
                  useMask: false,
                  isActivated: true,
                });
              }}
              className="text-indigo-600 font-black border-2 border-indigo-100 hover:bg-indigo-50 rounded-xl h-10 px-6"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> ADD NODE
            </Button>
          </div>
          <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-[2.5rem] space-y-2">
            <p className="text-indigo-900 font-black text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {step === "scan"
                ? `${scannedElements.length} Elements Scanned`
                : "Document Matrix Ready"}
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
            <p className="text-red-900 font-black text-[10px] uppercase tracking-widest">
              Debug Console
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-red-700">
              <div>Scanned: {scannedElements.length}</div>
              <div>Active: {fields.length}</div>
              <div>
                PDF Size: {Math.round(pdfWidth)}x{Math.round(pdfHeight)}
              </div>
              <div>Step: {step}</div>
            </div>
            {scanLog.length > 0 && (
              <div className="mt-4 pt-4 border-t border-red-100 space-y-1">
                <p className="text-red-900 font-black text-[8px] uppercase tracking-tighter">
                  Scan Timeline
                </p>
                {scanLog.map((log, i) => (
                  <div
                    key={i}
                    className="text-[9px] font-mono text-red-600 truncate opacity-80"
                  >
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
                <p className="font-black text-slate-900 uppercase tracking-widest text-sm">
                  Action Required
                </p>
                <p className="text-slate-500 text-sm font-bold leading-relaxed">
                  Click any{" "}
                  <span className="text-indigo-600 font-black underline underline-offset-4">
                    highlighted text block
                  </span>{" "}
                  on the document to start editing.
                </p>
              </div>
              {step !== "scan" && (
                <Button
                  variant="outline"
                  onClick={() => useSurgicalPDFStore.getState().setStep("scan")}
                  className="rounded-xl border-2 border-indigo-100 text-indigo-600 font-black px-8 mt-4 hover:bg-indigo-50 shadow-sm"
                >
                  <FileSearch className="w-4 h-4 mr-2" /> RE-SCAN DOCUMENT
                </Button>
              )}
            </div>
          )}
          {fields.map((field) => (
            <motion.div
              key={field.id}
              layout
              className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer relative group ${
                selectedId === field.id
                  ? "border-indigo-600 bg-white shadow-[0_20px_60px_rgba(79,70,229,0.15)] ring-4 ring-indigo-50"
                  : "border-slate-50 bg-white hover:border-slate-200 shadow-sm"
              }`}
              onClick={() => setSelectedId(field.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      field.id.startsWith("vec")
                        ? "bg-indigo-50 text-indigo-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {field.id.startsWith("vec") ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <Loader2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {field.type}
                    </span>
                    <p className="text-[10px] font-bold text-slate-500 truncate max-w-[150px] italic">
                      "{field.originalValue}"
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeField(field.id);
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-2">
                <Input
                  value={field.value}
                  onChange={(e) =>
                    updateField(field.id, { value: e.target.value })
                  }
                  className="bg-slate-50 border-none h-12 rounded-2xl font-black text-base text-slate-900 focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-300"
                  placeholder="Enter replacement text..."
                />
              </div>

              {selectedId === field.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase ml-1">
                      Precision (pt)
                    </span>
                    <Input
                      type="number"
                      value={Math.round(field.fontSize)}
                      onChange={(e) =>
                        updateField(field.id, {
                          fontSize: parseInt(e.target.value),
                        })
                      }
                      className="h-10 rounded-xl font-bold bg-white"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    {[
                      {
                        id: "isBold",
                        label: "B",
                        active: field.isBold,
                        color: "bg-slate-900",
                      },
                      {
                        id: "isItalic",
                        label: "I",
                        active: field.isItalic,
                        color: "bg-slate-900",
                        style: "italic",
                      },
                      {
                        id: "useMask",
                        label: "M",
                        active: field.useMask,
                        color: "bg-orange-500",
                        title: "Masking",
                      },
                    ].map((btn) => (
                      <Button
                        key={btn.id}
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${
                          btn.active
                            ? `${btn.color} text-white shadow-lg`
                            : "bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateField(field.id, {
                            [btn.id]: !field[btn.id as keyof EditableField],
                          });
                        }}
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
