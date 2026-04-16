import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Mail } from "lucide-react";

function buildMailToForSelection(selectedRows, hospital) {
  const contactEmails = Array.from(new Set(selectedRows.map((row) => row.contactEmail).filter(Boolean)));
  if (!contactEmails.length) return "";

  const subject = `PM Follow-up (${selectedRows.length} item${selectedRows.length === 1 ? "" : "s"}) - ${hospital}`;
  const equipmentLines = selectedRows.map(
    (row, index) =>
      `${index + 1}. ${row.equipment} | Model: ${row.model || "-"} | Serial: ${row.serial || "-"} | Dept: ${row.department || "-"} | Status: ${row.status || "Upcoming"} | Next PM: ${row.nextPmDate || "-"}`
  );

  const body = [
    "Hello,",
    "",
    `This is a preventive maintenance follow-up for ${hospital}.`,
    "",
    "Selected equipment:",
    ...equipmentLines,
    "",
    "Please confirm a suitable maintenance time slot.",
    "",
    "Regards,",
    "PM Team",
  ].join("\n");

  return `mailto:${contactEmails.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function HospitalDetailView({ hospital, rows, onBack, getTrackingMeta }) {
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedEquipmentIds([]);
      return;
    }

    setSelectedEquipmentIds((current) => current.filter((id) => rows.some((row) => String(row.id) === String(id))));
  }, [rows]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedEquipmentIds.includes(String(row.id))),
    [rows, selectedEquipmentIds]
  );
  const canEmailSelected = selectedRows.some((row) => row.contactEmail);
  const selectedMailTo = canEmailSelected ? buildMailToForSelection(selectedRows, hospital) : "";

  if (!hospital) return null;

  function toggleSelection(rowId) {
    const asString = String(rowId);
    setSelectedEquipmentIds((current) =>
      current.includes(asString) ? current.filter((id) => id !== asString) : [...current, asString]
    );
  }

  function selectAll() {
    setSelectedEquipmentIds(rows.map((row) => String(row.id)));
  }

  function clearSelection() {
    setSelectedEquipmentIds([]);
  }

  return (
    <div className="card">
      <div className="detail-head">
        <div>
          <h2 className="section-title">Hospital Equipment Status</h2>
          <div className="hospital-headline">
            <Building2 size={16} className="inline-icon" />
            {hospital}
          </div>
        </div>
        <button className="button" onClick={onBack}>
          <ArrowLeft size={15} className="inline-icon" />
          Back to dashboard
        </button>
      </div>

      <div className="hospital-quick-actions hospital-selection-actions">
        <div className="selection-meta">
          {selectedRows.length} selected
          {selectedRows.length ? "" : " (select equipment below)"}
        </div>

        <div className="selection-buttons">
          <button className="button" onClick={selectAll} disabled={!rows.length}>
            Select all
          </button>
          <button className="button" onClick={clearSelection} disabled={!selectedRows.length}>
            Clear
          </button>
        </div>

        {canEmailSelected ? (
          <a className="button button-primary" href={selectedMailTo}>
            <Mail size={15} className="inline-icon" />
            Email selected equipment ({selectedRows.length})
          </a>
        ) : (
          <button className="button" disabled title="Select equipment that has a contact email.">
            <Mail size={15} className="inline-icon" />
            Email selected equipment
          </button>
        )}
      </div>

      <div className="hospital-status-view">
        <h3 className="section-title hospital-subsection-title">Equipment Status View</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Equipment</th>
                <th>Department</th>
                <th>Next PM</th>
                <th>Timing</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => {
                  const meta = getTrackingMeta(row);
                  const isSelected = selectedEquipmentIds.includes(String(row.id));
                  return (
                    <tr key={row.id} className={isSelected ? "hospital-status-row-selected" : ""}>
                      <td>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(row.id)} aria-label={`Select ${row.equipment}`} />
                      </td>
                      <td>
                        <div className="strong">{row.equipment}</div>
                        <div className="muted">{row.serial || "No serial"}</div>
                      </td>
                      <td>{row.department || "—"}</td>
                      <td>{row.nextPmDate || "—"}</td>
                      <td className="muted">
                        {meta.isOverdue
                          ? "Overdue"
                          : meta.dueSoon7
                            ? "Due within 7 days"
                            : meta.dueSoon14
                              ? "Due within 14 days"
                              : "On schedule"}
                      </td>
                      <td>{meta.effectiveStatus}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    No equipment found for this hospital.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
