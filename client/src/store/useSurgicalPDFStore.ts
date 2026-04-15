import { create } from "zustand";

export interface EditableField {
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

export type EditorStep = "upload" | "scan" | "edit" | "preview";

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
  scanLog: string[];
  
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

export const useSurgicalPDFStore = create<EditorState>((set) => ({
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
  addScanLog: (message) => set((state) => ({ scanLog: [...state.scanLog.slice(-4), message] })),
  reset: () => set({ step: "upload", templateImage: null, originalPdfBytes: null, fields: [], scannedElements: [], selectedId: null, pdfWidth: 0, pdfHeight: 0, scanLog: [] }),
}));
