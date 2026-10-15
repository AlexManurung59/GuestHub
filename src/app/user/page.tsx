"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import DivisionPicFields from "@/components/DivisionPicFields";
import WaitingTimer from "@/components/WaitingTimer";
import { scrollRank } from "@/data/scroll";
import { VISITOR_REFRESH_INTERVAL_MS } from "@/components/VisitorReminder";
import "../admin/admin.css";
import { useRouter } from "next/navigation";
import "./user.css";
import { LanguageSwitcher, useLanguage } from "../language-provider";

type VisitorStatus = "Waiting" | "Meeting" | "Completed" | "Cancelled";
type VisitorAction = "add" | "cancel" | "status" | null;

interface Visitor {
  id: number;
  name: string;
  rank: string | null;
  position: string | null;
  company: string | null;
  vessel: string | null;
  division: string | null;
  purpose: string | null;
  pic: string | null;
  check_in: string | null;
  status: string;
}

interface VisitorForm {
  name: string;
  company: string;
  phone: string;
  division: string;
  pic: string;
  purpose: string;
  rank: string;
  position: string;
}

const emptyVisitorForm: VisitorForm = {
  name: "",
  company: "",
  phone: "",
  division: "",
  pic: "",
  purpose: "",
  rank: "",
  position: "",
};

function isVisitor(value: unknown): value is Visitor {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const visitor = value as Record<string, unknown>;
  return (
    typeof visitor.id === "number" &&
    typeof visitor.name === "string" &&
    (typeof visitor.rank === "string" || visitor.rank === null) &&
    (typeof visitor.position === "string" || visitor.position === null) &&
    (typeof visitor.company === "string" || visitor.company === null) &&
    (typeof visitor.vessel === "string" || visitor.vessel === null) &&
    (typeof visitor.division === "string" || visitor.division === null) &&
    (typeof visitor.purpose === "string" || visitor.purpose === null) &&
    (typeof visitor.pic === "string" || visitor.pic === null) &&
    (typeof visitor.check_in === "string" || visitor.check_in === null) &&
    typeof visitor.status === "string"
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case "Waiting":
      return "status-waiting";
    case "Meeting":
      return "status-meeting";
    case "Completed":
      return "status-completed";
    case "Cancelled":
      return "status-cancelled";
    default:
      return "";
  }
}

function isVisitorStatus(status: string): status is VisitorStatus {
  return (
    status === "Waiting" ||
    status === "Meeting" ||
    status === "Completed" ||
    status === "Cancelled"
  );
}

