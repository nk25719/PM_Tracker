import React, { useMemo, useState } from "react";
import { ArrowLeft, Bot, Building2, Copy, Mail, MessageSquare, Wrench } from "lucide-react";

function buildEmailDraft(pendingRows, hospital, useAiTone = false) {
  const subject = `Preventive Maintenance Follow-up - ${hospital} (${pendingRows.length} pending item${pendingRows.length === 1 ? "" : "s"})`;
  const equipmentLines = pendingRows.map(
    (row, index) =>
      `${index + 1}. ${row.equipment} | Model: ${row.model || "-"} | Serial: ${row.serial || "-"} | Dept: ${row.department || "-"} | Status: ${row.status || "Upcoming"} | Next PM: ${row.nextPmDate || "-"}`
  );

  const aiLine = useAiTone
    ? "Please use a concise, customer-friendly tone and keep the request action-oriented."
    : "Please confirm availability so we can finalize the preventive maintenance schedule.";

  const body = [
    "Hello,",
    "",
    `This is a follow-up on pending preventive maintenance for ${hospital}.`,
    aiLine,
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

function buildEngineerDispatchMessage(targetRows, hospital) {
  const lines = targetRows.map(
    (row, index) =>
      `${index + 1}. ${row.equipment} (${row.serial || "No serial"}) - ${row.department || "No department"} - Next PM: ${row.nextPmDate || "N/A"} - Hospital Contact: ${row.contactEmail || "N/A"}`
  );

  return [
    `Engineer dispatch list for ${hospital}`,
    "",
    "Please prepare and send the following PM items:",
    ...lines,
    "",
    "Include parts/tools readiness and propose visit windows per item.",
  ].join("\n");
}

function buildAiPrompt(emailDraft, hospital) {
  return [
    "Rewrite the following PM follow-up email for a hospital customer.",
    "Tone: professional, clear, warm, and concise.",
    "Keep all equipment details accurate and keep numbered action requests.",
    `Hospital: ${hospital}`,
    "",
    "EMAIL TO REWRITE:",
    `Subject: ${emailDraft.subject}`,
    "",
    emailDraft.body,
  ].join("\n");
}

export default function HospitalDetailView({
  hospital,
  rows,
  onBack,
  getTrackingMeta,
  onSendHospitalEmail,
  onAddHospitalComment,
}) {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState("all");
  const [copied, setCopied] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);
  const [copiedEngineerMessage, setCopiedEngineerMessage] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentBy, setCommentBy] = useState("PM Coordinator");
  const [useAiTone, setUseAiTone] = useState(true);

  const selectedRows = useMemo(() => {
    if (selectedEquipmentId === "all") return rows;
    return rows.filter((row) => String(row.id) === String(selectedEquipmentId));
  }, [rows, selectedEquipmentId]);

  const pendingRows = useMemo(
    () => selectedRows.filter((row) => getTrackingMeta(row).effectiveStatus !== "Completed"),
    [selectedRows, getTrackingMeta]
  );

  const selectedEquipment = useMemo(
    () => rows.find((row) => String(row.id) === String(selectedEquipmentId)),
    [rows, selectedEquipmentId]
  );

  const emailDraft = pendingRows.length ? buildEmailDraft(pendingRows, hospital, useAiTone) : null;
  const generatedEmailText = emailDraft ? `Subject: ${emailDraft.subject}\n\n${emailDraft.body}` : "";
  const canEmailSelected = pendingRows.length > 0;
  const selectedMailTo = canEmailSelected
    ? `mailto:${Array.from(new Set(selectedRows.map((row) => row.contactEmail).filter(Boolean))).join(",")}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`
    : "";

  const engineerDispatchMessage = useMemo(
    () => buildEngineerDispatchMessage(pendingRows, hospital),
    [pendingRows, hospital]
  );

  const communicationTimeline = useMemo(() => {
    return selectedRows
      .flatMap((row) => [
        ...(row.comments || []).map((item) => ({
          ...item,
          type: "comment",
          equipment: row.equipment,
          serial: row.serial,
        })),
        ...(row.emailHistory || []).map((item) => ({
          ...item,
          type: "email",
          equipment: row.equipment,
          serial: row.serial,
        })),
        ...(row.pmHistory || []).map((item) => ({
          ...item,
          type: "pm",
          equipment: row.equipment,
          serial: row.serial,
        })),
      ])
      .sort((a, b) => new Date(b.at || b.date || 0) - new Date(a.at || a.date || 0));
  }, [selectedRows]);

  if (!hospital) return null;

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

  async function copyAiPrompt() {
    if (!emailDraft) return;

    try {
      await navigator.clipboard.writeText(buildAiPrompt(emailDraft, hospital));
      setCopiedAiPrompt(true);
      setTimeout(() => setCopiedAiPrompt(false), 1800);
    } catch (error) {
      console.error("Failed to copy AI prompt", error);
    }
  }

  async function copyEngineerMessage() {
    if (!engineerDispatchMessage.trim()) return;

    try {
      await navigator.clipboard.writeText(engineerDispatchMessage);
      setCopiedEngineerMessage(true);
      setTimeout(() => setCopiedEngineerMessage(false), 1800);
    } catch (error) {
      console.error("Failed to copy engineer dispatch message", error);
    }
  }

  function handleOpenEmailClient() {
    if (!canEmailSelected) return;
    onSendHospitalEmail?.(selectedRows, emailDraft.subject);
  }

  function handleNotifyEngineers() {
    if (!pendingRows.length) return;
    onSendHospitalEmail?.(pendingRows, "Engineer dispatch sent");
  }

  function handleAddComment(event) {
    event.preventDefault();
    if (!commentText.trim()) return;
    onAddHospitalComment?.({
      rowIds: selectedRows.map((row) => row.id),
      note: commentText.trim(),
      by: commentBy.trim() || "PM Coordinator",
    });
    setCommentText("");
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

      <div className="hospital-quick-actions compact-quick-actions">
        <div>
          <label className="muted">Select equipment</label>
          <select className="select" value={selectedEquipmentId} onChange={(event) => setSelectedEquipmentId(event.target.value)}>
            <option value="all">All equipment ({rows.length})</option>
            {rows.map((row) => (
              <option key={row.id} value={String(row.id)}>
                {row.equipment} {row.serial ? `(${row.serial})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="selection-meta">
          {selectedRows.length} selected · {pendingRows.length} pending
        </div>

        <div className="selection-buttons">
          <button className="button" onClick={copyEngineerMessage} disabled={!pendingRows.length}>
            <Wrench size={15} className="inline-icon" />
            {copiedEngineerMessage ? "Engineer list copied" : "Copy engineer list"}
          </button>
          <button className="button" onClick={handleNotifyEngineers} disabled={!pendingRows.length}>
            Notify engineers
          </button>
          {canEmailSelected ? (
            <a className="button button-primary" href={selectedMailTo} onClick={handleOpenEmailClient}>
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
      </div>

      <div className="email-draft-wrap">
        <div className="email-draft-head">
          <div className="selection-meta">Email reminder draft ({pendingRows.length} pending item{pendingRows.length === 1 ? "" : "s"})</div>
          <div className="selection-buttons">
            <label className="muted ai-toggle-wrap">
              <input type="checkbox" checked={useAiTone} onChange={(event) => setUseAiTone(event.target.checked)} /> AI-friendly tone
            </label>
            <button className="button" onClick={copyAiPrompt} disabled={!generatedEmailText}>
              <Bot size={15} className="inline-icon" />
              {copiedAiPrompt ? "AI prompt copied" : "Copy AI prompt"}
            </button>
            <button className="button" onClick={copyEmailDraft} disabled={!generatedEmailText}>
              <Copy size={15} className="inline-icon" />
              {copied ? "Copied" : "Copy email text"}
            </button>
          </div>
        </div>
        <textarea
          className="input textarea email-draft-textarea"
          readOnly
          value={
            generatedEmailText ||
            "Select equipment (or All) to generate an email reminder draft for pending preventive maintenance items."
          }
        />
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
              {selectedRows.length ? (
                selectedRows.map((row) => {
                  const meta = getTrackingMeta(row);
                  return (
                    <tr key={row.id} className={selectedEquipmentId !== "all" ? "hospital-status-row-selected" : ""}>
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

      <form className="comment-form" onSubmit={handleAddComment}>
        <div className="comment-form-head">
          <div className="selection-meta">
            <MessageSquare size={14} className="inline-icon" />
            Notes for {selectedEquipment ? selectedEquipment.equipment : "all selected equipment"}
          </div>
          <input className="input" value={commentBy} onChange={(event) => setCommentBy(event.target.value)} placeholder="Added by" />
        </div>
        <textarea
          className="input textarea"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Add a follow-up note. It will be saved in the selected equipment communication history."
        />
        <button className="button" type="submit">Add note to history</button>
      </form>

      <div className="com-history-wrap">
        <h3 className="section-title hospital-subsection-title">COM History (selected view)</h3>
        {communicationTimeline.length ? (
          <div className="history-list">
            {communicationTimeline.slice(0, 40).map((entry, idx) => (
              <div key={`${entry.type}-${entry.at || entry.date}-${idx}`} className="history-item">
                <div className="strong">{entry.type.toUpperCase()} · {entry.equipment || "General"}</div>
                <div className="muted">{entry.serial || "No serial"} · {entry.by || entry.updatedBy || "System"} · {entry.at || entry.date || "Unknown date"}</div>
                <div>{entry.note || entry.notes || entry.subject || "No details"}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No communication history yet for this selection.</div>
        )}
      </div>
    </div>
  );
}
