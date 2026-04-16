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
import ContractTrackerView from "./components/ContractTrackerView";
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
    contractStartDate: "2026-01-01",
    contractEndDate: "2026-12-31",
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
    contractStartDate: "2026-02-01",
    contractEndDate: "2027-01-31",
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
    contractStartDate: "2025-09-01",
    contractEndDate: "2026-08-31",
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
    contractStartDate: "2025-07-15",
    contractEndDate: "2026-07-14",
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
  const [hospitalSummaryFilter, setHospitalSummaryFilter] = useState("All");
  const [bulkEquipmentText, setBulkEquipmentText] = useState("");
  const [reminderWindow, setReminderWindow] = useState("next-week");
  const [reminderScheduleAt, setReminderScheduleAt] = useState("");
  const [quickActionFeedback, setQuickActionFeedback] = useState("");
  const fileInputRef = useRef(null);
  const contractFileInputRef = useRef(null);

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

  const contractRows = useMemo(() => {
    const contractMap = new Map();
    rows.forEach((row) => {
      const key = `${row.hospital || ""}::${row.contractNo || ""}`;
      if (!contractMap.has(key)) {
        const endDate = row.contractEndDate || "";
        const daysLeft = endDate ? getDaysUntil(endDate) : Number.POSITIVE_INFINITY;
        contractMap.set(key, {
          id: key,
          hospital: row.hospital,
          contractNo: row.contractNo,
          contractStartDate: row.contractStartDate,
          contractEndDate: endDate,
          daysLeft,
        });
      }
    });

    return Array.from(contractMap.values())
      .filter((item) => item.hospital || item.contractNo)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [rows]);

  function openHospitalDetail(hospital) {
    setSelectedHospitalDetail(hospital);
    setCurrentPage("hospital-detail");
  }

  function openContractsView() {
    setCurrentPage("contracts");
  }

  function openHospitalStatusView() {
    setCurrentPage("hospital-status");
  }

  function closeContractsView() {
    setCurrentPage("dashboard");
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

  async function handleImportContractsFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const importedRows = parseCsvText(text);

    if (!importedRows.length) {
      event.target.value = "";
      return;
    }

    const normalizedContracts = importedRows
      .map((row) => ({
        hospital: row.Hospital || row.hospital || "",
        contractNo: row["Contract No."] || row.contractNo || row["Contract Number"] || "",
        contractStartDate: row["Contract Start Date"] || row.contractStartDate || "",
        contractEndDate: row["Contract End Date"] || row.contractEndDate || "",
      }))
      .filter((row) => row.hospital || row.contractNo);

    if (!normalizedContracts.length) {
      event.target.value = "";
      return;
    }

    const contractsMap = new Map(
      normalizedContracts.map((contract) => [`${contract.hospital}::${contract.contractNo}`, contract])
    );

    setRows((current) =>
      current.map((row) => {
        const contractKey = `${row.hospital || ""}::${row.contractNo || ""}`;
        const importedContract = contractsMap.get(contractKey);
        if (!importedContract) return row;
        return {
          ...row,
          contractStartDate: importedContract.contractStartDate,
          contractEndDate: importedContract.contractEndDate,
        };
      })
    );

    event.target.value = "";
  }

  function exportContractsToCsv() {
    const headers = ["Hospital", "Contract No.", "Contract Start Date", "Contract End Date", "Days Left"];
    const csv = [headers.join(",")]
      .concat(
        contractRows.map((contract) =>
          [contract.hospital, contract.contractNo, contract.contractStartDate, contract.contractEndDate, contract.daysLeft]
            .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pm-contracts-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportContractsToJson() {
    const blob = new Blob([JSON.stringify(contractRows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pm-contracts-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
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

  function handleUpcomingReminderAction() {
    if (!reminderScheduleAt) {
      setQuickActionFeedback("Please choose a definite reminder date and time first.");
      return;
    }

    const windowDays = reminderWindow === "next-month" ? 30 : 7;
    const eligibleRows = rows.filter((row) => {
      const meta = getTrackingMeta(row);
      return meta.daysUntil >= 0 && meta.daysUntil <= windowDays && meta.effectiveStatus !== "Completed";
    });

    if (!eligibleRows.length) {
      setQuickActionFeedback("No upcoming PM items match your selected window.");
      return;
    }

    const ids = new Set(eligibleRows.map((row) => row.id));
    setRows((current) =>
      current.map((row) =>
        ids.has(row.id)
          ? {
              ...row,
              reminder1Sent: true,
              status: row.status === "Upcoming" ? "Hospital notified" : row.status,
            }
          : row
      )
    );

    setQuickActionFeedback(
      `Scheduled ${eligibleRows.length} reminder(s) for ${new Date(reminderScheduleAt).toLocaleString()} (${reminderWindow === "next-month" ? "next month" : "next week"}).`
    );
  }

  function handleNotifyEngineersQuickAction(targetRows = rows) {
    const actionableRows = targetRows.filter((row) => getTrackingMeta(row).effectiveStatus !== "Completed");
    if (!actionableRows.length) {
      setQuickActionFeedback("No pending PM items found to notify engineers.");
      return;
    }

    const ids = new Set(actionableRows.map((row) => row.id));
    setRows((current) =>
      current.map((row) =>
        ids.has(row.id)
          ? {
              ...row,
              engineerAlertSent: true,
              updatedBy: row.engineer || row.updatedBy || "System",
            }
          : row
      )
    );
    setQuickActionFeedback(`Engineers notified for ${actionableRows.length} equipment item(s).`);
  }

  function showOverdueQuickAction() {
    setTimingFilter("Overdue only");
    setCurrentPage("dashboard");
    setQuickActionFeedback("Showing overdue equipment in the main table.");
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
                <input
                  className="input"
                  type="date"
                  aria-label="Contract start date"
                  title="Contract start date"
                  value={equipmentForm.contractStartDate}
                  onChange={(e) => handleFormChange("contractStartDate", e.target.value)}
                />
                <input
                  className="input"
                  type="date"
                  aria-label="Contract end date"
                  title="Contract end date"
                  value={equipmentForm.contractEndDate}
                  onChange={(e) => handleFormChange("contractEndDate", e.target.value)}
                />
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
        <div className="view-toggle-row">
          <button className={`button ${currentPage === "dashboard" ? "button-primary" : ""}`} onClick={() => setCurrentPage("dashboard")}>
            Dashboard
          </button>
          <button className={`button ${currentPage === "hospital-status" ? "button-primary" : ""}`} onClick={openHospitalStatusView}>
            Hospital Equipment Status
          </button>
          <button className={`button ${currentPage === "contracts" ? "button-primary" : ""}`} onClick={openContractsView}>
            Contracts View
          </button>
        </div>

        {currentPage === "dashboard" ? (
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
            onBack={() => setCurrentPage("hospital-status")}
            onSendHospitalEmail={handleNotifyEngineersQuickAction}
          />
        ) : currentPage === "hospital-status" ? (
          <div className="main-grid">
            <div className="side-grid">
              <div className="card">
                <h2 className="section-title">Quick Actions</h2>
                <div className="side-actions">
                  <div className="quick-action-block">
                    <label className="muted">Reminder window</label>
                    <select className="select" value={reminderWindow} onChange={(event) => setReminderWindow(event.target.value)}>
                      <option value="next-week">Next week</option>
                      <option value="next-month">Next month</option>
                    </select>
                    <label className="muted">Send at (date/time)</label>
                    <input className="input" type="datetime-local" value={reminderScheduleAt} onChange={(event) => setReminderScheduleAt(event.target.value)} />
                  </div>
                  <button className="button" onClick={handleUpcomingReminderAction}>
                    <Bell size={16} className="inline-icon" />
                    Send Upcoming PM Reminders
                  </button>
                  <button className="button" onClick={() => handleNotifyEngineersQuickAction()}>
                    <Wrench size={16} className="inline-icon" />
                    Notify Engineers
                  </button>
                  <button className="button" onClick={showOverdueQuickAction}>
                    <AlertTriangle size={16} className="inline-icon" />
                    View Overdue Equipment
                  </button>
                  {quickActionFeedback ? <div className="quick-action-feedback">{quickActionFeedback}</div> : null}
                </div>
              </div>
            </div>

            <HospitalSummary
              byHospital={byHospital}
              selectedHospital={selectedHospitalDetail}
              onSelectHospital={openHospitalDetail}
              hospitalSummaryFilter={hospitalSummaryFilter}
              onHospitalSummaryFilterChange={setHospitalSummaryFilter}
            />
          </div>
        ) : currentPage === "contracts" ? (
          <ContractTrackerView
            contracts={contractRows}
            onBack={closeContractsView}
            contractFileInputRef={contractFileInputRef}
            onImportContracts={handleImportContractsFile}
            onExportContractsCsv={exportContractsToCsv}
            onExportContractsJson={exportContractsToJson}
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
              <HospitalSummary
                byHospital={byHospital}
                selectedHospital={selectedHospitalDetail}
                onSelectHospital={openHospitalDetail}
                hospitalSummaryFilter={hospitalSummaryFilter}
                onHospitalSummaryFilterChange={setHospitalSummaryFilter}
              />
            </div>
          </div>
        )}
      </div>

      <EquipmentDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
