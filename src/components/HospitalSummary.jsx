import React from "react";
import { Building2 } from "lucide-react";

export default function HospitalSummary({ byHospital, selectedHospital, onSelectHospital }) {
  return (
    <div className="card">
      <h2 className="section-title">Hospital Summary</h2>
      <div className="hospital-list">
        {byHospital.map((item) => (
          <button
            key={item.hospital}
            className={`hospital-item hospital-button ${selectedHospital === item.hospital ? "hospital-item-active" : ""}`}
            onClick={() => onSelectHospital(item.hospital)}
          >
            <div className="hospital-head">
              <div>
                <div className="hospital-title">{item.hospital}</div>
                <div className="hospital-subtitle">{item.total} equipment items</div>
              </div>
              <Building2 size={18} />
            </div>

            <div className="hospital-stats">
              <div className="stat-box">
                <div className="stat-label">Upcoming</div>
                <div className="stat-value">{item.upcoming}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Due in 7d</div>
                <div className="stat-value">{item.dueSoon}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Overdue</div>
                <div className="stat-value">{item.overdue}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
