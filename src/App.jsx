import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { loadRowsWithFallback, persistRows } from "./storage";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

const initialData = [
  {
    id: 1,
    hospital: "Mount Lebanon Hospital",
    contractNo: "SC/26-27/0345",
    equipment: "Patient Monitor",
    model: "B105",
    serial: "MLH-PM-001",
    pmsPerYear: 2,
    nextPmDate: "2026-05-10",
    department: "ICU",
    notes: "Coordinate with ICU nurse in charge before PM.",
    reminderDates: "2026-04-25, 2026-05-03",
    lastPmDate: "2025-11-10",
    completionDate: "",
    status: "Upcoming",
    engineer: "Ahmad",
    contactEmail: "biomed@mlh.example.com",
    reminder1Sent: false,
    reminder2Sent: false,
    engineerAlertSent: false,
  },
  {
    id: 2,
    hospital: "LAU Medical Center-Rizk Hospital",
    contractNo: "SC/26-26/0344",
    equipment: "Anesthesia Machine",
    model: "Aespire View",
    serial: "RIZK-AN-014",
    pmsPerYear: 4,
    nextPmDate: "2026-04-11",
    department: "OR",
    notes: "Unit used heavily on weekdays.",
    reminderDates: "2026-03-27, 2026-04-04",
    lastPmDate: "2026-01-11",
    completionDate: "",
    status: "Overdue",
    engineer: "Nadim",
    contactEmail: "maintenance@rizk.example.com",
    reminder1Sent: true,
    reminder2Sent: true,
    engineerAlertSent: true,
  },
  {
    id: 3,
    hospital: "CMC Clemenceau Medical Center",
    contractNo: "SC/25-26/0330",
    equipment: "Infusion Pump",
    model: "Volumat",
    serial: "CMC-INF-109",
    pmsPerYear: 4,
    nextPmDate: "2026-04-20",
    department: "Oncology",
    notes: "Verify battery calibration log.",
    reminderDates: "2026-04-05, 2026-04-13",
    lastPmDate: "2026-01-20",
    completionDate: "",
    status: "Confirmed",
    engineer: "Maya",
    contactEmail: "biomed@cmc.example.com",
    reminder1Sent: true,
    reminder2Sent: false,
    engineerAlertSent: true,
  },
  {
    id: 4,
    hospital: "Hammoud Hospital",
    contractNo: "SC/25-26/0337",
    equipment: "Defibrillator",
    model: "LIFEPAK 20",
    serial: "HAM-DEF-021",
    pmsPerYear: 2,
    nextPmDate: "2026-04-16",
    department: "ER",
    notes: "Keep backup pads ready during maintenance.",
    reminderDates: "2026-04-02, 2026-04-10",
    lastPmDate: "2025-10-16",
    completionDate: "",
    status: "Upcoming",
    engineer: "Karim",
    contactEmail: "biomed@hammoud.example.com",
    reminder1Sent: false,
    reminder2Sent: false,
    engineerAlertSent: false,
  },
];

const statuses = [
  "All",
  "Upcoming",
  "Hospital notified",
  "Confirmed",
  "In progress",
  "Completed",
  "Overdue",
];

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getOverdueStatus(dateStr, status) {
  if (status === "Completed") return "Completed";
  return getDaysUntil(dateStr) < 0 ? "Overdue" : "On Track";
}

