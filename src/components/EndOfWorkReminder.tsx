
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/app/language-provider";

type AlarmState = {
  active: boolean;
  alarmDate: string | null;
  dismissedDate: string | null;
  revision: number;
};

type JakartaTime = {
  date: string;
  weekday: string;
  hour: number;
  minute: number;
};

type EndOfWorkReminderProps = {
  canControl?: boolean;
  controlTarget?: HTMLDivElement | null;
  soundControlTarget?: HTMLDivElement | null;
  onEnableAdditionalSound?: () => Promise<void>;
  showReminderCard?: boolean;
  showSoundControl?: boolean;
  canPlaySound?: boolean;
};

function getJakartaTime(): JakartaTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

const initialAlarm: AlarmState = {
  active: false,
  alarmDate: null,
  dismissedDate: null,
  revision: 0,
};

function isPlaybackInterrupted(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export default function EndOfWorkReminder({
  canControl = false,
  controlTarget = null,
  soundControlTarget,
  onEnableAdditionalSound,
  showReminderCard = true,
  showSoundControl = true,
  canPlaySound = false,
}: EndOfWorkReminderProps) {
  const { translate } = useLanguage();
  const [alarm, setAlarm] = useState<AlarmState>(initialAlarm);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [alarmControlLoading, setAlarmControlLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestInProgressRef = useRef(false);
  const controlInProgressRef = useRef(false);

  const getAlarm = useCallback(async (): Promise<AlarmState> => {
    const response = await fetch("/api/end-of-work-alarm", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to read alarm state.");
    }

    return (await response.json()) as AlarmState;
  }, []);

  const syncAlarm = useCallback(async () => {
    try {
      const latest = await getAlarm();
      setAlarm(latest);
      setErrorMessage("");
    } catch (error) {
      console.error("Unable to synchronize end-of-work alarm:", error);
      setErrorMessage(
        translate(
          "Tidak dapat memeriksa status alarm.",
          "Unable to check alarm status.",
        ),
      );
    }
  }, [getAlarm, translate]);

  // Prepare the audio file.
  useEffect(() => {
    const audio = new Audio("/sounds/home.mp3");
    audio.preload = "auto";
    audio.loop = false;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, []);

  // Check the scheduled time and activate the shared alarm.
  const checkSchedule = useCallback(async () => {
    if (requestInProgressRef.current) return;

    const now = getJakartaTime();
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
 

    const isWeekday = weekdays.includes(now.weekday);
    const afterWorkTime =
      now.hour > 17 || (now.hour === 17 && now.minute >= 0); // change the alarm clock

    if (!isWeekday || !afterWorkTime) return;

    requestInProgressRef.current = true;

    try {
      const latest = await getAlarm();
      setAlarm(latest);

      // Already activated or dismissed for today's date.
      if (
        latest.alarmDate === now.date ||
        latest.dismissedDate === now.date
      ) {
        return;
      }

      const response = await fetch("/api/end-of-work-alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "activate",
          date: now.date,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate the scheduled alarm.");
      }

      setAlarm((await response.json()) as AlarmState);
      setErrorMessage("");
    } catch (error) {
      console.error("End-of-work schedule check failed:", error);
      setErrorMessage(
        translate(
          "Jadwal alarm gagal diperiksa. Coba lagi.",
          "Could not check the alarm schedule. Please try again.",
        ),
      );
    } finally {
      requestInProgressRef.current = false;
    }
  }, [getAlarm, translate]);

  // Poll the shared state so every open page follows Admin's action.
  useEffect(() => {
    const initialSyncId = window.setTimeout(() => {
      void syncAlarm();
      void checkSchedule();
    }, 0);

    const pollId = window.setInterval(() => {
      void syncAlarm();
      void checkSchedule();
    }, 5000);

    return () => {
      window.clearTimeout(initialSyncId);
      window.clearInterval(pollId);
    };
  }, [syncAlarm, checkSchedule]);

  const stopAlarm = useCallback(async (date: string) => {
    const response = await fetch("/api/end-of-work-alarm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", date }),
    });

    if (!response.ok) {
      throw new Error("Failed to stop the end-of-work alarm.");
    }

    setAlarm((await response.json()) as AlarmState);
    setErrorMessage("");
  }, []);

  const handleAudioEnded = useCallback(() => {
    if (!alarm.active || !alarm.alarmDate || controlInProgressRef.current) {
      return;
    }

    controlInProgressRef.current = true;
    void stopAlarm(alarm.alarmDate)
      .catch((error: unknown) => {
        console.error("Unable to stop alarm after audio finished:", error);
        setErrorMessage(
          translate(
            "Alarm tidak dapat dihentikan setelah audio selesai.",
            "The alarm could not stop after the audio finished.",
          ),
        );
      })
      .finally(() => {
        controlInProgressRef.current = false;
      });
  }, [alarm.active, alarm.alarmDate, stopAlarm, translate]);

  useEffect(() => {
    if (!canPlaySound) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener("ended", handleAudioEnded);
    return () => audio.removeEventListener("ended", handleAudioEnded);
  }, [canPlaySound, handleAudioEnded]);

  // Play once while active so the end of the file can stop the shared alarm.
  useEffect(() => {
    if (!canPlaySound) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (alarm.active && soundEnabled) {
      if (!audio.paused) return;

      void audio.play().catch((error: unknown) => {
        if (isPlaybackInterrupted(error)) return;
        console.error("Unable to play end-of-work alarm:", error);
        setErrorMessage(
          translate(
            "Audio tidak dapat diputar pada perangkat ini.",
            "Audio could not play on this device.",
          ),
        );
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [alarm.active, canPlaySound, soundEnabled, translate]);

  async function handleAlarmControl() {
    if (controlInProgressRef.current) return;

    controlInProgressRef.current = true;
    setAlarmControlLoading(true);
    setErrorMessage("");

    const action = alarm.active ? "stop" : "activate";
    const date = getJakartaTime().date;
    const audio = audioRef.current;

    if (action === "activate" && canPlaySound && audio) {
      audio.loop = false;
      audio.currentTime = 0;
      void audio.play().catch((error: unknown) => {
        if (isPlaybackInterrupted(error)) return;
        console.error("Unable to play end-of-work alarm:", error);
        setErrorMessage(
          translate(
            "Audio tidak dapat diputar pada perangkat ini.",
            "Audio could not play on this device.",
          ),
        );
      });
      setSoundEnabled(true);
    } else if (action === "stop" && canPlaySound && audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    try {
      const response = await fetch("/api/end-of-work-alarm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} the end-of-work alarm.`);
      }

      const updatedAlarm = (await response.json()) as AlarmState;
      setAlarm(updatedAlarm);
    } catch (error) {
      console.error(`Unable to ${action} end-of-work alarm:`, error);
      setErrorMessage(
        action === "activate"
          ? translate(
              "Alarm gagal diaktifkan. Coba lagi.",
              "Could not start the alarm. Please try again.",
            )
          : translate(
              "Alarm gagal dihentikan. Coba lagi.",
              "Could not stop the alarm. Please try again.",
            ),
      );
      if (action === "activate" && canPlaySound && audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      void syncAlarm();
    } finally {
      controlInProgressRef.current = false;
      setAlarmControlLoading(false);
    }
  }

  async function handleEnableSound() {
    if (!canPlaySound) return;

    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.loop = false;
      audio.currentTime = 0;
      const playback = audio.play();
      const additionalSoundEnablement = onEnableAdditionalSound?.();

      await Promise.all([playback, additionalSoundEnablement]);

      setSoundEnabled(true);
    } catch (error) {
      if (isPlaybackInterrupted(error)) return;
      console.error("Failed to enable alarm sound:", error);
      alert(
        translate(
          "Suara tidak dapat diputar. Periksa file audio dan izin browser.",
          "Audio could not play. Check the audio file and browser permissions.",
        ),
      );
    }
  }

  const soundStatus = soundEnabled
    ? onEnableAdditionalSound
      ? translate("🔊 Alarm aktif", "🔊 Alarms are enabled")
      : translate("🔊 Alarm aktif", "🔊 Alarm is active")
    : onEnableAdditionalSound
      ? translate(
          "🔔 Aktifkan alarm pada perangkat ini",
          "🔔 Enable alarms on this device",
        )
      : translate(
          "🔔 Aktifkan suara pada perangkat ini",
          "🔔 Enable sound on this device",
        );

  const soundButtonLabel = soundEnabled
    ? onEnableAdditionalSound
      ? translate("🔊 Tes alarm", "🔊 Test Alarms")
      : translate("🔊 Tes suara", "🔊 Test Sound")
    : onEnableAdditionalSound
      ? translate("🔔 Aktifkan alarm", "🔔 Enable Alarms")
      : translate("🔔 Aktifkan suara", "🔔 Enable Sound");

  const soundButton = (
    <button
      type="button"
      onClick={handleEnableSound}
      className={
        soundControlTarget !== undefined
          ? "alarm-enable-button"
          : controlTarget
            ? "menu-item"
            : undefined
      }
      style={
        controlTarget || soundControlTarget !== undefined
          ? undefined
          : soundButtonStyle
      }
    >
      <span
        className={controlTarget ? "menu-icon" : undefined}
        aria-hidden="true"
      >
        {soundEnabled ? "🔊" : "🔔"}
      </span>
      <span>
        {controlTarget
          ? soundEnabled
            ? onEnableAdditionalSound
              ? translate("Tes Alarm", "Test Alarms")
              : translate("Tes Suara", "Test Sound")
            : onEnableAdditionalSound
              ? translate("Aktifkan Alarm", "Enable Alarms")
              : translate("Aktifkan Suara", "Enable Sound")
          : soundEnabled
            ? alarm.active
              ? translate("🔊 Putar ulang alarm", "🔊 Replay Alarms")
              : translate("🔊 Tes alarm", "🔊 Test Alarms")
            : translate("🔔 Aktifkan suara", "🔔 Enable Sound")}
      </span>
    </button>
  );

  const alarmControl = canControl && (
    <button
      type="button"
      onClick={handleAlarmControl}
      className={controlTarget ? "menu-item" : undefined}
      style={
        controlTarget
          ? undefined
          : alarm.active
            ? stopAlarmButtonStyle
            : alarmControlButtonStyle
      }
      disabled={alarmControlLoading}
    >
      <span
        className={controlTarget ? "menu-icon" : undefined}
        aria-hidden="true"
      >
        {alarmControlLoading ? "⏳" : alarm.active ? "■" : "▶"}
      </span>
      <span>
        {alarmControlLoading
          ? alarm.active
            ? translate("Menghentikan...", "Stopping...")
            : translate("Memulai...", "Starting...")
          : alarm.active
            ? translate("Hentikan Alarm", "Stop Alarm")
            : translate("Mulai Alarm", "Start Alarm")}
      </span>
    </button>
  );

  const menuControls = controlTarget
    ? createPortal(
        <>
          {alarmControl}
          {showSoundControl && soundControlTarget === undefined && soundButton}
          {errorMessage && (
            <p role="alert" style={menuControlErrorStyle}>
              {errorMessage}
            </p>
          )}
        </>,
        controlTarget,
      )
    : null;

  const externalSoundControl =
    showSoundControl &&
    soundControlTarget &&
    createPortal(soundButton, soundControlTarget);

  const floatingSoundControl = showSoundControl && !canControl && (
    <div style={controlGroupStyle}>
      {soundButton}
      {errorMessage && (
        <p role="alert" style={controlErrorStyle}>
          {errorMessage}
        </p>
      )}
    </div>
  );

  return (
    <>
      {showReminderCard && alarm.active && (
        <div style={overlayStyle}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="end-of-work-title"
            style={dialogStyle}
          >
            <div style={{ fontSize: 52 }} aria-hidden="true">
              🕔
            </div>

            <h2 id="end-of-work-title" style={headingStyle}>
              {translate("Waktunya Pulang!", "Time to Head Home!")}
            </h2>

            <p style={messageStyle}>
              {translate(
                "Sekarang pukul 17.00 WIB atau lebih. Pastikan pekerjaan hari ini selesai dan peralatan kerja sudah dibersihkan dengan rapi.",
                "It is now 5:00 PM WIB or later. Please finish today's work and leave your work equipment clean and tidy.",
              )}
            </p>

            <p style={timeStyle}>
              {translate(
                "Senin–Jumat · 17.00 WIB",
                "Monday–Friday · 5:00 PM WIB",
              )}
            </p>

            <p role="status">{soundStatus}</p>

            <button
              type="button"
              onClick={handleEnableSound}
              style={primaryButtonStyle}
            >
              {soundButtonLabel}
            </button>

            <p style={messageStyle}>
              {translate(
                "Alarm berhenti otomatis setelah musik selesai, atau dapat dihentikan menggunakan tombol.",
                "The alarm stops automatically when the music ends, or you can stop it using the menu button.",
              )}
            </p>

            {errorMessage && (
              <p role="alert" style={{ color: "#b91c1c" }}>
                {errorMessage}
              </p>
            )}
          </section>
        </div>
      )}

      {menuControls}
      {externalSoundControl}
      {floatingSoundControl}
    </>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 99997,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(10, 15, 25, 0.78)",
};

const dialogStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  padding: "36px 28px",
  borderRadius: 24,
  background: "#fff",
  color: "#172033",
  textAlign: "center",
  boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
};

const headingStyle: CSSProperties = {
  margin: "12px 0",
  fontSize: 32,
  fontWeight: 800,
};

const messageStyle: CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
};

const timeStyle: CSSProperties = {
  margin: "20px 0",
  fontWeight: 700,
  color: "#b45309",
};

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "12px 18px",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const controlGroupStyle: CSSProperties = {
  position: "fixed",
  right: 16,
  bottom: 16,
  zIndex: 100000,
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 8,
};

const controlErrorStyle: CSSProperties = {
  maxWidth: 320,
  margin: 0,
  padding: "8px 12px",
  borderRadius: 8,
  background: "#fff",
  color: "#b91c1c",
  fontSize: 13,
};

const menuControlErrorStyle: CSSProperties = {
  gridColumn: "1 / -1",
  margin: 0,
  padding: 8,
  borderRadius: 8,
  background: "#fff",
  color: "#b91c1c",
  fontSize: 12,
  textAlign: "center",
};

const soundButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 999,
  padding: "11px 16px",
  background: "#172033",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const alarmControlButtonStyle: CSSProperties = {
  ...soundButtonStyle,
  background: "#15803d",
};

const stopAlarmButtonStyle: CSSProperties = {
  ...soundButtonStyle,
  background: "#b91c1c",
};
