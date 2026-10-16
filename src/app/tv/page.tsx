"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  VISITOR_REFRESH_INTERVAL_MS,
  WAITING_REMINDER_THRESHOLD_MINUTES,
} from "@/components/VisitorReminder";
import { LanguageSwitcher, useLanguage } from "../language-provider";
import "../admin/admin.css";


// =========================================================
// VISITOR TYPE
// =========================================================

interface Visitor {
  id: number;
  name: string;
  company: string | null;
  vessel: string | null;
  rank: string | null;
  position: string | null;
  phone: string | null;
  division: string | null;
  purpose: string | null;
  pic: string | null;
  check_in: string;
  check_out: string | null;
  status: "Waiting" | "Meeting" | "Completed" | "Cancelled";
  createdAt: string;
}

// =========================================================
// TV PAGE
// =========================================================

export default function TvPage() {
  const router = useRouter();
  const { language, translate } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement !== null);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen:", error);
    }
  }

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

  // =========================================================
  // CLOCK
  // =========================================================

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // =========================================================
  // VISITOR DATA FROM API
  // =========================================================

  const [visitors, setVisitors] = useState<Visitor[]>([]);

  useEffect(() => {
    async function fetchVisitors() {
      try {
        const response = await fetch("/api/visitors");
        const data: unknown = await response.json();

        if (!response.ok) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : "Failed to fetch visitors";
          const details =
            typeof data === "object" &&
            data !== null &&
            "details" in data &&
            typeof data.details === "string"
              ? `: ${data.details}`
              : "";
          throw new Error(`${message}${details} (HTTP ${response.status})`);
        }

        if (!Array.isArray(data)) {
          throw new Error("Visitors API returned an invalid response");
        }

        console.log("Visitors from API:", data);

        setVisitors(data);
      } catch (error) {
        console.error("Error fetching visitors:", error);
      }
    }

    fetchVisitors();

    const interval = setInterval(fetchVisitors, VISITOR_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getWaitingMinutes = (checkIn: string) => {
    const checkInTime = new Date(checkIn);

    if (Number.isNaN(checkInTime.getTime())) {
      return 0;
    }

    const difference = new Date().getTime() - checkInTime.getTime();

    return Math.max(Math.floor(difference / 1000 / 60), 0);
  };

  // =========================================================
  // ALARM
  // =========================================================

  const [alarmVisitor, setAlarmVisitor] =
    useState<Visitor | null>(null);

  const [alarmActive, setAlarmActive] = useState(false);
  const [remoteAlarmActive, setRemoteAlarmActive] = useState(false);
  const [remoteAlarmVisitorId, setRemoteAlarmVisitorId] =
    useState<number | null>(null);
  const [dismissedAlarmVisitorIds, setDismissedAlarmVisitorIds] = useState<
    number[]
  >([]);
  const alarmRevisionRef = useRef<number | null>(null);

  const alarmIsActive = alarmActive || remoteAlarmActive;
  const displayedAlarmVisitor = remoteAlarmActive
    ? visitors.find((visitor) => visitor.id === remoteAlarmVisitorId) ?? null
    : alarmVisitor;

  const [alarmEnabled, setAlarmEnabled] = useState(false);

  const [alarmWaitingMinutes, setAlarmWaitingMinutes] =
    useState(0);

  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const alarmAudio = alarmAudioRef.current;

    if (alarmIsActive && alarmEnabled && alarmAudio) {
      alarmAudio.currentTime = 0;
      alarmAudio.play().catch((error) => {
        console.error("Unable to play alarm:", error);
      });
    } else if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }

    return () => {
      alarmAudio?.pause();
    };
  }, [alarmIsActive, alarmEnabled]);

  useEffect(() => {
    let mounted = true;

    const refreshAlarmState = async () => {
      try {
        const response = await fetch("/api/alarm", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch TV alarm state");
        }

        const data: unknown = await response.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("active" in data) ||
          typeof data.active !== "boolean" ||
          !("revision" in data) ||
          typeof data.revision !== "number" ||
          !("visitorId" in data) ||
          (typeof data.visitorId !== "number" && data.visitorId !== null)
        ) {
          throw new Error("TV alarm returned an invalid state");
        }

        if (!mounted) {
          return;
        }

        const previousRevision = alarmRevisionRef.current;
        if (previousRevision !== data.revision) {
          alarmRevisionRef.current = data.revision;
          setRemoteAlarmActive(data.active);
          setRemoteAlarmVisitorId(data.active ? data.visitorId : null);
        }
      } catch (error) {
        console.error("Error fetching TV alarm state:", error);
      }
    };

    refreshAlarmState();
    const interval = setInterval(refreshAlarmState, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // =========================================================
  // =========================================================
  // ENABLE ALARM
  // =========================================================

  const enableAlarm = async () => {
    const alarmAudio = new Audio("/sounds/horn.mp3");
    alarmAudio.loop = true;
    alarmAudio.muted = true;
    alarmAudioRef.current = alarmAudio;

    try {
      await alarmAudio.play();
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      alarmAudio.muted = false;
      setAlarmEnabled(true);
    } catch (error) {
      alarmAudioRef.current = null;
      console.error(
        "Unable to enable alarm:",
        error
      );
    }
  };

  // =========================================================
  // WAITING TIME MONITOR
  // =========================================================

  useEffect(() => {
    const checkVisitors = () => {
      const eligibleVisitors = visitors.filter(
        (visitor) =>
          visitor.status === "Waiting" &&
          getWaitingMinutes(visitor.check_in) >=
            WAITING_REMINDER_THRESHOLD_MINUTES,
      );
      const waitingVisitor = eligibleVisitors.find(
        (visitor) => !dismissedAlarmVisitorIds.includes(visitor.id),
      );

      if (eligibleVisitors.length === 0 && dismissedAlarmVisitorIds.length > 0) {
        setDismissedAlarmVisitorIds([]);
      }

      if (waitingVisitor) {
        setAlarmVisitor(waitingVisitor);
        setAlarmWaitingMinutes(getWaitingMinutes(waitingVisitor.check_in));
        setAlarmActive(true);
      } else {
        setAlarmVisitor(null);
        setAlarmWaitingMinutes(0);
        setAlarmActive(false);
      }
    };

    checkVisitors();

    const interval =
      setInterval(
        checkVisitors,
        10000
      );

    return () => {
      clearInterval(interval);
    };
  }, [visitors, dismissedAlarmVisitorIds]);

  // =========================================================
  // STATUS COLOR
  // =========================================================

  const statusColor = (
    status: Visitor["status"]
  ) => {
    switch (status) {
      case "Waiting":
        return {
          bg: "#ff2020",
          text: "#3a2600",
        };

      case "Meeting":
        return {
          bg: "#f3ff11",
          text: "#083318",
        };

      case "Completed":
        return {
          bg: "#0ed418",
          text: "#1f2937",
        };

      case "Cancelled":
        return {
          bg: "#6b7280",
          text: "#ffffff",
        };

      default:
        return {
          bg: "#0ed418",
          text: "#1f2937",
        };
    }
  };

  // =========================================================
  // DISMISS ALARM
  // =========================================================

  const dismissAlarm = () => {
    if (remoteAlarmActive && remoteAlarmVisitorId !== null) {
      setRemoteAlarmActive(false);
      setRemoteAlarmVisitorId(null);

      fetch("/api/alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: false,
          visitorId: remoteAlarmVisitorId,
        }),
      }).then((response) => {
        if (!response.ok) {
          throw new Error("Failed to stop the TV alarm");
        }
      }).catch((error: unknown) => {
        console.error("Unable to stop TV alarm:", error);
      });
      return;
    }

    const dismissedIds = alarmVisitor
      ? [...dismissedAlarmVisitorIds, alarmVisitor.id]
      : dismissedAlarmVisitorIds;
    setDismissedAlarmVisitorIds(dismissedIds);
    setAlarmVisitor(null);
    setAlarmActive(false);
    setAlarmWaitingMinutes(0);
  };

  // =========================================================
  // RENDER
  // =========================================================
  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="tv-main d-flex flex-column align-items-center py-5">
      <div className="container-fluid px-5">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="d-flex justify-content-between align-items-center mb-5 header-bar">

          <div className="d-flex align-items-center gap-4">

            <Image
              src="/MCSI.png"
              alt="Logo"
              width={90}
              height={90}
              className="logo-glow"
            />

            <div>
              <h1 className="tv-title mb-1">
                {translate("Informasi Pengunjung", "Visitor Information")}
              </h1>

              <p className="tv-subtitle mb-0">
                {translate("Tamu di lokasi hari ini", "Today's guests on-site")}
              </p>
            </div>

          </div>

          {/* ===================================================
              CLOCK
          =================================================== */}

          <div className="d-flex align-items-center gap-3">
            <LanguageSwitcher />
            {now && (
            <div className="clock-box text-end">

              <div className="clock-time">
                {now.toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
                  hour12: false,
                })}
              </div>

              <div className="clock-date">
                {now.toLocaleDateString(language === "id" ? "id-ID" : "en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>

            </div>
          )}
          </div>

        </div>

        {/* =====================================================
            ALARM ENABLE BUTTON
        ===================================================== */}

        {!alarmEnabled && (
          <div className="alarm-enable-wrapper">

            <button
              type="button"
              className="alarm-enable-button"
              onClick={enableAlarm}
            >
              🔔 {translate("Aktifkan Alarm Pengunjung", "Enable Visitor Alarm")}
            </button>

            <p className="alarm-help-text">
              {translate(
                "Klik tombol ini sekali untuk mengaktifkan suara TV.",
                "Click this button once to enable sound on the TV.",
              )}
            </p>

          </div>
        )}

        {/* =====================================================
            ALARM DISPLAY
        ===================================================== */}

        {alarmIsActive && (
          <div className="alarm-overlay">

            <div className="alarm-card">

              <div className="alarm-icon">
                🔔
              </div>

              <div className="alarm-content">

                <div className="alarm-label">
                  {displayedAlarmVisitor
                    ? translate("PENGINGAT PENGUNJUNG", "VISITOR REMINDER")
                    : translate("PERINGATAN ADMINISTRATOR", "ADMINISTRATOR ALERT")}
                </div>

                <h2 className="alarm-title">
                  {displayedAlarmVisitor?.name ??
                    translate("Mohon periksa area pengunjung", "Please check the visitor area")}
                </h2>

                <p className="alarm-company">
                  {displayedAlarmVisitor?.company ??
                    translate("Alarm diaktifkan dari halaman admin", "Alarm triggered from the admin page")}
                </p>

                <div className="alarm-details">

                  <div>
                    <span>{translate("Divisi", "Division")}</span>
                    <strong>
                      {displayedAlarmVisitor?.division || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>PIC</span>
                    <strong>
                      {displayedAlarmVisitor?.pic || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>{translate("Waktu masuk", "Check-in")}</span>
                    <strong>
                      {displayedAlarmVisitor?.check_in || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>{translate("Keperluan", "Purpose")}</span>
                    <strong>
                      {displayedAlarmVisitor?.purpose || "—"}
                    </strong>
                  </div>

                </div>

                <p className="alarm-message">
                  {displayedAlarmVisitor
                    ? translate(
                      `Pengunjung ini telah menunggu lebih dari ${
                        remoteAlarmActive
                          ? getWaitingMinutes(displayedAlarmVisitor.check_in)
                          : alarmWaitingMinutes
                      } menit.`,
                      `This visitor has been waiting for more than ${
                        remoteAlarmActive
                          ? getWaitingMinutes(displayedAlarmVisitor.check_in)
                          : alarmWaitingMinutes
                      } minutes.`,
                    )
                    : translate(
                      "Administrator telah mengaktifkan alarm TV.",
                      "An administrator has triggered the TV alarm.",
                    )}
                </p>

                <button
                  type="button"
                  className="alarm-dismiss-button"
                  onClick={dismissAlarm}
                >
                  ✓ {translate("Mengerti", "Acknowledge")}
                </button>

              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            VISITOR CARDS
        ===================================================== */}

        <div className="visitor-slider">

          <div className="visitor-track">

            {[...visitors, ...visitors].map(
              (visitor, index) => {

                const sc = statusColor(
                  visitor.status
                );

                return (
                  <div
                    key={`${visitor.name}-${index}`}
                    className="visitor-slide"
                  >

                    <div className="visitor-card h-100">

                      <div className="card-inner p-4">

                        {/* VISITOR HEADER */}

                        <div className="d-flex align-items-center mb-4">

                          <div className="avatar-circle me-3">
                            {visitor.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>

                            <h3 className="visitor-name mb-1">
                              {visitor.name}
                            </h3>

                            <div className="visitor-company">
                              {visitor.rank && visitor.rank !== "OTHERS"
                                ? visitor.rank
                                : visitor.position}
                            </div>

                          </div>

                        </div>

                        <hr className="divider" />

                        {/* VISITOR INFORMATION */}

                        <ul className="list-unstyled tv-info mb-0">

                          <li className="mb-3 d-flex justify-content-between">

                            <span className="label">
                              {translate("DIVISI", "DIVISION")}
                            </span>

                            <span className="value">
                              {visitor.division}
                            </span>

                          </li>

                          <li className="mb-3 d-flex justify-content-between">

                            <span className="label">
                              PIC
                            </span>

                            <span className="value">
                              {visitor.pic}
                            </span>

                          </li>

                          <li className="mb-3 d-flex justify-content-between">

                            <span className="label">
                              {translate("KONTAK", "CONTACT")}
                            </span>

                            <span className="value">
                              {visitor.phone}
                            </span>

                          </li>

                          <li className="mb-4">

                            <span className="purpose-badge">
                              {visitor.purpose}
                            </span>

                          </li>

                          {/* STATUS */}

                          <li className="d-flex justify-content-between align-items-center pt-2 status-row">

                            <span className="label fw-semibold">
                              {translate("Status", "Status")}
                            </span>

                            <span
                              className="status-badge"
                              style={{
                                background: sc.bg,
                                color: sc.text,
                              }}
                            >
                              {translate(
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
                            </span>

                          </li>

                        </ul>

                      </div>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

        {/* =====================================================
            EMPTY STATE
        ===================================================== */}

        {visitors.length === 0 && (
          <div className="text-center empty-state py-5">

            <p className="mb-0">
              {translate("Belum ada tamu hari ini", "No visitors today")}
            </p>

          </div>
        )}

      </div>

      <div
        ref={menuRef}
        className={`floating-menu-wrapper ${menuOpen ? "menu-is-open" : ""}`}
      >
        {menuOpen && (
          <div className="apple-menu-panel">
            <div className="apple-menu-header">
              <div>
                <span>{translate("Menu TV", "TV Menu")}</span>
                <small>{translate("Navigasi", "Navigate")}</small>
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

            <div className="apple-menu-grid">
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  void toggleFullscreen();
                }}
              >
                <span className="menu-icon tv-icon">
                  {isFullscreen ? "↙" : "⛶"}
                </span>
                <span>
                  {isFullscreen
                    ? translate("Keluar dari layar penuh", "Exit Fullscreen")
                    : translate("Layar penuh", "Fullscreen")}
                </span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/admin");
                }}
              >
                <span className="menu-icon visitor-icon">🏠</span>
                <span>{translate("Kembali ke Admin", "Back to Admin")}</span>
              </button>

              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/user");
                }}
              >
                <span className="menu-icon users-icon">👤</span>
                <span>{translate("Kembali ke Pengguna", "Back to User")}</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className={`floating-menu-button ${menuOpen ? "floating-menu-button-open" : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={translate("Buka menu TV", "Open TV menu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>

      {/* =======================================================
          CSS
      ======================================================= */}

      <style>{`

        /* =====================================================
           MAIN
        ===================================================== */

        .tv-main {
          min-height: 100vh;
          width: 100%;
          background:
            linear-gradient(
              135deg,
              #0f172a 0%,
              #1e3a8a 45%,
              #0f172a 100%
            );

          background-attachment: fixed;
          position: relative;
        }


        /* =====================================================
           HEADER
        ===================================================== */

        .header-bar {
          padding-bottom: 1.5rem;
          border-bottom:
            2px solid
            rgba(255,255,255,0.15);
        }


        .logo-glow {
          filter:
            drop-shadow(
              0 0 18px
              rgba(255,255,255,0.35)
            );
        }


        .tv-title {
          font-weight: 800;
          font-size:
            clamp(
              2.2rem,
              3.2vw,
              3.4rem
            );

          color: #ffffff;

          letter-spacing: -0.5px;

          text-shadow:
            0 2px 12px
            rgba(0,0,0,0.25);
        }


        .tv-subtitle {
          font-size:
            clamp(
              1.1rem,
              1.4vw,
              1.5rem
            );

          color:
            rgba(255,255,255,0.65);
        }


        /* =====================================================
           CLOCK
        ===================================================== */

        .clock-box {
          background:
            rgba(255,255,255,0.08);

          border:
            1px solid
            rgba(255,255,255,0.15);

          border-radius: 1.25rem;

          padding:
            0.9rem 1.8rem;

          backdrop-filter:
            blur(10px);
        }


        .clock-time {
          font-size:
            clamp(
              1.8rem,
              2.4vw,
              2.6rem
            );

          font-weight: 700;

          color: #fff;

          font-variant-numeric:
            tabular-nums;

          line-height: 1.1;
        }


        .clock-date {
          font-size:
            clamp(
              0.95rem,
              1.1vw,
              1.2rem
            );

          color:
            rgba(255,255,255,0.6);

          margin-top: 0.2rem;
        }


        /* =====================================================
           ALARM ENABLE
        ===================================================== */

        .alarm-enable-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          margin-bottom: 2rem;
        }


        .alarm-enable-button {
          border: none;

          background:
            linear-gradient(
              135deg,
              #ef4444,
              #b91c1c
            );

          color: #fff;

          font-size: 1rem;

          font-weight: 700;

          padding:
            0.8rem 1.5rem;

          border-radius: 999px;

          cursor: pointer;

          box-shadow:
            0 8px 25px
            rgba(239,68,68,0.35);

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }


        .alarm-enable-button:hover {
          transform: translateY(-2px);

          box-shadow:
            0 12px 30px
            rgba(239,68,68,0.45);
        }


        .alarm-help-text {
          color:
            rgba(255,255,255,0.55);

          font-size: 0.85rem;

          margin-top: 0.6rem;

          margin-bottom: 0;
        }


        /* =====================================================
           ALARM OVERLAY
        ===================================================== */

        .alarm-overlay {
          position: relative;

          width: 100%;

          margin-bottom: 2.5rem;

          animation:
            alarmAppear
            0.4s ease;
        }


        .alarm-card {
          display: flex;
          align-items: center;

          width: 100%;

          padding: 2rem;

          border-radius: 1.75rem;

          background:
            linear-gradient(
              135deg,
              rgba(127,29,29,0.96),
              rgba(185,28,28,0.96)
            );

          border:
            2px solid
            rgba(255,255,255,0.25);

          box-shadow:
            0 20px 60px
            rgba(0,0,0,0.4);

          animation:
            alarmPulse
            1.5s infinite;
        }


        .alarm-icon {
          width: 100px;
          height: 100px;

          min-width: 100px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 3.5rem;

          margin-right: 2rem;

          border-radius: 50%;

          background:
            rgba(255,255,255,0.15);

          animation:
            alarmShake
            0.8s infinite;
        }


        .alarm-content {
          flex: 1;
        }


        .alarm-label {
          color:
            rgba(255,255,255,0.7);

          font-size: 1.1rem;

          font-weight: 800;

          letter-spacing: 2px;

          margin-bottom: 0.25rem;
        }


        .alarm-title {
          color: #fff;

          font-size:
            clamp(
              2.2rem,
              3.2vw,
              3.5rem
            );

          font-weight: 800;

          margin: 0;
        }


        .alarm-company {
          color:
            rgba(255,255,255,0.75);

          font-size: 1.35rem;

          margin-bottom: 1.2rem;
        }


        .alarm-details {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 1rem;

          margin-bottom: 1.2rem;
        }


        .alarm-details div {
          display: flex;
          flex-direction: column;

          gap: 0.25rem;
        }


        .alarm-details span {
          color:
            rgba(255,255,255,0.6);

          font-size: 1.2rem;
        }


        .alarm-details strong {
          color: #fff;

          font-size: 1.5rem;
        }


        .alarm-message {
          color: #fff;

          font-size: 3rem;

          font-weight: 600;

          margin-bottom: 1rem;
        }


        .alarm-dismiss-button {
          border: none;

          background: #fff;

          color: #991b1b;

          font-weight: 800;
          font-size: 1.1rem;

          padding:
            0.7rem 1.4rem;

          border-radius: 999px;

          cursor: pointer;

          transition:
            transform 0.2s ease;
        }


        .alarm-dismiss-button:hover {
          transform: scale(1.04);
        }


        /* =====================================================
           VISITOR SLIDER
        ===================================================== */

        .visitor-slider {
          width: 100%;

          overflow: hidden;

          padding:
            1rem 0 3rem;
        }


        .visitor-track {
          display: flex;

          gap: 2rem;

          width: max-content;

          animation:
            visitorScroll
            10s linear infinite; // Speed Card
        }


        .visitor-track:hover {
          animation-play-state: paused;
        }


        .visitor-slide {
          width:
            clamp(
              350px,
              28vw,
              500px
            );

          flex-shrink: 0;
        }


        /* =====================================================
           VISITOR CARD
        ===================================================== */

        .visitor-card {
          background:
            rgba(255,255,255,0.97);

          border-radius: 1.75rem;

          box-shadow:
            0 10px 40px
            rgba(0,0,0,0.25);

          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;

          overflow: hidden;

          border:
            1px solid
            rgba(255,255,255,0.2);
        }


        .visitor-card:hover {
          transform:
            translateY(-6px);

          box-shadow:
            0 20px 55px
            rgba(0,0,0,0.35);
        }


        .card-inner {
          padding:
            2rem !important;
        }


        /* =====================================================
           AVATAR
        ===================================================== */

        .avatar-circle {
          width: 72px;
          height: 72px;

          min-width: 72px;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          font-weight: 800;

          font-size: 1.8rem;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              #3b82f6,
              #1e40af
            );

          box-shadow:
            0 6px 16px
            rgba(59,130,246,0.4);
        }


        .visitor-name {
          font-size:
            clamp(
              1.4rem,
              1.6vw,
              1.75rem
            );

          font-weight: 700;

          color: #111827;
        }


        .visitor-company {
          font-size: 1.1rem;

          color: #6b7280;

          font-weight: 500;
        }


        /* =====================================================
           DIVIDER
        ===================================================== */

        .divider {
          border-top:
            2px solid
            #eef1f6;

          opacity: 1;
        }


        /* =====================================================
           INFORMATION
        ===================================================== */

        .tv-info {
          font-size: 1.15rem;
        }


        .label {
          color: #9ca3af;

          font-weight: 500;
        }


        .value {
          color: #1f2937;

          font-weight: 700;

          text-align: right;
        }


        .purpose-badge {
          display: inline-block;

          background: #eef2ff;

          color: #4338ca;

          font-weight: 600;

          font-size: 1.05rem;

          padding:
            0.55rem 1.2rem;

          border-radius: 999px;
        }


        .status-row {
          border-top:
            2px dashed
            #eef1f6;

          padding-top: 1rem;
        }


        .status-badge {
          font-size: 1.15rem;

          font-weight: 700;

          padding:
            0.55rem 1.4rem;

          border-radius: 999px;

          letter-spacing: 0.3px;
        }


        /* =====================================================
           EMPTY STATE
        ===================================================== */

        .empty-state {
          color:
            rgba(255,255,255,0.7);

          font-size: 1.5rem;
        }


        /* =====================================================
           ANIMATIONS
        ===================================================== */

        @keyframes visitorScroll {

          from {
            transform: translateX(0);
          }

          to {
            transform:
              translateX(
                calc(
                  -50% - 1rem
                )
              );
          }

        }


        @keyframes alarmAppear {

          from {
            opacity: 0;
            transform:
              translateY(-20px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }

        }


        @keyframes alarmPulse {

          0%,
          100% {
            box-shadow:
              0 20px 60px
              rgba(0,0,0,0.4);
          }

          50% {
            box-shadow:
              0 20px 70px
              rgba(239,68,68,0.65);
          }

        }


        @keyframes alarmShake {

          0%,
          100% {
            transform: rotate(0deg);
          }

          25% {
            transform: rotate(-10deg);
          }

          75% {
            transform: rotate(10deg);
          }

        }


        /* =====================================================
           LARGE SCREEN
        ===================================================== */

        @media (min-width: 1600px) {

          .card-inner {
            padding:
              2.5rem !important;
          }


          .avatar-circle {
            width: 84px;
            height: 84px;

            min-width: 84px;

            font-size: 2.1rem;
          }


          .visitor-name {
            font-size: 2rem;
          }


          .tv-info {
            font-size: 1.3rem;
          }

        }


        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 992px) {

          .container-fluid {
            padding-left: 2rem !important;
            padding-right: 2rem !important;
          }


          .header-bar {
            flex-direction: column;

            align-items: flex-start !important;

            gap: 1.5rem;
          }


          .clock-box {
            align-self: flex-end;
          }


          .alarm-details {
            grid-template-columns:
              repeat(2, 1fr);
          }


          .alarm-icon {
            width: 80px;
            height: 80px;

            min-width: 80px;

            font-size: 2.5rem;
          }

        }


        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 576px) {

          .tv-main {
            padding-top: 2rem !important;
          }


          .container-fluid {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }


          .header-bar {
            margin-bottom: 2rem !important;
          }


          .header-bar
          > div:first-child {
            gap: 1rem !important;
          }


          .logo-glow {
            width: 65px;
            height: 65px;
          }


          .tv-title {
            font-size: 1.7rem;
          }


          .tv-subtitle {
            font-size: 0.9rem;
          }


          .clock-box {
            width: 100%;

            text-align: center !important;

            align-self: stretch;
          }


          .clock-time {
            font-size: 2rem;
          }


          .clock-date {
            font-size: 0.85rem;
          }


          .visitor-slide {
            width: 85vw;
          }


          .card-inner {
            padding: 1.5rem !important;
          }


          .visitor-name {
            font-size: 1.3rem;
          }


          .visitor-company {
            font-size: 0.95rem;
          }


          .tv-info {
            font-size: 1rem;
          }


          .avatar-circle {
            width: 60px;
            height: 60px;

            min-width: 60px;

            font-size: 1.5rem;
          }


          .alarm-card {
            flex-direction: column;

            text-align: center;

            padding: 1.5rem;
          }


          .alarm-icon {
            margin-right: 0;

            margin-bottom: 1rem;
          }


          .alarm-title {
            font-size: 1.8rem;
          }


          .alarm-company {
            font-size: 1.1rem;
          }


          .alarm-details {
            grid-template-columns:
              repeat(2, 1fr);

            text-align: left;
          }

          .alarm-details span {
            font-size: 1.05rem;
          }

          .alarm-details strong {
            font-size: 1.25rem;
          }


          .alarm-message {
            font-size: 1.15rem;
          }

        }

      `}</style>
    </main>
  );
}