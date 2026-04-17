import React from "react";
import { ArrowLeft, FileText } from "lucide-react";

export default function ContractDetailView({ contract, onBack }) {
  if (!contract) return null;

  return (
    <div className="card contracts-view-card">
      <div className="detail-head">
        <div>
          <h2 className="section-title">Contract Details</h2>
          <div className="hospital-headline">
            <FileText size={16} className="inline-icon" />
            {contract.hospital || "Unknown hospital"} · {contract.contractNo || "No contract #"}
          </div>
        </div>
        <button className="button" onClick={onBack}>
          <ArrowLeft size={15} className="inline-icon" />
          Back to contracts
        </button>
      </div>

      <div className="bulk-preview">
        <div className="strong">Contract period</div>
        <div className="muted">
          {contract.contractStartDate || "—"} to {contract.contractEndDate || "—"}
        </div>
      </div>

      <div className="bulk-preview">
        <div className="strong">Included equipment ({contract.equipment?.length || 0})</div>
        {contract.equipment?.length ? (
          <div className="bulk-preview-list">
            {contract.equipment.map((equipmentItem) => (
              <div key={equipmentItem} className="bulk-preview-item">
                {equipmentItem}
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No equipment linked to this contract yet.</div>
        )}
      </div>
    </div>
  );
}
