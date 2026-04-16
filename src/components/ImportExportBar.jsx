import React from "react";
import { Plus } from "lucide-react";

export default function ImportExportBar({ fileInputRef, onImportChange, onExportCsv, onExportJson, onStartAdd }) {
  return (
    <div className="actions">
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden-input" onChange={onImportChange} />
      <button className="button" onClick={() => fileInputRef.current?.click()}>
        Import CSV/Excel
      </button>
      <button className="button" onClick={onExportCsv}>
        Export CSV
      </button>
      <button className="button" onClick={onExportJson}>
        Export JSON
      </button>
      <button className="button button-primary" onClick={onStartAdd}>
        <Plus size={16} className="inline-icon" />
        Add Equipment
      </button>
    </div>
  );
}
