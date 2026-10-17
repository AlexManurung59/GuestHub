"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import DivisionPicFields from "@/components/DivisionPicFields";
import WaitingTimer from "@/components/WaitingTimer";
import { scrollRank } from "@/data/scroll";
import VisitorReminder, {
  WAITING_REMINDER_THRESHOLD_MINUTES,
  VISITOR_REFRESH_INTERVAL_MS,
} from "@/components/VisitorReminder";
import "./admin.css";
import { useRouter } from "next/navigation";
import { LanguageSwitcher, useLanguage } from "../language-provider";
import EndOfWorkReminder from "@/components/EndOfWorkReminder";

type VisitorStatus = "Waiting" | "Meeting" | "Completed" | "Cancelled";

interface Visitor {
  id: number;
  name: string;
  rank?: string | null;
  position?: string | null;
  company?: string | null;
  vessel?: string | null;
  phone?: string | null;
  division?: string | null;
  pic?: string | null;
  purpose?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status: VisitorStatus;
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
    isVisitorStatus(
      typeof visitor.status === "string" ? visitor.status : "",
    )
  );
}

function isVisitorStatus(value: string): value is VisitorStatus {
  return (
    value === "Waiting" ||
    value === "Meeting" ||
    value === "Completed" ||
    value === "Cancelled"
  );
}

/**
 * Admin component: this file defines the admin dashboard for managing visitor data.
 */
