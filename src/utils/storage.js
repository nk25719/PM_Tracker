export const statuses = [
  "All",
  "Upcoming",
  "Hospital notified",
  "Confirmed",
  "In progress",
  "Completed",
  "Overdue",
  "Deferred",
];

export const editableStatuses = statuses.filter((status) => !["All", "Overdue"].includes(status));

export function normalizeStatus(status) {
  if (status === "Overdue") return "Upcoming";
  return editableStatuses.includes(status) ? status : "Upcoming";
}

export function normalizeRows(rows) {
  return rows.map((row) => ({
    ...row,
    department: row.department || "",
    notes: row.notes || "",
    reminderDates: row.reminderDates || "",
    lastPmDate: row.lastPmDate || "",
    completionDate: row.completionDate || "",
    reminder1Sent: Boolean(row.reminder1Sent),
    reminder2Sent: Boolean(row.reminder2Sent),
    engineerAlertSent: Boolean(row.engineerAlertSent),
    status: normalizeStatus(row.status || "Upcoming"),
  }));
}

export function createDefaultEquipmentForm() {
  return {
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
}

export function createEquipmentFormFromRow(row) {
  return {
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
  };
}
