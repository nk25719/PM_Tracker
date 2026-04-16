function csvBoolean(value, fallback = "") {
  const normalized = String(value || fallback).toLowerCase();
  return normalized === "true" || normalized === "yes";
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

export function normalizeImportedRows(rawRows, normalizeStatus, getTodayIsoDate) {
  return rawRows
    .map((row, index) => {
      const hospital = row.Hospital || row.hospital || row["Parent System"] || row["parent system"] || "";
      const contractNo = row["Contract No."] || row.contractNo || row["Contract Number"] || "";
      const equipment =
        row.Equipment || row.equipment || row.Subsystem || row.subsystem || row["Source Description"] || "";
      const model = row.Model || row.model || "";
      const serial = row["Serial Number"] || row.serial || row.Serial || "";
      const intervalMonths = Number(row["Interval Months"] || row.intervalMonths || 0) || 0;
      const pmsPerYear =
        Number(row["PMs per Year"] || row.pmsPerYear || 0) ||
        (intervalMonths > 0 ? Math.max(1, Math.round(12 / intervalMonths)) : 1);
      const nextPmDate = row["Next PM Date"] || row.nextPmDate || getTodayIsoDate();
      const status = normalizeStatus(row.Status || row.status || "Upcoming");
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
        reminder1Sent: csvBoolean(row["Reminder 1 Sent"] || row.reminder1Sent, row["Reminder 1 Sent"]),
        reminder2Sent: csvBoolean(row["Reminder 2 Sent"] || row.reminder2Sent, row["Reminder 2 Sent"]),
        engineerAlertSent: csvBoolean(
          row["Engineer Alert Sent"] || row.engineerAlertSent,
          row["Engineer Alert Sent"]
        ),
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
          getIntervalMonths(row.pmsPerYear),
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

export function exportRowsToJson(rows) {
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
