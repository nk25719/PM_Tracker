import React from "react";
import { AlertTriangle, Bell, CheckCircle2, ClipboardList } from "lucide-react";

export default function DashboardCards({ metrics }) {
  return (
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
  );
}
