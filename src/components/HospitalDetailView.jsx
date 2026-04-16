import React from "react";
import { Building2 } from "lucide-react";

export default function HospitalDetailView({ hospital, rows, onClose }) {
  if (!hospital) return null;

  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h2 className="section-title">Hospital Detail</h2>
          <div className="hospital-headline">
            <Building2 size={16} className="inline-icon" />
            {hospital}
          </div>
        </div>
        <button className="button" onClick={onClose}>
          Clear
        </button>
      </div>

      <div className="hospital-detail-grid">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.id} className="hospital-detail-item">
              <div className="strong">{row.equipment}</div>
              <div className="muted">{row.serial || "No serial"}</div>
              <div className="muted">Department: {row.department || "—"}</div>
              <div className="muted">Next PM: {row.nextPmDate || "—"}</div>
              <div className="muted">Status: {row.status || "Upcoming"}</div>
            </div>
          ))
        ) : (
          <div className="muted">No equipment found for this hospital.</div>
        )}
      </div>
    </div>
  );
}
