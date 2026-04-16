import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { AlertTriangle, Bell, Wrench } from "lucide-react";
import { loadRowsFromStorage, saveRowsToStorage } from "./storage";
import DashboardCards from "./components/DashboardCards";
import EquipmentTable from "./components/EquipmentTable";
import FiltersBar from "./components/FiltersBar";
import HospitalSummary from "./components/HospitalSummary";
import ImportExportBar from "./components/ImportExportBar";
import EquipmentDetailModal from "./components/EquipmentDetailModal";
import HospitalDetailView from "./components/HospitalDetailView";
import {
  addMonths,
  getIntervalMonths,
  getTrackingMeta,
  getTodayIsoDate,
  getDaysUntil,
  isDueThisMonth,
} from "./utils/dateUtils";
import {
  exportRowsToCsv,
  exportRowsToJson,
  normalizeImportedRows,
  parseCsvText,
} from "./utils/csvUtils";
import {
  createDefaultEquipmentForm,
  createEquipmentFormFromRow,
  editableStatuses,
  normalizeRows,
  normalizeStatus,
  statuses,
} from "./utils/storage";

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
    status: "Hospital notified",
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

export default function App() {
  const defaultEquipmentForm = createDefaultEquipmentForm();

  const [rows, setRows] = useState(() => normalizeRows(initialData));
  const [isStorageReady, setIsStorageReady] = useState(false);

  const [search, setSearch] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [timingFilter, setTimingFilter] = useState("All");
  const [sortBy, setSortBy] = useState("None");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [equipmentForm, setEquipmentForm] = useState(defaultEquipmentForm);
  const [detailRow, setDetailRow] = useState(null);
  const [selectedHospitalDetail, setSelectedHospitalDetail] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [bulkEquipmentText, setBulkEquipmentText] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreRows() {
      try {
        const storedRows = await loadRowsFromStorage();
        if (isMounted && Array.isArray(storedRows)) {
          setRows(normalizeRows(storedRows));
        }
      } catch (error) {
        console.error("Failed to load data from IndexedDB", error);
      } finally {
        if (isMounted) setIsStorageReady(true);
      }
    }

    restoreRows();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    saveRowsToStorage(rows).catch((error) => {
      console.error("Failed to save data to IndexedDB", error);
    });
  }, [rows, isStorageReady]);

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
        row.updatedBy,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesHospital = hospitalFilter === "All" || row.hospital === hospitalFilter;
      const meta = getTrackingMeta(row);
      const matchesStatus =
        statusFilter === "All" || row.status === statusFilter || (statusFilter === "Overdue" && meta.isOverdue);

      const matchesTiming =
        timingFilter === "All" ||
        (timingFilter === "Overdue only" && meta.isOverdue) ||
        (timingFilter === "Due this week" && meta.dueSoon7) ||
        (timingFilter === "Due this month" && isDueThisMonth(row.nextPmDate) && meta.effectiveStatus !== "Completed") ||
        (timingFilter === "Completed" && row.status === "Completed");

      return matchesSearch && matchesHospital && matchesStatus && matchesTiming;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "Hospital") return a.hospital.localeCompare(b.hospital);
      if (sortBy === "Next PM date") return new Date(a.nextPmDate) - new Date(b.nextPmDate);

      if (sortBy === "Overdue") {
        const aOverdue = getTrackingMeta(a).isOverdue ? 0 : 1;
        const bOverdue = getTrackingMeta(b).isOverdue ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return getDaysUntil(a.nextPmDate) - getDaysUntil(b.nextPmDate);
      }

      if (sortBy === "Engineer") return (a.engineer || "").localeCompare(b.engineer || "");
      return 0;
    });
  }, [rows, search, hospitalFilter, statusFilter, timingFilter, sortBy]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const overdue = rows.filter((r) => getTrackingMeta(r).isOverdue).length;
    const dueThisWeek = rows.filter((r) => getTrackingMeta(r).dueSoon7).length;
    const completed = rows.filter((r) => r.status === "Completed").length;
    return { total, overdue, dueThisWeek, completed };
  }, [rows]);

  const byHospital = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      if (!map[row.hospital]) {
        map[row.hospital] = { total: 0, overdue: 0, upcoming: 0, dueSoon: 0 };
      }
      const meta = getTrackingMeta(row);
      map[row.hospital].total += 1;
      if (meta.isOverdue) map[row.hospital].overdue += 1;
      if (row.status === "Upcoming") map[row.hospital].upcoming += 1;
      if (meta.dueSoon7) map[row.hospital].dueSoon += 1;
    });
    return Object.entries(map).map(([hospital, values]) => ({ hospital, ...values }));
  }, [rows]);

  const hospitalDetailRows = useMemo(
    () => rows.filter((row) => row.hospital === selectedHospitalDetail),
    [rows, selectedHospitalDetail]
  );

  function openHospitalDetail(hospital) {
    setSelectedHospitalDetail(hospital);
    setCurrentPage("hospital-detail");
  }

  function closeHospitalDetail() {
    setCurrentPage("dashboard");
    setSelectedHospitalDetail(null);
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rawRows = parseCsvText(text);
    const imported = normalizeImportedRows(rawRows, normalizeStatus, getTodayIsoDate);
    if (imported.length) setRows(normalizeRows(imported));
    event.target.value = "";
  }

  function updateRow(id, patch, actor = "System") {
    const today = getTodayIsoDate();
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              ...patch,
              updatedDate: today,
              updatedBy: actor || row.updatedBy || row.engineer || "System",
            }
          : row
      )
    );
  }

  function handleFormChange(field, value) {
    setEquipmentForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEquipmentForm(createDefaultEquipmentForm());
    setBulkEquipmentText("");
    setEditingId(null);
    setShowForm(false);
  }

  function startAdd() {
    setEquipmentForm(createDefaultEquipmentForm());
    setBulkEquipmentText("");
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(row) {
    setEquipmentForm(createEquipmentFormFromRow(row));
    setBulkEquipmentText("");
    setEditingId(row.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  function parseBulkEquipmentLines(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [equipment, model, serial, department] = line.split("|").map((part) => (part || "").trim());
        return { equipment, model, serial, department };
      })
      .filter((item) => item.equipment);
  }

  function markComplete(row) {
    const today = getTodayIsoDate();
    const intervalMonths = Math.max(1, Math.round(12 / (Number(row.pmsPerYear) || 1)));
    const actor = row.engineer || row.updatedBy || "System";

    updateRow(
      row.id,
      {
        status: "Completed",
        completionDate: today,
        lastPmDate: today,
        nextPmDate: addMonths(today, intervalMonths),
        pmHistory: [
          ...(row.pmHistory || []),
          {
            date: today,
            status: "Completed",
            updatedBy: actor,
            notes: "Marked complete from equipment table",
          },
        ],
      },
      actor
    );
  }

  function handleSubmitEquipment(event) {
    event.preventDefault();
    const today = getTodayIsoDate();
    const normalizedPmsPerYear = Number(equipmentForm.pmsPerYear) || 1;
    const intervalMonths = Math.max(1, Math.round(12 / normalizedPmsPerYear));
    const actor = equipmentForm.updatedBy || equipmentForm.engineer || "System";
    const autoNextPmDate =
      equipmentForm.status === "Completed" && equipmentForm.completionDate
        ? addMonths(equipmentForm.completionDate, intervalMonths)
        : equipmentForm.nextPmDate;

    const payload = {
      ...equipmentForm,
      pmsPerYear: normalizedPmsPerYear,
      nextPmDate: autoNextPmDate,
      updatedBy: actor,
      lastPmDate:
        equipmentForm.status === "Completed" && equipmentForm.completionDate
          ? equipmentForm.completionDate
          : equipmentForm.lastPmDate,
    };

    const bulkItems = !editingId ? parseBulkEquipmentLines(bulkEquipmentText) : [];
    const isBulkAdd = bulkItems.length > 0;

    if (editingId) {
      const existingRow = rows.find((row) => row.id === editingId);
      const completionChanged =
        payload.status === "Completed" &&
        payload.completionDate &&
        payload.completionDate !== existingRow?.completionDate;

      updateRow(
        editingId,
        {
          ...payload,
          pmHistory: completionChanged
            ? [
                ...(existingRow?.pmHistory || []),
                {
                  date: payload.completionDate,
                  status: "Completed",
                  updatedBy: actor,
                  notes: "Completed from edit form",
                },
              ]
            : existingRow?.pmHistory || [],
        },
        actor
      );
    } else {
      setRows((current) => [
        ...(isBulkAdd
          ? bulkItems.map((item, index) => ({
              id: Date.now() + index,
              reminder1Sent: false,
              reminder2Sent: false,
              engineerAlertSent: false,
              createdDate: today,
              updatedDate: today,
              updatedBy: actor,
              pmHistory:
                payload.status === "Completed" && payload.completionDate
                  ? [
                      {
                        date: payload.completionDate,
                        status: "Completed",
                        updatedBy: actor,
                        notes: "Initial completed entry",
                      },
                    ]
                  : [],
              ...payload,
              equipment: item.equipment,
              model: item.model || payload.model,
              serial: item.serial || payload.serial,
              department: item.department || payload.department,
            }))
          : [
              {
                id: Date.now(),
                reminder1Sent: false,
                reminder2Sent: false,
                engineerAlertSent: false,
                createdDate: today,
                updatedDate: today,
                updatedBy: actor,
                pmHistory:
                  payload.status === "Completed" && payload.completionDate
                    ? [
                        {
                          date: payload.completionDate,
                          status: "Completed",
                          updatedBy: actor,
                          notes: "Initial completed entry",
                        },
                      ]
                    : [],
                ...payload,
              },
            ]),
        ...current,
      ]);
    }

    setBulkEquipmentText("");
    resetForm();
  }

  function badgeClass(status, meta) {
    if (status === "Completed") return "badge badge-completed";
    if (status === "Deferred") return "badge badge-deferred";
    if (meta.isOverdue) return "badge badge-overdue";
    if (meta.dueSoon7) return "badge badge-due-soon";
    if (status === "Confirmed") return "badge badge-confirmed";
    return "badge badge-default";
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <div className="topbar">
          <div>
            <h1 className="page-title">Preventive Maintenance Tracker</h1>
            <p className="subtitle">Local PM dashboard with CSV import/export and reminder tracking.</p>
          </div>

          <ImportExportBar
            fileInputRef={fileInputRef}
            onImportChange={handleImportFile}
            onExportCsv={() => exportRowsToCsv(rows, getIntervalMonths)}
            onExportJson={() => exportRowsToJson(rows)}
            onStartAdd={startAdd}
          />
        </div>

        {showForm ? (
          <div className="card form-card">
            <div className="form-head">
              <h2 className="section-title">{editingId ? "Edit Equipment" : "Add Equipment"}</h2>
              <button className="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
            <form className="equipment-form" onSubmit={handleSubmitEquipment}>
              <div className="form-grid">
                <input required className="input" placeholder="Hospital" value={equipmentForm.hospital} onChange={(e) => handleFormChange("hospital", e.target.value)} />
                <input className="input" placeholder="Contract No." value={equipmentForm.contractNo} onChange={(e) => handleFormChange("contractNo", e.target.value)} />
                <input required={!bulkEquipmentText.trim()} className="input" placeholder="Equipment" value={equipmentForm.equipment} onChange={(e) => handleFormChange("equipment", e.target.value)} />
                <input className="input" placeholder="Model" value={equipmentForm.model} onChange={(e) => handleFormChange("model", e.target.value)} />
                <input className="input" placeholder="Serial" value={equipmentForm.serial} onChange={(e) => handleFormChange("serial", e.target.value)} />
                <input className="input" placeholder="Department" value={equipmentForm.department} onChange={(e) => handleFormChange("department", e.target.value)} />
                <input className="input" type="number" min="1" placeholder="PMs per Year" value={equipmentForm.pmsPerYear} onChange={(e) => handleFormChange("pmsPerYear", e.target.value)} />
                <input className="input" type="date" value={equipmentForm.nextPmDate} onChange={(e) => handleFormChange("nextPmDate", e.target.value)} />
                <input className="input" type="date" value={equipmentForm.lastPmDate} onChange={(e) => handleFormChange("lastPmDate", e.target.value)} />
                <input className="input" type="date" value={equipmentForm.completionDate} onChange={(e) => handleFormChange("completionDate", e.target.value)} />
                <input className="input" placeholder="Reminder dates (comma-separated)" value={equipmentForm.reminderDates} onChange={(e) => handleFormChange("reminderDates", e.target.value)} />
                <select className="select" value={equipmentForm.status} onChange={(e) => handleFormChange("status", e.target.value)}>
                  {editableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input className="input" placeholder="Engineer" value={equipmentForm.engineer} onChange={(e) => handleFormChange("engineer", e.target.value)} />
                <input className="input" type="email" placeholder="Hospital Contact Email" value={equipmentForm.contactEmail} onChange={(e) => handleFormChange("contactEmail", e.target.value)} />
                <input className="input" placeholder="Updated by" value={equipmentForm.updatedBy} onChange={(e) => handleFormChange("updatedBy", e.target.value)} />
              </div>
              {!editingId ? (
                <div className="bulk-add-wrap">
                  <div className="strong">Bulk equipment add (same hospital + contract)</div>
                  <div className="muted">One line per item. Format: Equipment | Model | Serial | Department</div>
                  <textarea
                    className="input textarea"
                    placeholder={"Ventilator | Servo-U | ICU-009 | ICU\nSuction Pump | New Askir | ICU-011 | ICU"}
                    value={bulkEquipmentText}
                    onChange={(e) => setBulkEquipmentText(e.target.value)}
                  />
                </div>
              ) : null}
              <textarea className="input textarea" placeholder="Notes" value={equipmentForm.notes} onChange={(e) => handleFormChange("notes", e.target.value)} />
              <button className="button button-primary" type="submit">
                {editingId ? "Save Changes" : bulkEquipmentText.trim() ? "Add Equipment in Bulk" : "Add Equipment"}
              </button>
            </form>
          </div>
        ) : null}

        <DashboardCards metrics={metrics} />

        {currentPage !== "hospital-detail" ? (
          <FiltersBar
            search={search}
            setSearch={setSearch}
            hospitalFilter={hospitalFilter}
            setHospitalFilter={setHospitalFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            timingFilter={timingFilter}
            setTimingFilter={setTimingFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            hospitals={hospitals}
            statuses={statuses}
          />
        ) : null}

        {currentPage === "hospital-detail" ? (
          <HospitalDetailView
            hospital={selectedHospitalDetail}
            rows={hospitalDetailRows}
            getTrackingMeta={getTrackingMeta}
            onBack={closeHospitalDetail}
          />
        ) : (
          <div className="main-grid">
            <EquipmentTable
              rows={filteredRows}
              getTrackingMeta={getTrackingMeta}
              badgeClass={badgeClass}
              updateRow={updateRow}
              startEdit={startEdit}
              handleDelete={handleDelete}
              markComplete={markComplete}
              onViewDetail={setDetailRow}
            />

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

              <HospitalSummary byHospital={byHospital} selectedHospital={selectedHospitalDetail} onSelectHospital={openHospitalDetail} />
            </div>
          </div>
        )}
      </div>

      <EquipmentDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
