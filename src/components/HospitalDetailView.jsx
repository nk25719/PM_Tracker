import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Copy, Mail } from "lucide-react";

function buildEmailDraft(pendingRows, hospital) {
  const subject = `Preventive Maintenance Follow-up - ${hospital} (${pendingRows.length} pending item${pendingRows.length === 1 ? "" : "s"})`;
  const equipmentLines = pendingRows.map(
    (row, index) =>
      `${index + 1}. ${row.equipment} | Model: ${row.model || "-"} | Serial: ${row.serial || "-"} | Dept: ${row.department || "-"} | Status: ${row.status || "Upcoming"} | Next PM: ${row.nextPmDate || "-"}`
  );

  const body = [
    "Hello,",
    "",
    `This is a follow-up on pending preventive maintenance for ${hospital}.`,
    "",
    "Pending equipment and current status:",
    ...equipmentLines,
    "",
    "To help us proceed, please:",
    "1) Confirm equipment availability and preferred access windows.",
    "2) Share any access constraints, permits, or safety requirements.",
    "3) Confirm a contact person for day-of-maintenance coordination.",
    "4) Reply with your preferred dates to schedule each pending item.",
    "",
    "Regards,",
    "PM Team",
  ].join("\n");

  return { subject, body };
}

export default function HospitalDetailView({ hospital, rows, onBack, getTrackingMeta }) {
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
  const [copied, setCopied] = useState(false);

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
  const rowsForEmail = selectedRows.length ? selectedRows : rows;
  const pendingRows = useMemo(
    () => rowsForEmail.filter((row) => getTrackingMeta(row).effectiveStatus !== "Completed"),
    [rowsForEmail, getTrackingMeta]
  );
  const emailDraft = pendingRows.length ? buildEmailDraft(pendingRows, hospital) : null;
  const generatedEmailText = emailDraft ? `Subject: ${emailDraft.subject}\n\n${emailDraft.body}` : "";
  const canEmailSelected = pendingRows.length > 0;
  const selectedMailTo = canEmailSelected
    ? `mailto:${Array.from(new Set(rowsForEmail.map((row) => row.contactEmail).filter(Boolean))).join(",")}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`
    : "";

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

  async function copyEmailDraft() {
    if (!generatedEmailText) return;

    try {
      await navigator.clipboard.writeText(generatedEmailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Failed to copy email draft", error);
    }
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
            Open email client
          </a>
        ) : (
          <button className="button" disabled title="No pending equipment to include.">
            <Mail size={15} className="inline-icon" />
            Open email client
          </button>
        )}
      </div>
      <div className="email-draft-wrap">
        <div className="email-draft-head">
          <div className="selection-meta">
            Ready-to-copy email draft ({pendingRows.length} pending item{pendingRows.length === 1 ? "" : "s"})
          </div>
          <button className="button" onClick={copyEmailDraft} disabled={!generatedEmailText}>
            <Copy size={15} className="inline-icon" />
            {copied ? "Copied" : "Copy email text"}
          </button>
        </div>
        <textarea
          className="input textarea email-draft-textarea"
          readOnly
          value={
            generatedEmailText ||
            "Select equipment or keep all selected by default to generate a draft email for pending preventive maintenance."
          }
        />
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
