import React from "react";
import { motion } from "framer-motion";
import { useSurgicalPDFStore } from "@/store/useSurgicalPDFStore";

export function RightAnalyticsSidebar() {
  const { fields, scannedElements, pdfWidth, pdfHeight, scanLog } = useSurgicalPDFStore();
  
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
