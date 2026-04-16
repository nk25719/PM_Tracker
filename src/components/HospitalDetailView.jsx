import React, { useEffect, useMemo, useState } from "react";
import { Building2, Mail } from "lucide-react";

function buildMailTo(row, hospital) {
  const subject = `PM Follow-up: ${row.equipment} (${row.serial || "No serial"})`;
  const body = [
    "Hello,",
    "",
    `This is a quick follow-up for preventive maintenance at ${hospital}.`,
    "",
    `Equipment: ${row.equipment}`,
    `Model: ${row.model || "-"}`,
    `Serial: ${row.serial || "-"}`,
    `Department: ${row.department || "-"}`,
    `Current Status: ${row.status || "Upcoming"}`,
    `Next PM Date: ${row.nextPmDate || "-"}`,
    "",
    "Please confirm a suitable maintenance time slot.",
    "",
    "Regards,",
    row.engineer || "PM Team",
  ].join("\n");

  return `mailto:${row.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function HospitalDetailView({ hospital, rows, onClose, getTrackingMeta }) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);

  useEffect(() => {
    if (!rows.length) {
      setSelectedEquipmentId(null);
      return;
    }

    setSelectedEquipmentId((current) => {
      if (current && rows.some((row) => String(row.id) === String(current))) return current;
      return String(rows[0].id);
    });
  }, [rows]);

  const selectedEquipment = useMemo(
    () => rows.find((row) => String(row.id) === String(selectedEquipmentId)) || null,
    [rows, selectedEquipmentId]
  );

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

      <div className="hospital-quick-actions">
        <select
          className="select"
          value={selectedEquipmentId ? String(selectedEquipmentId) : ""}
          onChange={(event) => setSelectedEquipmentId(event.target.value)}
          disabled={!rows.length}
        >
          {rows.map((row) => (
            <option key={row.id} value={String(row.id)}>
              {row.equipment} {row.serial ? `(${row.serial})` : ""}
            </option>
          ))}
        </select>

        {selectedEquipment?.contactEmail ? (
          <a className="button button-primary" href={buildMailTo(selectedEquipment, hospital)}>
            <Mail size={15} className="inline-icon" />
            Email selected equipment
          </a>
        ) : (
          <button className="button" disabled>
            <Mail size={15} className="inline-icon" />
            No contact email
          </button>
        )}
      </div>

      <div className="hospital-status-view">
        <h3 className="section-title hospital-subsection-title">Equipment Status View</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
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
                  return (
                    <tr key={row.id} className={String(selectedEquipmentId) === String(row.id) ? "hospital-status-row-selected" : ""}>
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
                  <td colSpan={5} className="muted">
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
