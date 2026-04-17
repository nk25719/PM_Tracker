import React from "react";
import { ArrowLeft, FileText } from "lucide-react";

function getContractTimingLabel(daysLeft) {
  if (daysLeft < 0) return { label: `Expired ${Math.abs(daysLeft)} day(s) ago`, className: "badge badge-overdue" };
  if (daysLeft <= 30) return { label: `Renew within ${daysLeft} day(s)`, className: "badge badge-due-soon" };
  return { label: `${daysLeft} day(s) remaining`, className: "badge badge-confirmed" };
}

export default function ContractTrackerView({
  contracts,
  onBack,
  contractFileInputRef,
  onImportContracts,
  onExportContractsCsv,
}) {
  return (
    <div className="card contracts-view-card">
      <div className="detail-head">
        <div>
          <h2 className="section-title">Hospital Contracts</h2>
          <div className="hospital-headline">
            <FileText size={16} className="inline-icon" />
            Independent contract tracker with renewal reminders
          </div>
        </div>
        <button className="button" onClick={onBack}>
          <ArrowLeft size={15} className="inline-icon" />
          Back to dashboard
        </button>
      </div>

      <div className="actions contracts-actions-row">
        <input ref={contractFileInputRef} type="file" accept=".csv" className="hidden-input" onChange={onImportContracts} />
        <button className="button" onClick={() => contractFileInputRef.current?.click()}>
          Import Contracts CSV
        </button>
        <button className="button" onClick={onExportContractsCsv}>
          Export Contracts CSV
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Hospital</th>
              <th>Contract #</th>
              <th>Start date</th>
              <th>End date</th>
              <th>Equipment in contract</th>
              <th>PMs required/year</th>
              <th>PM dates</th>
              <th>Expiration</th>
              <th>Renewal reminder</th>
              <th>Contract history</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length ? (
              contracts.map((contract) => {
                const timing = getContractTimingLabel(contract.daysLeft);
                return (
                  <tr key={contract.id}>
                    <td className="strong">{contract.hospital || "—"}</td>
                    <td>{contract.contractNo || "—"}</td>
                    <td>{contract.contractStartDate || "—"}</td>
                    <td>{contract.contractEndDate || "—"}</td>
                    <td className="muted">
                      {contract.equipment?.length ? `${contract.equipment.length} item(s): ${contract.equipment.join(", ")}` : "—"}
                    </td>
                    <td>{contract.pmRequiredTotal || "—"}</td>
                    <td className="muted">
                      {contract.pmDates?.length ? contract.pmDates.join(", ") : "—"}
                    </td>
                    <td>
                      <span className={timing.className}>{timing.label}</span>
                    </td>
                    <td className="muted">
                      {contract.daysLeft <= 30
                        ? "Send renewal follow-up now."
                        : "No immediate action needed."}
                    </td>
                    <td className="muted">
                      {contract.contractHistory?.length
                        ? contract.contractHistory
                            .slice(0, 3)
                            .map((entry) => `${entry.at ? entry.at.slice(0, 10) : "Unknown"} - ${entry.note || "Updated"}`)
                            .join(" | ")
                        : "No contract history yet"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="muted">
                  No contracts found yet. Add contract start/end dates in equipment records to populate this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
