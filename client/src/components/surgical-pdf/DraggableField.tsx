import React, { useRef } from "react";
import Draggable from "react-draggable";
import { EditableField } from "@/store/useSurgicalPDFStore";

interface DraggableFieldProps {
  field: EditableField;
  scale: number;
  step: string;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updatePosition: (id: string, x: number, y: number) => void;
}

export function DraggableField({
  field,
  scale,
  step,
  selectedId,
  setSelectedId,
  updatePosition,
}: DraggableFieldProps) {
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
        className={`absolute px-2 py-0 cursor-move z-[100] ${
          step === "edit"
            ? selectedId === field.id
              ? "ring-[2px] ring-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)] bg-white/90 backdrop-blur-[2px] rounded"
              : "hover:ring-2 hover:ring-indigo-300 rounded"
            : ""
        }`}
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
          {field.useMask && step === "edit" && (
            <div className="absolute inset-0 bg-white z-[-1] scale-x-110 scale-y-110 blur-[1px] opacity-90 pointer-events-none" />
          )}
          {field.value}
        </div>
      </div>
    </Draggable>
  );
}