export default function AdminPage() {
  const router = useRouter();
  const { translate } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alarmMenuControlsTarget, setAlarmMenuControlsTarget] =
    useState<HTMLDivElement | null>(null);
  const [visitorPanelOpen, setVisitorPanelOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [visitorAction, setVisitorAction] = useState<
    "add" | "cancel" | "status" | null
  >(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [refreshingVisitors, setRefreshingVisitors] = useState(false);
  const [visitorLoadError, setVisitorLoadError] = useState("");
  const [alarmActive, setAlarmActive] = useState(false);
  const [alarmVisitorId, setAlarmVisitorId] = useState<number | null>(null);
  const [alarmActionLoading, setAlarmActionLoading] = useState(false);
  const [alarmControlError, setAlarmControlError] = useState("");
  const [loading, setLoading] = useState(true);
  const [visitorForm, setVisitorForm] = useState<VisitorForm>(emptyVisitorForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [adminVisitorType, setAdminVisitorType] = useState<
    "SEAFARER" | "GUEST" | ""
  >("");
  const handleExportVisitors = () => {
    const downloadLink = document.createElement("a");
    downloadLink.href = "/api/visitors/export";
    downloadLink.download = "visitors.xlsx";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  };
  
  /*
   * Close the floating menu when the user clicks
   * somewhere outside the menu.
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const loadVisitors = useCallback(async () => {
    try {
      const response = await fetch("/api/visitors?date=today", {
        cache: "no-store",
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data === "object" &&
          data !== null &&
          "details" in data &&
          typeof data.details === "string"
            ? data.details
            : typeof data === "object" &&
                data !== null &&
                "error" in data &&
                typeof data.error === "string"
              ? data.error
              : "Failed to fetch visitors";
        throw new Error(errorMessage);
      }

      let visitorData: unknown[];
      if (Array.isArray(data)) {
        visitorData = data;
      } else if (
        typeof data === "object" &&
        data !== null &&
        "visitors" in data &&
        Array.isArray(data.visitors)
      ) {
        visitorData = data.visitors;
      } else {
        throw new Error("Unexpected visitors response");
      }
      const parsedVisitors = visitorData.filter(isVisitor);
      if (parsedVisitors.length !== visitorData.length) {
        throw new Error("Visitors response contains invalid data");
      }
      setVisitors(parsedVisitors);
      setVisitorLoadError("");
    } catch (error) {
      setVisitorLoadError(
        error instanceof Error ? error.message : "Failed to fetch visitors",
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleRefreshVisitors() {
    setRefreshingVisitors(true);
    try {
      await loadVisitors();
    } catch (error) {
      console.error("Failed to refresh visitors:", error);
    } finally {
      setRefreshingVisitors(false);
    }
  }

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

    refreshAlarmState();
    const interval = setInterval(refreshAlarmState, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const setTvAlarm = async (active: boolean, visitorId: number) => {
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
  };

/*Cancel Visitor*/
async function handleCancelVisitor(visitorId: number) {
  const confirmed = window.confirm(
    `Are you sure you want to cancel visitor #${visitorId}?`
  );

  if (!confirmed) {
    return;
  }

  setActionLoading(true);
  setActionMessage("");
  setActionError("");

  try {
    const response = await fetch("/api/visitors", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: visitorId,
        status: "Cancelled",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Failed to cancel visitor"
      );
    }

    setActionMessage(
      `Visitor #${visitorId} has been cancelled.`
    );

    await loadVisitors();
  } catch (error) {
    console.error("Cancel visitor error:", error);

    setActionError(
      error instanceof Error
        ? error.message
        : "Failed to cancel visitor"
    );
  } finally {
    setActionLoading(false);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...visitorForm,
          name: visitorForm.name.toUpperCase(),
          company: adminVisitorType === "GUEST" ? visitorForm.company : null,
          vessel: null,
          visitorType: adminVisitorType,
          rank: adminVisitorType === "SEAFARER" ? visitorForm.rank : null,
          position:
            adminVisitorType === "GUEST" ||
            (adminVisitorType === "SEAFARER" &&
              visitorForm.rank === "OTHERS")
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
      setAdminVisitorType("");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: visitorId,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update visitor");
      }

      setActionMessage(`Visitor #${visitorId} is now ${status}.`);
      await loadVisitors();
    } catch (error) {
      console.error("Change visitor status error:", error);
      setActionMessage("");
      setActionError(
        error instanceof Error ? error.message : "Failed to update visitor",
      );
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    const refreshVisitors = () => {
      loadVisitors().catch((error: unknown) => {
        console.error("Failed to load visitors:", error);
      });
    };

    refreshVisitors();
    const interval = setInterval(refreshVisitors, VISITOR_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [loadVisitors]);

  /*
   * Dashboard statistics
   */
  const totalVisitors = visitors.length;

  const currentlyVisiting = visitors.filter(
    (visitor) => visitor.status === "Waiting" || visitor.status === "Meeting",
  ).length;

  const waitingVisitors = visitors.filter(
    (visitor) => visitor.status === "Waiting",
  ).length;

  const meetingVisitors = visitors.filter(
    (visitor) => visitor.status === "Meeting",
  ).length;

  const completedVisitors = visitors.filter(
    (visitor) => visitor.status === "Completed",
  ).length;

  function getStatusClass(status: VisitorStatus) {
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


  return (
    <>
      <EndOfWorkReminder
        canControl
        controlTarget={alarmMenuControlsTarget}
        showReminderCard={false}
        showSoundControl={false}
      />
      <main className="admin-page">
        {/* =========================
            HEADER
        ========================== */}

        <section className="container-fluid admin-container">
          <div className="dashboard-header d-flex flex-column flex-md-row align-items-md-center justify-content-between">
            <div>
              <p className="dashboard-label">
                {translate("DASHBOARD ADMIN", "ADMIN DASHBOARD")}
              </p>

              <h1>{translate("Manajemen Pengunjung", "Visitor Management")}</h1>

              <p className="dashboard-subtitle">
                {translate(
                  "Pantau dan kelola pengunjung hari ini.",
                  "Monitor and manage today's visitors.",
                )}
              </p>
            </div>

            <div className="d-flex align-items-center gap-3">
              <LanguageSwitcher />
              <div className="admin-badge">
                <span className="admin-badge-dot"></span>
                {translate("Administrator", "Administrator")}
              </div>
            </div>
          </div>

          {/* =========================
              WAITING VISITOR REMINDERS
          ========================== */}

          {visitors
            .filter(
              (visitor) =>
                visitor.status === "Waiting" && Boolean(visitor.check_in),
            )
            .map((visitor) => (
              <VisitorReminder
                key={visitor.id}
                visitorName={visitor.name}
                checkIn={visitor.check_in ?? ""}
                thresholdMinutes={WAITING_REMINDER_THRESHOLD_MINUTES}
              />
            ))}

          {/* =========================
              STATISTICS
          ========================== */}

          <section className="statistics-grid">
            <div className="stat-card stat-total card border-0 shadow-sm">
              <div className="stat-icon">👥</div>

              <div>
                <p>{translate("Total Pengunjung", "Total Visitors")}</p>
                <h2>{totalVisitors}</h2>
              </div>
            </div>

            <div className="stat-card stat-current card border-0 shadow-sm">
              <div className="stat-icon">🟢</div>

              <div>
                <p>{translate("Sedang Berkunjung", "Currently Visiting")}</p>
                <h2>{currentlyVisiting}</h2>
              </div>
            </div>

            <div className="stat-card stat-waiting card border-0 shadow-sm">
              <div className="stat-icon">⏳</div>

              <div>
                <p>{translate("Menunggu", "Waiting")}</p>
                <h2>{waitingVisitors}</h2>
              </div>
            </div>

            <div className="stat-card stat-meeting card border-0 shadow-sm">
              <div className="stat-icon">🤝</div>

              <div>
                <p>{translate("Bertemu", "Meeting")}</p>
                <h2>{meetingVisitors}</h2>
              </div>
            </div>

            <div className="stat-card stat-completed card border-0 shadow-sm">
              <div className="stat-icon">✓</div>

              <div>
                <p>{translate("Selesai", "Completed")}</p>
                <h2>{completedVisitors}</h2>
              </div>
            </div>
          </section>

          {/* =========================
              VISITOR LIST
          ========================== */}

          <section className="visitor-section card border-0 shadow-sm">
            <div className="section-header">
              <div>
                <h2>{translate("Daftar Pengunjung", "Visitor List")}</h2>

                <p>
                  {translate(
                    "Data pengunjung hari ini. Data sebelumnya tetap tersimpan.",
                    "Today's visitor records. Older records remain saved.",
                  )}
                </p>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => void handleRefreshVisitors()}
                  disabled={refreshingVisitors}
                >
                  {refreshingVisitors
                    ? translate("Memuat ulang...", "Refreshing...")
                    : translate("Muat ulang daftar", "Refresh list")}
                </button>
                <span className="visitor-count">
                  {visitors.length} {translate("pengunjung", "visitors")}
                </span>
              </div>
            </div>

            {actionMessage && (
              <div
                className="alert alert-success alert-dismissible d-flex align-items-center mx-3 mt-3 mb-0"
                role="status"
              >
                <span>{actionMessage}</span>
                <button
                  type="button"
                  className="btn-close ms-auto"
                  aria-label="Dismiss success message"
                  onClick={() => setActionMessage("")}
                />
              </div>
            )}
            {actionError && (
              <div className="alert alert-danger mx-3 mt-3 mb-0" role="alert">
                {actionError}
              </div>
            )}
            {visitorLoadError && (
              <div className="alert alert-danger mx-3 mt-3 mb-0" role="alert">
                {visitorLoadError}
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
                  <div className="spinner-border" role="status"></div>

                  <p>{translate("Memuat pengunjung...", "Loading visitors...")}</p>
                </div>
              ) : visitors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👤</div>

                  <h3>{translate("Belum ada pengunjung", "No visitors yet")}</h3>

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
                        <th>ID</th>
                        <th>{translate("Pengunjung", "Visitor")}</th>
                        <th>{translate("Pangkat", "Rank")}</th>
                        <th>{translate("Perusahaan", "Company")}</th>
                        <th>{translate("Divisi", "Division")}</th>
                        <th>PIC</th>
                        <th>{translate("Lama Menunggu", "Waiting Time")}</th>
                        <th>{translate("Status & Alarm TV", "Status & TV Alarm")}</th>
                      </tr>
                    </thead>

                    <tbody>
                      {visitors.map((visitor) => (
                        <tr key={visitor.id}>
                          <td>
                            <span className="visitor-id">#{visitor.id}</span>
                          </td>

                          <td>
                            <strong>{visitor.name}</strong>

                            {visitor.phone && (
                              <small className="visitor-secondary">
                                {visitor.phone}
                              </small>
                            )}
                          </td>

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
                                className={`form-select form-select-sm status-select ${getStatusClass(
                                  visitor.status,
                                )}`}
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
                                    onClick={() => void setTvAlarm(true, visitor.id)}
                                    disabled={
                                      alarmActionLoading ||
                                      (alarmActive && alarmVisitorId === visitor.id)
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
                                    onClick={() => void setTvAlarm(false, visitor.id)}
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

      {/* =========================
          FLOATING APP MENU
      ========================== */}

      <div
        ref={menuRef}
        className={`floating-menu-wrapper ${menuOpen ? "menu-is-open" : ""}`}
      >
        {menuOpen && (
          <div className="apple-menu-panel">
            <div className="apple-menu-header">
              <div>
                <span>{translate("Menu Admin", "Admin Menu")}</span>
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

            <div
              className="apple-menu-grid"
              ref={setAlarmMenuControlsTarget}
            >
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setVisitorPanelOpen(true);
                  setVisitorAction(null);
                  setMenuOpen(false);
                }}
              >
                <span className="menu-icon visitor-icon">👤</span>

                <span>{translate("Pengunjung", "Visitor")}</span>
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={() =>router.push("/admin/manage-users")}
              >
                <span className="menu-icon users-icon">👥</span>

                <span>{translate("Kelola Pengguna", "Manage Users")}</span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  window.open("/tv", "_blank", "noopener,noreferrer");
                }}
              >
                <span className="menu-icon tv-icon">📺</span>

                <span>TV</span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={handleExportVisitors}
              >
                <span className="menu-icon excel-icon">📊</span>

                <span>{translate("Ekspor Excel", "Export Excel")}</span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={handleExitAccount}
              >
                <span className="menu-icon exit-icon">🚪</span>

                <span>{translate("Keluar dari Akun", "Exit Account")}</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className={`floating-menu-button ${
            menuOpen ? "floating-menu-button-open" : ""
          }`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={translate("Buka menu admin", "Open admin menu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

{/* =========================
    VISITOR PANEL
========================== */}

{visitorPanelOpen && (
  <div
    className="visitor-panel-backdrop"
    onClick={() => setVisitorPanelOpen(false)}
  >
    <section
      className="visitor-panel"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="visitor-panel-header">
        <div>
          <p>{translate("MANAJEMEN PENGUNJUNG", "VISITOR MANAGEMENT")}</p>

          <h2>{translate("Pengunjung", "Visitor")}</h2>
        </div>

        {actionMessage && (
          <div className="alert alert-success mt-3 mb-0" role="status">
            {actionMessage}
          </div>
        )}

        <button
          type="button"
          className="visitor-panel-close"
          onClick={() => setVisitorPanelOpen(false)}
          aria-label={translate("Tutup panel pengunjung", "Close visitor panel")}
        >
          ×
        </button>
      </div>

      {/* =========================
          VISITOR ACTIONS
      ========================== */}

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
            <span className="visitor-action-icon">
              ＋
            </span>

            <span>
              <strong>{translate("Tambah Pengunjung", "Add Visitor")}</strong>
              <small>
                {translate("Daftarkan pengunjung baru", "Register a new visitor")}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="visitor-action-card"
            onClick={() => setVisitorAction("cancel")}
          >
            <span className="visitor-action-icon cancel">
              ×
            </span>

            <span>
              <strong>{translate("Batalkan Pengunjung", "Cancel Visitor")}</strong>
              <small>
                {translate("Batalkan pengunjung yang menunggu", "Cancel a waiting visitor")}
              </small>
            </span>
          </button>

          <button
            type="button"
            className="visitor-action-card"
            onClick={() => setVisitorAction("status")}
          >
            <span className="visitor-action-icon status">
              ↻
            </span>

            <span>
              <strong>{translate("Ubah Status", "Change Status")}</strong>
              <small>
                {translate("Perbarui status pengunjung", "Update visitor status")}
              </small>
            </span>
          </button>
        </div>
      )}

      {/* =========================
          ADD VISITOR
      ========================== */}

      {visitorAction === "add" && (
        <div className="visitor-form-area">
          <div className="visitor-form-title">
            <button
              type="button"
              onClick={() => setVisitorAction(null)}
              className="back-button"
            >
              ←
            </button>

            <div>
              <h3>{translate("Tambah Pengunjung", "Add Visitor")}</h3>

              <p>
                {translate("Daftarkan pengunjung baru.", "Register a new visitor.")}
              </p>
            </div>
          </div>

          <form onSubmit={handleAddVisitor}>
            {actionError && (
              <div className="alert alert-danger" role="alert">
                {actionError}
              </div>
            )}
            <div className="visitor-form-grid row g-3">
              <div className="form-field col-12 col-md-6">
                <label htmlFor="visitor-name" className="form-label">
                  {translate("Nama Pengunjung", "Visitor Name")}
                </label>

                <input
                  id="visitor-name"
                  className="form-control"
                  type="text"
                  name="name"
                  placeholder={translate("Masukkan nama pengunjung", "Enter visitor name")}
                  value={visitorForm.name}
                  onChange={(event) =>
    setVisitorForm({
      ...visitorForm,
      name: event.target.value.toUpperCase(),
                    })
                  }
                  required
                />
              </div>

              <div className="form-field col-12">
                <fieldset>
                  <legend className="form-label">
                    {translate("Jenis pengunjung", "Visitor type")}
                  </legend>
                  <div className="btn-group" role="group" aria-label={translate("Jenis pengunjung", "Visitor type")}>
                    <input
                      className="btn-check"
                      type="radio"
                      id="admin-visitor-seafarer"
                      name="adminVisitorType"
                      value="SEAFARER"
                      checked={adminVisitorType === "SEAFARER"}
                      required
                      onChange={() => {
                        setAdminVisitorType("SEAFARER");
                        setVisitorForm((current) => ({
                          ...current,
                          company: "",
                          rank: "",
                          position: "",
                        }));
                      }}
                    />
                    <label className="btn btn-outline-primary" htmlFor="admin-visitor-seafarer">
                      {translate("Pelaut", "Seafarer")}
                    </label>
                    <input
                      className="btn-check"
                      type="radio"
                      id="admin-visitor-guest"
                      name="adminVisitorType"
                      value="GUEST"
                      checked={adminVisitorType === "GUEST"}
                      onChange={() => {
                        setAdminVisitorType("GUEST");
                        setVisitorForm((current) => ({
                          ...current,
                          rank: "",
                          position: "",
                        }));
                      }}
                    />
                    <label className="btn btn-outline-primary" htmlFor="admin-visitor-guest">
                      {translate("Tamu", "Guest")}
                    </label>
                  </div>
                </fieldset>
              </div>

              {adminVisitorType === "GUEST" && (
                <div className="form-field col-12 col-md-6">
                  <label htmlFor="visitor-company" className="form-label">
                    {translate("Perusahaan", "Company")}
                  </label>
                  <input
                    id="visitor-company"
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

              {adminVisitorType === "SEAFARER" && (
                <div className="form-field col-12 col-md-6">
                  <label htmlFor="visitor-rank" className="form-label">
                    {translate("Pangkat", "Rank")}
                  </label>
                  <select
                    id="visitor-rank"
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

              {(adminVisitorType === "GUEST" ||
                (adminVisitorType === "SEAFARER" &&
                  visitorForm.rank === "OTHERS")) && (
                <div className="form-field col-12 col-md-6">
                  <label htmlFor="visitor-position" className="form-label">
                    {translate("Jabatan", "Position")}
                  </label>
                  <input
                    id="visitor-position"
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
                <label htmlFor="visitor-phone" className="form-label">
                  {translate("Nomor HP", "Phone")}
                </label>

                <input
                  id="visitor-phone"
                  className="form-control"
                  type="tel"
                  name="phone"
                  placeholder={translate("Nomor HP", "Phone number")}
                  value={visitorForm.phone}
                  onChange={(event) =>
                    setVisitorForm((current) => ({
                      ...current,
                      phone: event.target.value.toUpperCase(),
                    }))
                  }
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
                  divisionId="visitor-division"
                  picId="visitor-pic"
                />
              </div>

              <div className="form-field form-field-full col-12">
                <label htmlFor="visitor-purpose" className="form-label">
                  {translate("Keperluan", "Purpose")}
                </label>

                <textarea
                  id="visitor-purpose"
                  className="form-control"
                  name="purpose"
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
                Back
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

      {/* =========================
          CANCEL VISITOR
      ========================== */}

      {visitorAction === "cancel" && (
        <div className="visitor-form-area">
          <div className="visitor-form-title">
            <button
              type="button"
              onClick={() => setVisitorAction(null)}
              className="back-button"
            >
              ←
            </button>

            <div>
              <h3>{translate("Batalkan Pengunjung", "Cancel Visitor")}</h3>

              <p>
                {translate("Pilih pengunjung untuk dibatalkan.", "Select a visitor to cancel.")}
              </p>
            </div>
          </div>

          <div className="visitor-selection-list">
            {visitors.filter(
              (visitor) =>
                visitor.status === "Waiting" ||
                visitor.status === "Meeting"
            ).length === 0 ? (
              <div className="no-action-visitor">
                {translate("Tidak ada pengunjung aktif.", "No active visitors available.")}
              </div>
            ) : (
              visitors
                .filter(
                  (visitor) =>
                    visitor.status === "Waiting" ||
                    visitor.status === "Meeting"
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
                        handleCancelVisitor(visitor.id)
                      }
                    >
                      Cancel
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* =========================
          CHANGE STATUS
      ========================== */}

      {visitorAction === "status" && (
        <div className="visitor-form-area">
          <div className="visitor-form-title">
            <button
              type="button"
              onClick={() => setVisitorAction(null)}
              className="back-button"
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
              (visitor) => visitor.status !== "Completed"
            ).length === 0 ? (
              <div className="no-action-visitor">
                No visitors available.
              </div>
            ) : (
              visitors
                .filter(
                  (visitor) => visitor.status !== "Completed"
                )
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
                        className={`status-pill ${getStatusClass(
                          visitor.status
                        )}`}
                      >
                        {visitor.status}
                      </span>
                    </div>

                    <div className="status-buttons">
                      <button
                        type="button"
                        onClick={() =>
                          handleChangeStatus(visitor.id, "Waiting")
                        }
                      >
                        Waiting
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                           handleChangeStatus(visitor.id, "Meeting")
                        }
                      >
                        Meeting
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                           handleChangeStatus(visitor.id, "Completed")
                        }
                      >
                        Completed
                      </button>
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

      {/* =========================
          PAGE STYLES
      ========================== */}


    </>
  );
}
