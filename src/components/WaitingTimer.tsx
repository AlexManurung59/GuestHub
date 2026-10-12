"use client";

import { useEffect, useState } from "react";

interface WaitingTimerProps {
  checkIn: string;
}

export default function WaitingTimer({ checkIn }: WaitingTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const calculateWaitingTime = () => {
      const now = new Date();
      let checkInTime: Date;

      if (/^\d{1,2}:\d{2}$/.test(checkIn)) {
        const [hours, minutes] = checkIn.split(":").map(Number);
        if (hours > 23 || minutes > 59) {
          setElapsedSeconds(0);
          return;
        }

        checkInTime = new Date();
        checkInTime.setHours(hours, minutes, 0, 0);
      } else {
        checkInTime = new Date(checkIn);
      }

      if (Number.isNaN(checkInTime.getTime())) {
        setElapsedSeconds(0);
        return;
      }

      const difference = now.getTime() - checkInTime.getTime();

      const seconds = Math.max(0, Math.floor(difference / 1000));
      setElapsedSeconds(seconds);
    };
    calculateWaitingTime();

    const timer = setInterval(calculateWaitingTime, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [checkIn]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return (
    <span className="font-monospace" aria-label={`${hours} hours, ${minutes} minutes, ${seconds} seconds`}>
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </span>
  );
}