export default function UserPage() {
  const { translate } = useLanguage();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const router=useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [visitorPanelOpen, setVisitorPanelOpen] = useState(false);
  const [visitorAction, setVisitorAction] = useState<VisitorAction>(null);
  const [visitorForm, setVisitorForm] = useState<VisitorForm>(emptyVisitorForm);
  const [visitorType, setVisitorType] = useState<
    "SEAFARER" | "GUEST" | ""
  >("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmVisitorId, setAlarmVisitorId] = useState<number | null>(null);
  const [alarmActionLoading, setAlarmActionLoading] = useState(false);
  const [alarmControlError, setAlarmControlError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const loadVisitors = useCallback(async () => {
    try {
      const response = await fetch("/api/visitors?date=today", {
        cache: "no-store",
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to load visitors";
        throw new Error(message);
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected visitors response");
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
          : "Failed to load visitors",
      );
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      loadVisitors().catch((loadError: unknown) => {
        console.error("Failed to load visitors:", loadError);
      });
    };

    refresh();
    const interval = setInterval(refresh, VISITOR_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadVisitors]);

  useEffect(() => {
    let mounted = true;

    const refreshAlarmState = async () => {
      try {
        const response = await fetch("/api/alarm", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load TV alarm state");
        }

        const data: unknown = await response.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("active" in data) ||
          typeof data.active !== "boolean" ||
          !("visitorId" in data) ||
          (typeof data.visitorId !== "number" && data.visitorId !== null)
        ) {
          throw new Error("TV alarm returned an invalid state");
        }

        if (mounted) {
          setAlarmActive(data.active);
          setAlarmVisitorId(data.visitorId);
          setAlarmControlError("");
        }
      } catch (error) {
        console.error("Failed to load TV alarm state:", error);
        if (mounted) {
          setAlarmControlError(
            error instanceof Error
              ? error.message
              : "Unable to connect to the TV alarm",
          );
        }
      }
    };

    void refreshAlarmState();
    const interval = setInterval(() => void refreshAlarmState(), 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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

  async function handleAddVisitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading(true);
    setActionMessage("");
    setActionError("");

    try {
      const response = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...visitorForm,
          name: visitorForm.name.toUpperCase(),
          company: visitorType === "GUEST" ? visitorForm.company : null,
          vessel: null,
          visitorType,
          rank: visitorType === "SEAFARER" ? visitorForm.rank : null,
          position:
            visitorType === "GUEST" ||
            (visitorType === "SEAFARER" && visitorForm.rank === "OTHERS")
              ? visitorForm.position
              : null,
          purpose: visitorForm.purpose.toUpperCase(),
        }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to add visitor";
        throw new Error(message);
      }

      const visitorName =
        typeof data === "object" &&
        data !== null &&
        "name" in data &&
        typeof data.name === "string"
          ? data.name
          : visitorForm.name;
      setActionMessage(`Visitor "${visitorName}" was added successfully.`);
      setVisitorForm(emptyVisitorForm);
      setVisitorType("");
      await loadVisitors();
      setVisitorAction(null);
    } catch (error) {
      console.error("Add visitor error:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to add visitor",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelVisitor(visitorId: number) {
    if (!window.confirm(`Are you sure you want to cancel visitor #${visitorId}?`)) {
      return;
    }

    setActionLoading(true);
    setActionMessage("");
    setActionError("");

    try {
      const response = await fetch("/api/visitors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitorId, status: "Cancelled" }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to cancel visitor";
        throw new Error(message);
      }

      setActionMessage(`Visitor #${visitorId} has been cancelled.`);
      await loadVisitors();
    } catch (error) {
      console.error("Cancel visitor error:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to cancel visitor",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeStatus(
    visitorId: number,
    status: VisitorStatus,
  ) {
    setActionLoading(true);
    setActionMessage("");
    setActionError("");

    try {
      const response = await fetch("/api/visitors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: visitorId, status }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to update visitor";
        throw new Error(message);
      }

      setActionMessage(`Visitor #${visitorId} is now ${status}.`);
      await loadVisitors();
    } catch (error) {
      console.error("Change visitor status error:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to update visitor",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function setTvAlarm(active: boolean, visitorId: number) {
    setAlarmActionLoading(true);
    setAlarmControlError("");

    try {
      const response = await fetch("/api/alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, visitorId }),
      });
      const data: unknown = await response.json();
      if (
        !response.ok ||
        typeof data !== "object" ||
        data === null ||
        !("active" in data) ||
        typeof data.active !== "boolean" ||
        !("visitorId" in data) ||
        (typeof data.visitorId !== "number" && data.visitorId !== null)
      ) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to update TV alarm";
        throw new Error(message);
      }

      setAlarmActive(data.active);
      setAlarmVisitorId(data.visitorId);
    } catch (error) {
      console.error("Failed to update TV alarm:", error);
      setAlarmControlError(
        error instanceof Error ? error.message : "Unable to update TV alarm",
      );
    } finally {
      setAlarmActionLoading(false);
    }
  }

async function handleExitAccount() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to log out.");
    }

    router.replace("/login");
    router.refresh();
  } catch (error) {
    console.error("Logout error:", error);
    alert("Unable to log out. Please try again.");
  }
}

  const visitorCounts = {
    total: visitors.length,
    waiting: visitors.filter((visitor) => visitor.status === "Waiting").length,
    meeting: visitors.filter((visitor) => visitor.status === "Meeting").length,
    completed: visitors.filter((visitor) => visitor.status === "Completed")
      .length,
    cancelled: visitors.filter((visitor) => visitor.status === "Cancelled")
      .length,
  };

  return (
    <>
      <main className="admin-page">
        <section className="container-fluid admin-container">
          <header className="dashboard-header">
            <div>
              <p className="dashboard-label">
                {translate("DASHBOARD PENGGUNA", "USER DASHBOARD")}
              </p>
              <h1>{translate("Manajemen Pengunjung", "Visitor Management")}</h1>
              <p className="dashboard-subtitle">
                {translate(
                  "Lihat aktivitas pengunjung hari ini.",
                  "View today's visitor activity.",
                )}
              </p>
            </div>

            <div className="d-flex align-items-center gap-3">
              <LanguageSwitcher />
              <div className="user-badge">{translate("Pengguna", "User")}</div>
            </div>
          </header>

          <section
            className="statistics-grid"
            aria-label={translate("Statistik pengunjung", "Visitor statistics")}
          >
            <article className="stat-card">
              <span className="stat-icon" aria-hidden="true">👥</span>
              <div>
                <p>{translate("Total Pengunjung", "Total Visitors")}</p>
                <h2>{visitorCounts.total}</h2>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon" aria-hidden="true">⏳</span>
              <div>
                <p>{translate("Menunggu", "Waiting")}</p>
                <h2>{visitorCounts.waiting}</h2>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon" aria-hidden="true">🤝</span>
              <div>
                <p>{translate("Bertemu", "In Meeting")}</p>
                <h2>{visitorCounts.meeting}</h2>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon" aria-hidden="true">✅</span>
              <div>
                <p>{translate("Selesai", "Completed")}</p>
                <h2>{visitorCounts.completed}</h2>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-icon" aria-hidden="true">✖️</span>
              <div>
                <p>{translate("Dibatalkan", "Cancelled")}</p>
                <h2>{visitorCounts.cancelled}</h2>
              </div>
            </article>
          </section>

          <section
            className="visitor-section card border-0 shadow-sm"
            id="visitor-list"
          >
            <div className="section-header">
              <div>
                <h2>{translate("Pengunjung Hari Ini", "Today's Visitors")}</h2>
                <p>
                  {translate(
                    "Daftar dan status alarm TV diperbarui otomatis. Data pengunjung sebelumnya tetap tersimpan di basis data.",
                    "The list and TV alarm state update automatically. Previous visitor records are kept in the database.",
                  )}
                </p>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                >
                  {refreshing
                    ? translate("Memuat ulang...", "Refreshing...")
                    : translate("Muat ulang daftar", "Refresh list")}
                </button>
                <span className="visitor-count">
                  {visitors.length} {translate("pengunjung", "visitors")}
                </span>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger mx-3 mt-3 mb-0" role="alert">
                {error}
              </div>
            )}
            {alarmControlError && (
              <div className="alert alert-danger mx-3 mt-3 mb-0" role="alert">
                {alarmControlError}
              </div>
            )}

            <div className="visitor-table-wrapper">
              {loading ? (
                <div className="empty-state">
                  <div className="spinner-border" role="status" />
                  <p>{translate("Memuat pengunjung...", "Loading visitors...")}</p>
                </div>
              ) : visitors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon" aria-hidden="true">👤</div>
                  <h3>{translate("Belum ada pengunjung hari ini", "No visitors today")}</h3>
                  <p>
                    {translate(
                      "Data pengunjung akan muncul di sini.",
                      "Visitor records will appear here.",
                    )}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table visitor-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th scope="col">ID</th>
                        <th scope="col">{translate("Nama", "Name")}</th>
                        <th scope="col">{translate("Pangkat", "Rank")}</th>
                        <th scope="col">{translate("Perusahaan", "Company")}</th>
                        <th scope="col">{translate("Divisi", "Division")}</th>
                        <th scope="col">PIC</th>
                        <th scope="col">{translate("Lama Menunggu", "Waiting Time")}</th>
                        <th scope="col">{translate("Status & Alarm TV", "Status & TV Alarm")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitors.map((visitor) => (
                        <tr key={visitor.id}>
                          <td>
                            <span className="visitor-id">#{visitor.id}</span>
                          </td>
                          <td>{visitor.name}</td>
                          <td>{visitor.rank || "-"}</td>
                          <td>{visitor.company || "-"}</td>
                          <td>{visitor.division || "-"}</td>
                          <td>{visitor.pic || "-"}</td>
                          <td>
                            {visitor.status === "Waiting" && visitor.check_in ? (
                              <WaitingTimer checkIn={visitor.check_in} />
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <div className="visitor-status-controls">
                              <select
                                className={`form-select form-select-sm status-select ${getStatusClass(visitor.status)}`}
                                value={visitor.status}
                                onChange={(event) => {
                                  const status = event.target.value;
                                  if (isVisitorStatus(status)) {
                                    void handleChangeStatus(visitor.id, status);
                                  }
                                }}
                                disabled={actionLoading}
                                aria-label={translate(
                                  `Ubah status ${visitor.name}`,
                                  `Change status for ${visitor.name}`,
                                )}
                                title={translate(
                                  "Pilih untuk mengubah status pengunjung",
                                  "Select to change visitor status",
                                )}
                              >
                                <option value="Waiting">{translate("Menunggu", "Waiting")}</option>
                                <option value="Meeting">{translate("Bertemu", "Meeting")}</option>
                                <option value="Completed">{translate("Selesai", "Completed")}</option>
                                <option value="Cancelled">{translate("Dibatalkan", "Cancelled")}</option>
                              </select>
                              {visitor.status === "Waiting" && (
                                <div className="visitor-alarm-actions">
                                  <button
                                    type="button"
                                    className="visitor-alarm-trigger"
                                    onClick={() =>
                                      void setTvAlarm(true, visitor.id)
                                    }
                                    disabled={
                                      alarmActionLoading ||
                                      (alarmActive &&
                                        alarmVisitorId === visitor.id)
                                    }
                                    aria-label={translate(
                                      `Aktifkan alarm TV untuk ${visitor.name}`,
                                      `Trigger TV alarm for ${visitor.name}`,
                                    )}
                                  >
                                    {translate("Aktifkan", "Trigger")}
                                  </button>
                                  <button
                                    type="button"
                                    className="visitor-alarm-stop"
                                    onClick={() =>
                                      void setTvAlarm(false, visitor.id)
                                    }
                                    disabled={
                                      alarmActionLoading ||
                                      !alarmActive ||
                                      alarmVisitorId !== visitor.id
                                    }
                                    aria-label={translate(
                                      `Hentikan alarm TV untuk ${visitor.name}`,
                                      `Stop TV alarm for ${visitor.name}`,
                                    )}
                                  >
                                    {translate("Hentikan", "Stop")}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </section>
      </main>

      <div
        ref={menuRef}
        className={`floating-menu-wrapper ${menuOpen ? "menu-is-open" : ""}`}
      >
        {menuOpen && (
          <nav className="apple-menu-panel" aria-label="User menu">
            <div className="apple-menu-header">
              <div>
                <span>{translate("Menu Pengguna", "User Menu")}</span>
                <small>{translate("Manajemen Pengunjung", "Visitor Management")}</small>
              </div>
              <button
                type="button"
                className="menu-close-button"
                onClick={() => setMenuOpen(false)}
                aria-label={translate("Tutup menu", "Close menu")}
              >
                ×
              </button>
            </div>

            <div className="apple-menu-grid user-menu-grid">
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setVisitorAction(null);
                  setActionError("");
                  setVisitorPanelOpen(true);
                }}
              >
                <span className="menu-icon visitor-icon" aria-hidden="true">
                  👤
                </span>
                <span>{translate("Pengunjung", "Visitor")}</span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  window.open("/tv", "_blank", "noopener,noreferrer");
                }}
              >
                <span className="menu-icon tv-icon" aria-hidden="true">
                  📺
                </span>
                <span>TV</span>
              </button>
              <a
                href="/api/visitors/export"
                className="menu-item"
              >
                <span className="menu-icon excel-icon" aria-hidden="true">
                  📊
                </span>
                <span>{translate("Ekspor Excel", "Export Excel")}</span>
              </a>
              <button
                type="button"
                className="menu-item"
                onClick={handleExitAccount}
              >
                <span className="menu-icon exit-icon" aria-hidden="true">
                  🚪
                </span>
                <span>{translate("Keluar dari Akun", "Exit Account")}</span>
              </button>
            </div>
          </nav>
        )}

        <button
          type="button"
          className={`floating-menu-button ${
            menuOpen ? "floating-menu-button-open" : ""
          }`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={translate("Buka menu pengguna", "Open user menu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {visitorPanelOpen && (
        <div
          className="visitor-panel-backdrop"
          onClick={() => {
            if (!actionLoading) {
              setVisitorPanelOpen(false);
              setVisitorAction(null);
            }
          }}
        >
          <section
            className="visitor-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-visitor-panel-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="visitor-panel-header">
              <div>
                <p>{translate("MANAJEMEN PENGUNJUNG", "VISITOR MANAGEMENT")}</p>
                <h2 id="user-visitor-panel-title">{translate("Pengunjung", "Visitor")}</h2>
              </div>
              {actionMessage && (
                <div className="alert alert-success mt-3 mb-0" role="status">
                  {actionMessage}
                </div>
              )}
              <button
                type="button"
                className="visitor-panel-close"
                onClick={() => {
                  setVisitorPanelOpen(false);
                  setVisitorAction(null);
                }}
                disabled={actionLoading}
                aria-label={translate("Tutup panel pengunjung", "Close visitor panel")}
              >
                ×
              </button>
            </div>

            {actionError && (
              <div className="alert alert-danger" role="alert">
                {actionError}
              </div>
            )}

            {!visitorAction && (
              <div className="visitor-action-grid">
                <button
                  type="button"
                  className="visitor-action-card"
                  onClick={() => {
                    setActionMessage("");
                    setActionError("");
                    setVisitorAction("add");
                  }}
                >
                  <span className="visitor-action-icon" aria-hidden="true">
                    ＋
                  </span>
                  <span>
                    <strong>{translate("Tambah Pengunjung", "Add Visitor")}</strong>
                    <small>{translate("Daftarkan pengunjung baru", "Register a new visitor")}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="visitor-action-card"
                  onClick={() => {
                    setActionMessage("");
                    setActionError("");
                    setVisitorAction("cancel");
                  }}
                >
                  <span
                    className="visitor-action-icon cancel"
                    aria-hidden="true"
                  >
                    ×
                  </span>
                  <span>
                    <strong>{translate("Batalkan Pengunjung", "Cancel Visitor")}</strong>
                    <small>{translate("Batalkan pengunjung yang menunggu", "Cancel a waiting visitor")}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="visitor-action-card"
                  onClick={() => {
                    setActionMessage("");
                    setActionError("");
                    setVisitorAction("status");
                  }}
                >
                  <span
                    className="visitor-action-icon status"
                    aria-hidden="true"
                  >
                    ↻
                  </span>
                  <span>
                    <strong>{translate("Ubah Status", "Change Status")}</strong>
                    <small>{translate("Perbarui status pengunjung", "Update visitor status")}</small>
                  </span>
                </button>
              </div>
            )}

            {visitorAction === "add" && (
              <div className="visitor-form-area">
                <div className="visitor-form-title">
                  <button
                    type="button"
                    onClick={() => setVisitorAction(null)}
                    className="back-button"
                    disabled={actionLoading}
                  >
                    ←
                  </button>
                  <div>
                    <h3>{translate("Tambah Pengunjung", "Add Visitor")}</h3>
                    <p>{translate("Daftarkan pengunjung baru.", "Register a new visitor.")}</p>
                  </div>
                </div>

                <form onSubmit={handleAddVisitor}>
                  <div className="visitor-form-grid row g-3">
                    <div className="form-field col-12 col-md-6">
                      <label htmlFor="user-visitor-name" className="form-label">
                        {translate("Nama Pengunjung", "Visitor Name")}
                      </label>
                      <input
                        id="user-visitor-name"
                        className="form-control"
                        type="text"
                        value={visitorForm.name}
                        onChange={(event) =>
                          setVisitorForm((current) => ({
                            ...current,
                            name: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder={translate("Masukkan nama pengunjung", "Enter visitor name")}
                        required
                      />
                    </div>

                    <div className="form-field col-12">
                      <fieldset>
                        <legend className="form-label">
                          {translate("Jenis pengunjung", "Visitor type")}
                        </legend>
                        <div
                          className="btn-group"
                          role="group"
                          aria-label={translate("Jenis pengunjung", "Visitor type")}
                        >
                          <input
                            className="btn-check"
                            type="radio"
                            id="user-visitor-seafarer"
                            name="userVisitorType"
                            value="SEAFARER"
                            checked={visitorType === "SEAFARER"}
                            required
                            onChange={() => {
                              setVisitorType("SEAFARER");
                              setVisitorForm((current) => ({
                                ...current,
                                company: "",
                                rank: "",
                                position: "",
                              }));
                            }}
                          />
                          <label
                            className="btn btn-outline-primary"
                            htmlFor="user-visitor-seafarer"
                          >
                            {translate("Pelaut", "Seafarer")}
                          </label>
                          <input
                            className="btn-check"
                            type="radio"
                            id="user-visitor-guest"
                            name="userVisitorType"
                            value="GUEST"
                            checked={visitorType === "GUEST"}
                            onChange={() => {
                              setVisitorType("GUEST");
                              setVisitorForm((current) => ({
                                ...current,
                                rank: "",
                                position: "",
                              }));
                            }}
                          />
                          <label
                            className="btn btn-outline-primary"
                            htmlFor="user-visitor-guest"
                          >
                            {translate("Tamu", "Guest")}
                          </label>
                        </div>
                      </fieldset>
                    </div>

                    {visitorType === "GUEST" && (
                      <div className="form-field col-12 col-md-6">
                        <label
                          htmlFor="user-visitor-company-name"
                          className="form-label"
                        >
                          {translate("Perusahaan", "Company")}
                        </label>
                        <input
                          id="user-visitor-company-name"
                          className="form-control"
                          type="text"
                          value={visitorForm.company}
                          onChange={(event) =>
                            setVisitorForm((current) => ({
                              ...current,
                              company: event.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={translate("Nama perusahaan", "Company name")}
                          required
                        />
                      </div>
                    )}

                    {visitorType === "SEAFARER" && (
                      <div className="form-field col-12 col-md-6">
                        <label
                          htmlFor="user-visitor-rank"
                          className="form-label"
                        >
                          {translate("Pangkat", "Rank")}
                        </label>
                        <select
                          id="user-visitor-rank"
                          className="form-select"
                          value={visitorForm.rank}
                          onChange={(event) =>
                            setVisitorForm((current) => ({
                              ...current,
                              rank: event.target.value,
                              position:
                                event.target.value === "OTHERS"
                                  ? current.position
                                  : "",
                            }))
                          }
                          required
                        >
                          <option value="">{translate("Pilih pangkat", "Select rank")}</option>
                          {scrollRank.map((rank) => (
                            <option key={rank} value={rank}>
                              {rank}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(visitorType === "GUEST" ||
                      (visitorType === "SEAFARER" &&
                        visitorForm.rank === "OTHERS")) && (
                      <div className="form-field col-12 col-md-6">
                        <label
                          htmlFor="user-visitor-position"
                          className="form-label"
                        >
                          {translate("Jabatan", "Position")}
                        </label>
                        <input
                          id="user-visitor-position"
                          className="form-control"
                          type="text"
                          value={visitorForm.position}
                          onChange={(event) =>
                            setVisitorForm((current) => ({
                              ...current,
                              position: event.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={translate("Masukkan jabatan", "Enter position")}
                          required
                        />
                      </div>
                    )}

                    <div className="form-field col-12 col-md-6">
                      <label htmlFor="user-visitor-phone" className="form-label">
                        {translate("Nomor HP", "Phone")}
                      </label>
                      <input
                        id="user-visitor-phone"
                        className="form-control"
                        type="tel"
                        value={visitorForm.phone}
                        onChange={(event) =>
                          setVisitorForm((current) => ({
                            ...current,
                            phone: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder={translate("Nomor HP", "Phone number")}
                        required
                      />
                    </div>

                    <div className="form-field col-12">
                      <DivisionPicFields
                        division={visitorForm.division}
                        pic={visitorForm.pic}
                        onDivisionChange={(division) =>
                          setVisitorForm((current) => ({ ...current, division }))
                        }
                        onPicChange={(pic) =>
                          setVisitorForm((current) => ({ ...current, pic }))
                        }
                        divisionLabel={translate("Divisi", "Division")}
                        selectDivisionLabel={translate("Pilih divisi", "Select a division")}
                        picLabel="PIC"
                        selectPICLabel={translate("Pilih PIC", "Select a PIC")}
                        divisionId="user-visitor-division"
                        picId="user-visitor-pic"
                      />
                    </div>

                    <div className="form-field form-field-full col-12">
                      <label
                        htmlFor="user-visitor-purpose"
                        className="form-label"
                      >
                        {translate("Keperluan", "Purpose")}
                      </label>
                      <textarea
                        id="user-visitor-purpose"
                        className="form-control"
                        rows={3}
                        placeholder={translate("Keperluan kunjungan", "Reason for visiting")}
                        value={visitorForm.purpose}
                        onChange={(event) =>
                          setVisitorForm((current) => ({
                            ...current,
                            purpose: event.target.value,
                          }))
                        }
                        style={{ textTransform: "uppercase" }}
                        required
                      />
                    </div>
                  </div>

                  <div className="visitor-form-buttons">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setVisitorAction(null)}
                      disabled={actionLoading}
                    >
                      {translate("Kembali", "Back")}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? translate("Menambahkan...", "Adding...")
                        : translate("Tambah Pengunjung", "Add Visitor")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {visitorAction === "cancel" && (
              <div className="visitor-form-area">
                <div className="visitor-form-title">
                  <button
                    type="button"
                    onClick={() => setVisitorAction(null)}
                    className="back-button"
                    disabled={actionLoading}
                  >
                    ←
                  </button>
                  <div>
                    <h3>{translate("Batalkan Pengunjung", "Cancel Visitor")}</h3>
                    <p>{translate("Pilih pengunjung untuk dibatalkan.", "Select a visitor to cancel.")}</p>
                  </div>
                </div>
                <div className="visitor-selection-list">
                  {visitors.filter(
                    (visitor) =>
                      visitor.status === "Waiting" ||
                      visitor.status === "Meeting",
                  ).length === 0 ? (
                    <div className="no-action-visitor">
                      {translate("Tidak ada pengunjung aktif.", "No active visitors available.")}
                    </div>
                  ) : (
                    visitors
                      .filter(
                        (visitor) =>
                          visitor.status === "Waiting" ||
                          visitor.status === "Meeting",
                      )
                      .map((visitor) => (
                        <div
                          key={visitor.id}
                          className="visitor-selection-item"
                        >
                          <div>
                            <strong>{visitor.name}</strong>
                            <small>
                              #{visitor.id}
                              {visitor.rank ? ` • ${visitor.rank}` : ""}
                              {visitor.company
                                ? ` • ${visitor.company}`
                                  : ""}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="cancel-visitor-button"
                            onClick={() =>
                              void handleCancelVisitor(visitor.id)
                            }
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {visitorAction === "status" && (
              <div className="visitor-form-area">
                <div className="visitor-form-title">
                  <button
                    type="button"
                    onClick={() => setVisitorAction(null)}
                    className="back-button"
                    disabled={actionLoading}
                  >
                    ←
                  </button>
                  <div>
                    <h3>Change Visitor Status</h3>
                    <p>
                      {translate(
                        "Pilih pengunjung dan perbarui statusnya.",
                        "Select a visitor and update their status.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="visitor-selection-list">
                  {visitors.filter(
                    (visitor) => visitor.status !== "Completed",
                  ).length === 0 ? (
                    <div className="no-action-visitor">
                      No visitors available.
                    </div>
                  ) : (
                    visitors
                      .filter((visitor) => visitor.status !== "Completed")
                      .map((visitor) => (
                        <div
                          key={visitor.id}
                          className="visitor-status-item"
                        >
                          <div className="visitor-status-info">
                            <strong>{visitor.name}</strong>
                            <small>
                              #{visitor.id}
                              {visitor.rank ? ` • ${visitor.rank}` : ""}
                              {visitor.company
                                ? ` • ${visitor.company}`
                                  : ""}
                            </small>
                            <span
                              className={`status-pill ${getStatusClass(visitor.status)}`}
                            >
                              {visitor.status}
                            </span>
                          </div>
                          <div className="status-buttons">
                            {(["Waiting", "Meeting", "Completed"] as const).map(
                              (status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() =>
                                    void handleChangeStatus(visitor.id, status)
                                  }
                                  disabled={actionLoading}
                                >
                                  {status}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeMenu && (
        <div className="action-toast" role="status">
          <strong>{activeMenu}</strong>
          <span>This feature will be connected in the next step.</span>
          <button
            type="button"
            onClick={() => setActiveMenu(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
