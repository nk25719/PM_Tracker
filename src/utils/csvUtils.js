function csvBoolean(value, fallback = "") {
  const normalized = String(value || fallback).toLowerCase();
  return normalized === "true" || normalized === "yes";
}

function parseJsonArrayField(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  const text = String(value).trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getCell(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

export function parseCsvLine(line) {
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

export function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = (values[i] || "").trim();
    });
    return obj;
  });
}

export async function parseImportFile(file) {
  const extension = (file.name.split(".").pop() || "").toLowerCase();
  if (extension === "csv") {
    const text = await file.text();
    return parseCsvText(text);
  }

  if (["xlsx", "xls"].includes(extension)) {
    const text = await file.text();
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Browser-local fallback for tab-delimited exports.
    if (trimmed.includes("\t") && trimmed.includes("\n")) {
      const lines = trimmed.split(/\r?\n/).filter(Boolean);
      const headers = lines[0].split("\t").map((item) => item.trim());
      return lines.slice(1).map((line) => {
        const values = line.split("\t");
        const row = {};
        headers.forEach((header, index) => {
          row[header] = (values[index] || "").trim();
        });
        return row;
      });
    }

    if (trimmed.startsWith("<?xml") || trimmed.includes("<Workbook")) {
      const parser = new DOMParser();
      const xml = parser.parseFromString(trimmed, "text/xml");
      const rows = Array.from(xml.querySelectorAll("Row"));
      if (!rows.length) return [];
      const headers = Array.from(rows[0].querySelectorAll("Cell Data")).map((cell) => cell.textContent?.trim() || "");
      return rows.slice(1).map((xmlRow) => {
        const cells = Array.from(xmlRow.querySelectorAll("Cell Data")).map((cell) => cell.textContent?.trim() || "");
        const row = {};
        headers.forEach((header, index) => {
          row[header] = cells[index] || "";
        });
        return row;
      });
    }

    throw new Error("Excel binary files are not supported in browser mode. Save as CSV (or XML Spreadsheet) and import.");
  }

  return [];
}

export function normalizeImportedRows(rawRows, normalizeStatus, getTodayIsoDate) {
  return rawRows
    .map((row, index) => {
      const hospital = getCell(row, "Hospital", "hospital", "Parent System", "parent system");
      const contractNo = getCell(row, "Contract No.", "contractNo", "Contract Number");
      const equipment =
        getCell(row, "Equipment", "equipment", "Subsystem", "subsystem", "Source Description");
      const model = getCell(row, "Model", "model");
      const serial = getCell(row, "Serial Number", "serial", "Serial");
      const intervalMonths = Number(getCell(row, "Interval Months", "intervalMonths")) || 0;
      const pmsPerYear =
        Number(getCell(row, "PMs per Year", "pmsPerYear")) ||
        (intervalMonths > 0 ? Math.max(1, Math.round(12 / intervalMonths)) : 1);
      const nextPmDate = getCell(row, "Next PM Date", "nextPmDate") || getTodayIsoDate();
      const status = normalizeStatus(getCell(row, "Status", "status") || "Upcoming");
      const contractStartDate = getCell(row, "Contract Start Date", "contractStartDate");
      const contractEndDate = getCell(row, "Contract End Date", "contractEndDate");
      const engineer = getCell(row, "Engineer Assigned", "engineer");
      const contactEmail = getCell(row, "Hospital Contact Email", "contactEmail");
      const department = getCell(row, "Department", "department");
      const notes = getCell(row, "Notes", "notes");
      const reminderDates = getCell(row, "Reminder Dates", "reminderDates");
      const lastPmDate = getCell(row, "Last PM Date", "lastPmDate");
      const completionDate = getCell(row, "Completion Date", "completionDate");
      const createdDate = getCell(row, "Created Date", "createdDate") || getTodayIsoDate();
      const updatedDate = getCell(row, "Updated Date", "updatedDate") || createdDate;
      const updatedBy = getCell(row, "Updated By", "updatedBy") || engineer || "System";
      const importedId = Number(getCell(row, "Id", "id")) || Date.now() + index;
      const contractHistory = parseJsonArrayField(getCell(row, "Contract History", "contractHistory"));
      const pmHistory = parseJsonArrayField(getCell(row, "PM History", "pmHistory"));
      const comments = parseJsonArrayField(getCell(row, "Comments", "comments"));
      const emailHistory = parseJsonArrayField(getCell(row, "Email History", "emailHistory"));

      if (!hospital && !equipment && !serial) return null;

      return {
        id: importedId,
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
        contractStartDate,
        contractEndDate,
        engineer,
        contactEmail,
        reminder1Sent: csvBoolean(getCell(row, "Reminder 1 Sent", "reminder1Sent"), row["Reminder 1 Sent"]),
        reminder2Sent: csvBoolean(getCell(row, "Reminder 2 Sent", "reminder2Sent"), row["Reminder 2 Sent"]),
        engineerAlertSent: csvBoolean(
          getCell(row, "Engineer Alert Sent", "engineerAlertSent"),
          row["Engineer Alert Sent"]
        ),
        createdDate,
        updatedDate,
        updatedBy,
        contractHistory,
        pmHistory,
        comments,
        emailHistory,
      };
    })
    .filter(Boolean);
}

export function exportRowsToCsv(rows, getIntervalMonths) {
  const headers = [
    "Hospital",
    "Contract No.",
    "Equipment",
    "Model",
    "Serial Number",
    "PMs per Year",
    "Interval Months",
    "Next PM Date",
    "Department",
    "Notes",
    "Reminder Dates",
    "Last PM Date",
    "Completion Date",
    "Status",
    "Contract Start Date",
    "Contract End Date",
    "Engineer Assigned",
    "Hospital Contact Email",
    "Reminder 1 Sent",
    "Reminder 2 Sent",
    "Engineer Alert Sent",
    "Created Date",
    "Updated Date",
    "Updated By",
    "Contract History",
    "PM History",
    "Comments",
    "Email History",
    "Id",
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
          getIntervalMonths(row.pmsPerYear),
          row.nextPmDate,
          row.department,
          row.notes,
          row.reminderDates,
          row.lastPmDate,
          row.completionDate,
          row.status,
          row.contractStartDate,
          row.contractEndDate,
          row.engineer,
          row.contactEmail,
          row.reminder1Sent ? "Yes" : "No",
          row.reminder2Sent ? "Yes" : "No",
          row.engineerAlertSent ? "Yes" : "No",
          row.createdDate,
          row.updatedDate,
          row.updatedBy,
          JSON.stringify(row.contractHistory || []),
          JSON.stringify(row.pmHistory || []),
          JSON.stringify(row.comments || []),
          JSON.stringify(row.emailHistory || []),
          row.id,
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
