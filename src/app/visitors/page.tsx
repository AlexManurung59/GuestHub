"use client";

import { useCallback, useEffect, useState } from "react";
import { VISITOR_REFRESH_INTERVAL_MS } from "@/components/VisitorReminder";
import { LanguageSwitcher, useLanguage } from "../language-provider";

interface Visitor {
  id: number;
  name: string;
  visitorType: string | null;
  rank: string | null;
  position: string | null;
  company: string | null;
  vessel: string | null;
  phone: string | null;
  division: string | null;
  purpose: string | null;
  pic: string | null;
  status: string;
}

function isVisitor(value: unknown): value is Visitor {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const visitor = value as Record<string, unknown>;
  return (
    typeof visitor.id === "number" &&
    typeof visitor.name === "string" &&
    (typeof visitor.visitorType === "string" || visitor.visitorType === null) &&
    (typeof visitor.rank === "string" || visitor.rank === null) &&
    (typeof visitor.position === "string" || visitor.position === null) &&
    (typeof visitor.company === "string" || visitor.company === null) &&
    (typeof visitor.vessel === "string" || visitor.vessel === null) &&
    (typeof visitor.phone === "string" || visitor.phone === null) &&
    (typeof visitor.division === "string" || visitor.division === null) &&
    (typeof visitor.purpose === "string" || visitor.purpose === null) &&
    (typeof visitor.pic === "string" || visitor.pic === null) &&
    typeof visitor.status === "string"
  );
}

export default function VisitorsPage() {
  const { translate } = useLanguage();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadVisitors = useCallback(async () => {
    try {
      const response = await fetch("/api/visitors?date=today", {
        cache: "no-store",
      });
      const data: unknown = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Failed to fetch visitors");
      }

      const visitorData = data.filter(isVisitor);
      if (visitorData.length !== data.length) {
        throw new Error("Visitors response contains invalid data");
      }

      setVisitors(visitorData);
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to fetch visitors",
      );
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      loadVisitors().catch((loadError: unknown) => {
        console.error("Failed to fetch visitors:", loadError);
      });
    };

    refresh();
    const interval = setInterval(refresh, VISITOR_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadVisitors();
    } catch (loadError) {
      console.error("Failed to refresh visitors:", loadError);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <p role="status">{translate("Memuat pengunjung...", "Loading visitors...")}</p>;
  }

  return (
    <main className="container py-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="mb-1">{translate("Pengunjung Hari Ini", "Today's Visitors")}</h1>
          <p className="text-secondary mb-0">
            {translate("Data pengunjung sebelumnya tetap tersimpan.", "Older visitor records remain saved.")}
          </p>
        </div>
        <LanguageSwitcher />
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
        >
          {refreshing
            ? translate("Memuat ulang...", "Refreshing...")
            : translate("Muat ulang daftar", "Refresh list")}
        </button>
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {!error && visitors.length === 0 && (
        <p className="text-secondary">
          {translate("Belum ada pengunjung terdaftar hari ini.", "No visitors registered today.")}
        </p>
      )}
      {visitors.map((visitor) => (
        <div key={visitor.id} className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">{visitor.name}</h5>
            <p className="card-text">
              {translate("Perusahaan", "Company")}: {visitor.company}
              <br />
              {translate("Kapal", "Vessel")}: {visitor.vessel}
              <br />
              {translate("Jenis pengunjung", "Visitor type")}: {visitor.visitorType}
              <br />
              {visitor.rank && (
                <>
                  {translate("Pangkat", "Rank")}: {visitor.rank}
                  <br />
                </>
              )}
              {translate("Jabatan", "Position")}: {visitor.position}
              <br />
              {translate("Divisi", "Division")}: {visitor.division}
              <br />
              {translate("Keperluan", "Purpose")}: {visitor.purpose}
              <br />
              PIC:{visitor.pic}
              <br />
              {translate("Status", "Status")}: {translate(
                visitor.status === "Waiting"
                  ? "Menunggu"
                  : visitor.status === "Meeting"
                    ? "Bertemu"
                    : visitor.status === "Completed"
                      ? "Selesai"
                      : visitor.status === "Cancelled"
                        ? "Dibatalkan"
                        : visitor.status,
                visitor.status,
              )}
            </p>
          </div>
        </div>
      ))}
    </main>
  );
}
