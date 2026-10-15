'use client';

import { Visitor } from "@/types/visitor";
import { useLanguage } from "@/app/language-provider";

interface DashboardStatsProps {
  visitors: Visitor[];
}

export default function DashboardStats({ visitors }: DashboardStatsProps) {
  const { translate } = useLanguage();
  const totalVisitors = visitors.length;
  const waitingVisitors = visitors.filter((v) => v.status === "Waiting").length;
  const visitingVisitors = visitors.filter((v) => v.status === "Meeting").length;
  const completedVisitors = visitors.filter((v) => v.status === "Completed").length;

  const stats = [
    {
      label: translate("Total Pengunjung", "Total Visitors"),
      value: totalVisitors,
      icon: "👥",
      gradient: "stat-gradient-primary",
    },
    {
      label: translate("Menunggu", "Waiting"),
      value: waitingVisitors,
      icon: "⏳",
      gradient: "stat-gradient-warning",
    },
    {
      label: translate("Sedang Berkunjung", "Currently Visiting"),
      value: visitingVisitors,
      icon: "🏢",
      gradient: "stat-gradient-info",
    },
    {
      label: translate("Selesai", "Completed"),
      value: completedVisitors,
      icon: "✅",
      gradient: "stat-gradient-success",
    },
  ];

  return (
    <div className="row g-4">
      {stats.map((stat) => (
        <div key={stat.label} className="col-6 col-lg-3">
          <div className="card stat-card border-0 shadow-sm h-100 overflow-hidden">
            <div className={`stat-card-accent ${stat.gradient}`} />
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-uppercase text-muted small fw-semibold mb-2 stat-label">
                    {stat.label}
                  </p>
                  <h2 className="fw-bold mb-0 stat-value">{stat.value}</h2>
                </div>

                <div className={`stat-icon ${stat.gradient}`}>
                  <span className="fs-4">{stat.icon}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}