function isDueThisMonth(dateStr) {
  const target = new Date(dateStr);
  const today = new Date();
  return (
    target.getFullYear() === today.getFullYear() &&
    target.getMonth() === today.getMonth()
  );
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeImportedRows(rawRows) {
  return rawRows
    .map((row, index) => {
      const hospital =
        row.Hospital || row.hospital || row["Parent System"] || row["parent system"] || "";
      const contractNo = row["Contract No."] || row.contractNo || row["Contract Number"] || "";
      const equipment =
        row.Equipment ||
        row.equipment ||
        row.Subsystem ||
        row.subsystem ||
        row["Source Description"] ||
        "";
      const model = row.Model || row.model || "";
      const serial = row["Serial Number"] || row.serial || row.Serial || "";
      const pmsPerYear = Number(row["PMs per Year"] || row.pmsPerYear || 1) || 1;
      const nextPmDate =
        row["Next PM Date"] || row.nextPmDate || new Date().toISOString().slice(0, 10);
      const status = row.Status || row.status || "Upcoming";
      const engineer = row["Engineer Assigned"] || row.engineer || "";
      const contactEmail = row["Hospital Contact Email"] || row.contactEmail || "";
      const department = row.Department || row.department || "";
      const notes = row.Notes || row.notes || "";
      const reminderDates = row["Reminder Dates"] || row.reminderDates || "";
      const lastPmDate = row["Last PM Date"] || row.lastPmDate || "";
      const completionDate = row["Completion Date"] || row.completionDate || "";

      if (!hospital && !equipment && !serial) return null;

      return {
        id: Date.now() + index,
        hospital,
        contractNo,
        equipment,
        model,
        serial,
        pmsPerYear,
        nextPmDate,
        department,
        notes,
        reminderDates,
        lastPmDate,
        completionDate,
        status,
        engineer,
        contactEmail,
        reminder1Sent:
          String(row["Reminder 1 Sent"] || row.reminder1Sent || "").toLowerCase() === "true" ||
          String(row["Reminder 1 Sent"] || "").toLowerCase() === "yes",
        reminder2Sent:
          String(row["Reminder 2 Sent"] || row.reminder2Sent || "").toLowerCase() === "true" ||
          String(row["Reminder 2 Sent"] || "").toLowerCase() === "yes",
        engineerAlertSent:
          String(row["Engineer Alert Sent"] || row.engineerAlertSent || "").toLowerCase() ===
            "true" ||
          String(row["Engineer Alert Sent"] || "").toLowerCase() === "yes",
      };
    })
    .filter(Boolean);
}

export default function App() {
  const defaultEquipmentForm = {
    hospital: "",
    contractNo: "",
    equipment: "",
    model: "",
    serial: "",
    department: "",
    pmsPerYear: 1,
    nextPmDate: "",
    lastPmDate: "",
    completionDate: "",
    reminderDates: "",
    status: "Upcoming",
    engineer: "",
    contactEmail: "",
    notes: "",
  };

  const normalizeRows = (sourceRows) =>
    sourceRows.map((row) => ({
      ...row,
      department: row.department || "",
      notes: row.notes || "",
      reminderDates: row.reminderDates || "",
      lastPmDate: row.lastPmDate || "",
      completionDate: row.completionDate || "",
    }));

  const [rows, setRows] = useState(() => normalizeRows(initialData));
  const [storageReady, setStorageReady] = useState(false);

  const [search, setSearch] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [timingFilter, setTimingFilter] = useState("All");
  const [sortBy, setSortBy] = useState("None");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [equipmentForm, setEquipmentForm] = useState(defaultEquipmentForm);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const loadedRows = await loadRowsWithFallback(initialData);
        if (!cancelled) {
          setRows(normalizeRows(loadedRows));
          setStorageReady(true);
        }
      } catch (error) {
        console.error("Failed to load PM tracker rows", error);
        if (!cancelled) {
          setRows(normalizeRows(initialData));
          setStorageReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;

    persistRows(rows).catch((error) => {
      console.error("Failed to persist PM tracker rows", error);
    });
  }, [rows, storageReady]);

  const hospitals = useMemo(() => {
    const unique = Array.from(new Set(rows.map((r) => r.hospital).filter(Boolean)));
    return ["All", ...unique];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      const matchesSearch = [
        row.hospital,
        row.contractNo,
        row.equipment,
        row.model,
        row.serial,
        row.department,
        row.notes,
        row.reminderDates,
        row.lastPmDate,
        row.completionDate,
        row.engineer,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesHospital = hospitalFilter === "All" || row.hospital === hospitalFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;

      const daysUntil = getDaysUntil(row.nextPmDate);
      const overdueStatus = getOverdueStatus(row.nextPmDate, row.status);
      const matchesTiming =
        timingFilter === "All" ||
        (timingFilter === "Overdue only" && overdueStatus === "Overdue") ||
        (timingFilter === "Due this week" && daysUntil >= 0 && daysUntil <= 7 && row.status !== "Completed") ||
        (timingFilter === "Due this month" && isDueThisMonth(row.nextPmDate) && row.status !== "Completed") ||
        (timingFilter === "Completed" && row.status === "Completed");

      return matchesSearch && matchesHospital && matchesStatus && matchesTiming;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "Hospital") {
        return a.hospital.localeCompare(b.hospital);
      }

      if (sortBy === "Next PM date") {
        return new Date(a.nextPmDate) - new Date(b.nextPmDate);
      }

      if (sortBy === "Overdue") {
        const aOverdue = getOverdueStatus(a.nextPmDate, a.status) === "Overdue" ? 0 : 1;
        const bOverdue = getOverdueStatus(b.nextPmDate, b.status) === "Overdue" ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return getDaysUntil(a.nextPmDate) - getDaysUntil(b.nextPmDate);
      }

      if (sortBy === "Engineer") {
        return (a.engineer || "").localeCompare(b.engineer || "");
      }

      return 0;
    });
  }, [rows, search, hospitalFilter, statusFilter, timingFilter, sortBy]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const overdue = rows.filter(
      (r) => getOverdueStatus(r.nextPmDate, r.status) === "Overdue"
    ).length;
    const dueSoon = rows.filter((r) => {
      const days = getDaysUntil(r.nextPmDate);
      return days >= 0 && days <= 7 && r.status !== "Completed";
    }).length;
    const completed = rows.filter((r) => r.status === "Completed").length;
    return { total, overdue, dueSoon, completed };
  }, [rows]);

  const byHospital = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (!map[row.hospital]) {
        map[row.hospital] = { total: 0, overdue: 0, upcoming: 0 };
      }
      map[row.hospital].total += 1;
      if (getOverdueStatus(row.nextPmDate, row.status) === "Overdue") {
        map[row.hospital].overdue += 1;
      }
      if (row.status === "Upcoming") {
        map[row.hospital].upcoming += 1;
      }
    });
    return Object.entries(map).map(([hospital, values]) => ({
      hospital,
      ...values,
    }));
  }, [rows]);

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;

    const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
    const rawRows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = (values[i] || "").trim();
      });
      return obj;
    });

    const imported = normalizeImportedRows(rawRows);
    if (imported.length) setRows(imported);
    event.target.value = "";
  }

  function exportCsv() {
    const headers = [
      "Hospital",
      "Contract No.",
      "Equipment",
      "Model",
      "Serial Number",
      "PMs per Year",
      "Next PM Date",
      "Department",
      "Notes",
      "Reminder Dates",
      "Last PM Date",
      "Completion Date",
      "Status",
      "Engineer Assigned",
      "Hospital Contact Email",
      "Reminder 1 Sent",
      "Reminder 2 Sent",
      "Engineer Alert Sent",
    ];

    const csv = [headers.join(",")]
      .concat(
        rows.map((row) =>
          [
            row.hospital,
            row.contractNo,
            row.equipment,
            row.model,
            row.serial,
            row.pmsPerYear,
            row.nextPmDate,
            row.department,
            row.notes,
            row.reminderDates,
            row.lastPmDate,
            row.completionDate,
            row.status,
            row.engineer,
            row.contactEmail,
            row.reminder1Sent ? "Yes" : "No",
            row.reminder2Sent ? "Yes" : "No",
            row.engineerAlertSent ? "Yes" : "No",
          ]
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pm-tracker-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pm-tracker-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateRow(id, patch) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function handleFormChange(field, value) {
    setEquipmentForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEquipmentForm(defaultEquipmentForm);
    setEditingId(null);
    setShowForm(false);
  }

  function startAdd() {
    setEquipmentForm(defaultEquipmentForm);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(row) {
    setEquipmentForm({
      hospital: row.hospital || "",
      contractNo: row.contractNo || "",
      equipment: row.equipment || "",
      model: row.model || "",
      serial: row.serial || "",
      department: row.department || "",
      pmsPerYear: row.pmsPerYear || 1,
      nextPmDate: row.nextPmDate || "",
      lastPmDate: row.lastPmDate || "",
      completionDate: row.completionDate || "",
      reminderDates: row.reminderDates || "",
      status: row.status || "Upcoming",
      engineer: row.engineer || "",
      contactEmail: row.contactEmail || "",
      notes: row.notes || "",
    });
    setEditingId(row.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function handleSubmitEquipment(event) {
    event.preventDefault();
    const payload = {
      ...equipmentForm,
      pmsPerYear: Number(equipmentForm.pmsPerYear) || 1,
    };

    if (editingId) {
      updateRow(editingId, payload);
    } else {
      setRows((current) => [{ id: Date.now(), ...payload }, ...current]);
    }
    resetForm();
  }


  function badgeClass(status, overdueStatus) {
    if (status === "Completed") return "badge badge-completed";
    if (overdueStatus === "Overdue") return "badge badge-overdue";
    if (status === "Confirmed") return "badge badge-confirmed";
    return "badge badge-default";
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="topbar">
          <div>
            <h1 className="page-title">Preventive Maintenance Tracker</h1>
            <p className="subtitle">
              Local PM dashboard using IndexedDB with local backup + CSV/JSON exports.
            </p>
          </div>

          <div className="actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden-input"
              onChange={handleImportFile}
            />
            <button className="button" onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </button>
            <button className="button" onClick={exportCsv}>
              Export CSV
            </button>
            <button className="button" onClick={exportJson}>
              Export JSON
            </button>
            <button className="button button-primary" onClick={startAdd}>
              <Plus size={16} className="inline-icon" />
              Add Equipment
            </button>
          </div>
        </div>

        {showForm ? (
          <div className="card form-card">
            <div className="form-head">
              <h2 className="section-title">
                {editingId ? "Edit Equipment" : "Add Equipment"}
              </h2>
              <button className="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
            <form className="equipment-form" onSubmit={handleSubmitEquipment}>
              <div className="form-grid">
                <input
                  required
                  className="input"
                  placeholder="Hospital"
                  value={equipmentForm.hospital}
                  onChange={(e) => handleFormChange("hospital", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Contract No."
                  value={equipmentForm.contractNo}
                  onChange={(e) => handleFormChange("contractNo", e.target.value)}
                />
                <input
                  required
                  className="input"
                  placeholder="Equipment"
                  value={equipmentForm.equipment}
                  onChange={(e) => handleFormChange("equipment", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Model"
                  value={equipmentForm.model}
                  onChange={(e) => handleFormChange("model", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Serial"
                  value={equipmentForm.serial}
                  onChange={(e) => handleFormChange("serial", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Department"
                  value={equipmentForm.department}
                  onChange={(e) => handleFormChange("department", e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="PMs per Year"
                  value={equipmentForm.pmsPerYear}
                  onChange={(e) => handleFormChange("pmsPerYear", e.target.value)}
                />
                <input
                  className="input"
                  type="date"
                  value={equipmentForm.nextPmDate}
                  onChange={(e) => handleFormChange("nextPmDate", e.target.value)}
                />
                <input
                  className="input"
                  type="date"
                  value={equipmentForm.lastPmDate}
                  onChange={(e) => handleFormChange("lastPmDate", e.target.value)}
                />
                <input
                  className="input"
                  type="date"
                  value={equipmentForm.completionDate}
                  onChange={(e) => handleFormChange("completionDate", e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Reminder dates (comma-separated)"
                  value={equipmentForm.reminderDates}
                  onChange={(e) => handleFormChange("reminderDates", e.target.value)}
                />
                <select
                  className="select"
                  value={equipmentForm.status}
                  onChange={(e) => handleFormChange("status", e.target.value)}
                >
                  {statuses.filter((status) => status !== "All").map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Engineer"
                  value={equipmentForm.engineer}
                  onChange={(e) => handleFormChange("engineer", e.target.value)}
                />
                <input
                  className="input"
                  type="email"
                  placeholder="Hospital Contact Email"
                  value={equipmentForm.contactEmail}
                  onChange={(e) => handleFormChange("contactEmail", e.target.value)}
                />
              </div>
              <textarea
                className="input textarea"
                placeholder="Notes"
                value={equipmentForm.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
              />
              <button className="button button-primary" type="submit">
                {editingId ? "Save Changes" : "Add Equipment"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="metrics-grid">
          <div className="card">
            <div className="metric-row">
              <div>
                <div className="metric-label">Total Equipment</div>
                <div className="metric-value">{metrics.total}</div>
              </div>
              <ClipboardList />
            </div>
          </div>

          <div className="card">
            <div className="metric-row">
              <div>
                <div className="metric-label">Overdue</div>
                <div className="metric-value">{metrics.overdue}</div>
              </div>
              <AlertTriangle />
            </div>
          </div>

          <div className="card">
            <div className="metric-row">
              <div>
                <div className="metric-label">Due in 7 Days</div>
                <div className="metric-value">{metrics.dueSoon}</div>
              </div>
              <Bell />
            </div>
          </div>

          <div className="card">
            <div className="metric-row">
              <div>
                <div className="metric-label">Completed</div>
                <div className="metric-value">{metrics.completed}</div>
              </div>
              <CheckCircle2 />
            </div>
          </div>
        </div>

        <div className="card filters-card">
          <div className="filters-grid">
            <div className="search-wrap">
              <Search size={16} className="search-icon" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hospital, equipment, model, serial, engineer..."
                className="input search-input"
              />
            </div>

            <select
              value={hospitalFilter}
              onChange={(e) => setHospitalFilter(e.target.value)}
              className="select"
            >
              {hospitals.map((hospital) => (
                <option key={hospital} value={hospital}>
                  {hospital}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={timingFilter}
              onChange={(e) => setTimingFilter(e.target.value)}
              className="select"
            >
              {["All", "Overdue only", "Due this week", "Due this month", "Completed"].map(
                (filterOption) => (
                  <option key={filterOption} value={filterOption}>
                    {filterOption}
                  </option>
                )
              )}
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select">
              {["None", "Hospital", "Next PM date", "Overdue", "Engineer"].map((option) => (
                <option key={option} value={option}>
                  Sort: {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="main-grid">
          <div className="card">
            <h2 className="section-title">Equipment List</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hospital</th>
                    <th>Equipment</th>
                    <th>Model</th>
                    <th>Department</th>
                    <th>Next PM</th>
                    <th>Last PM</th>
                    <th>Completion</th>
                    <th>Engineer</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const overdueStatus = getOverdueStatus(row.nextPmDate, row.status);
                    return (
                      <tr key={row.id}>
                        <td>{row.hospital}</td>
                        <td>
                          <div className="strong">{row.equipment}</div>
                          <div className="muted">{row.serial}</div>
                        </td>
                        <td>{row.model}</td>
                        <td>{row.department || "—"}</td>
                        <td>
                          <div>{row.nextPmDate}</div>
                          <div className="muted">{getDaysUntil(row.nextPmDate)} days</div>
                        </td>
                        <td>{row.lastPmDate || "—"}</td>
                        <td>{row.completionDate || "—"}</td>
                        <td>{row.engineer}</td>
                        <td>
                          <span className={badgeClass(row.status, overdueStatus)}>
                            {overdueStatus === "Overdue" && row.status !== "Completed"
                              ? "Overdue"
                              : row.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="button"
                              onClick={() =>
                                updateRow(row.id, { reminder1Sent: !row.reminder1Sent })
                              }
                            >
                              R1: {row.reminder1Sent ? "Sent" : "Pending"}
                            </button>
                            <button
                              className="button"
                              onClick={() =>
                                updateRow(row.id, { reminder2Sent: !row.reminder2Sent })
                              }
                            >
                              R2: {row.reminder2Sent ? "Sent" : "Pending"}
                            </button>
                            <button
                              className="button"
                              onClick={() =>
                                updateRow(row.id, {
                                  engineerAlertSent: !row.engineerAlertSent,
                                })
                              }
                            >
                              Alert: {row.engineerAlertSent ? "Sent" : "Pending"}
                            </button>
                            <button
                              className="button"
                              onClick={() => updateRow(row.id, { status: "Completed" })}
                            >
                              Complete
                            </button>
                            <button className="button" onClick={() => startEdit(row)}>
                              <Pencil size={14} className="inline-icon" />
                              Edit
                            </button>
                            <button className="button danger" onClick={() => handleDelete(row.id)}>
                              <Trash2 size={14} className="inline-icon" />
                              Delete
                            </button>
                          </div>
                          {row.reminderDates ? (
                            <div className="muted action-note">
                              Reminder dates: {row.reminderDates}
                            </div>
                          ) : null}
                          {row.notes ? (
                            <div className="muted action-note">Notes: {row.notes}</div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="side-grid">
            <div className="card">
              <h2 className="section-title">Quick Actions</h2>
              <div className="side-actions">
                <button className="button">
                  <Bell size={16} className="inline-icon" />
                  Send Upcoming PM Reminders
                </button>
                <button className="button">
                  <Wrench size={16} className="inline-icon" />
                  Notify Engineers
                </button>
                <button className="button">
                  <AlertTriangle size={16} className="inline-icon" />
                  View Overdue Equipment
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="section-title">Hospital Summary</h2>
              <div className="hospital-list">
                {byHospital.map((item) => (
                  <div key={item.hospital} className="hospital-item">
                    <div className="hospital-head">
                      <div>
                        <div className="hospital-title">{item.hospital}</div>
                        <div className="hospital-subtitle">
                          {item.total} equipment items
                        </div>
                      </div>
                      <Building2 size={18} />
                    </div>

                    <div className="hospital-stats">
                      <div className="stat-box">
                        <div className="stat-label">Upcoming</div>
                        <div className="stat-value">{item.upcoming}</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Overdue</div>
                        <div className="stat-value">{item.overdue}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
