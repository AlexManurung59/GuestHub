"use client";

import { useEffect, useState } from "react";

export const WAITING_REMINDER_THRESHOLD_MINUTES = 10;
export const VISITOR_REFRESH_INTERVAL_MS = 10_000;

interface VisitorReminderProps {
  visitorName: string;
  checkIn: string;
  thresholdMinutes?: number;
}

export default function VisitorReminder({
  visitorName,
  checkIn,
  thresholdMinutes = WAITING_REMINDER_THRESHOLD_MINUTES,
}: VisitorReminderProps) {
  const [waitingMinutes, setWaitingMinutes] = useState<number | null>(null);
  const [dismissedCheckIn, setDismissedCheckIn] = useState<string | null>(null);

  useEffect(() => {
    const checkWaitingTime = () => {
      const now = new Date();
      let checkInTime: Date;

      if (/^\d{1,2}:\d{2}$/.test(checkIn)) {
        const [hours, minutes] = checkIn.split(":").map(Number);
        if (hours > 23 || minutes > 59) {
          setWaitingMinutes(null);
          return;
        }
        checkInTime = new Date();
        checkInTime.setHours(hours, minutes, 0, 0);
      } else {
        checkInTime = new Date(checkIn);
      }

      if (Number.isNaN(checkInTime.getTime())) {
        setWaitingMinutes(null);
        return;
      }

      const difference = now.getTime() - checkInTime.getTime();
      const minutesWaiting = Math.floor(Math.max(difference, 0) / 1000 / 60);

      setWaitingMinutes((current) =>
        current === minutesWaiting ? current : minutesWaiting,
      );
    };

    checkWaitingTime();

    const timer = setInterval(checkWaitingTime, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [checkIn, thresholdMinutes]);

  if (waitingMinutes === null || waitingMinutes < thresholdMinutes || dismissedCheckIn === checkIn) {
    return null;
  }

  return (
    <section className="visitor-reminder" role="status" aria-live="polite">
      <div className="visitor-reminder-icon" aria-hidden="true">
        ⏳
      </div>
      <div className="visitor-reminder-content">
        <div className="visitor-reminder-heading">
          <span className="visitor-reminder-eyebrow">WAITING FOR ASSISTANCE</span>
          <span className="visitor-reminder-duration">
            {waitingMinutes} min
          </span>
        </div>
        <h2 className="visitor-reminder-title">{visitorName}</h2>
        <p className="visitor-reminder-copy">
          This visitor has been waiting longer than {thresholdMinutes} minutes.
          Please follow up.
        </p>
      </div>
      <button
        type="button"
        className="visitor-reminder-dismiss"
        aria-label={`Dismiss reminder for ${visitorName}`}
        onClick={() => setDismissedCheckIn(checkIn)}
      >
        ×
      </button>
    </section>
  );
}
