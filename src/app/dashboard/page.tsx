"use client";

import DashboardStats from "@/components/DashboardStats";
import VisitorTable from "@/components/VisitorTable";
import { visitorData } from "@/data/visitorData";
import VisitorReminder from "@/components/VisitorReminder";
import { LanguageSwitcher, useLanguage } from "@/app/language-provider";

export default function DashboardPage() {
  const { translate } = useLanguage();
  return (
    <main className="bg-light min-vh-100">
      {/*Header*/}
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold mb-1">
              {translate("Dashboard Karyawan", "Employee Dashboard")}
            </h1>
            <p className="text-muted mb-0">
              {translate("Selamat datang! Berikut pengunjung hari ini.", "Welcome! Here are today's visitors.")}
            </p>
          </div>
          <div className="d-flex align-items-center gap-3">
            <LanguageSwitcher />
            <button className="btn btn-primary">
              + {translate("Daftarkan Pengunjung", "Register Visitor")}
            </button>
          </div>
        </div>
        {visitorData
          .filter((visitor) => visitor.status === "Waiting")
          .map((visitor) => (
            <VisitorReminder
              key={visitor.id}
              visitorName={visitor.name}
              checkIn={visitor.checkIn}
              //reminder alarm
              thresholdMinutes={10}
            />
          ))}
        {/*Statistics*/}
        <DashboardStats visitors={visitorData} />
        {/* Visitor Table */}
        <VisitorTable visitors={visitorData} />
      </div>
    </main>
  );
}
