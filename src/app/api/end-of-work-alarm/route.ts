
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

type AlarmAction = "activate" | "stop";

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
}

export async function GET() {
  try {
    const alarm = await prisma.endOfWorkAlarm.findUnique({
      where: { id: 1 },
    });

    return NextResponse.json(
      alarm ?? {
        active: false,
        alarmDate: null,
        dismissedDate: null,
        revision: 0,
      },
    );
  } catch (error) {
    console.error("GET /api/end-of-work-alarm:", error);

    return NextResponse.json(
      { error: "Failed to fetch end-of-work alarm" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("action" in body) ||
      (body.action !== "activate" && body.action !== "stop") ||
      !("date" in body) ||
      !isValidDate(body.date)
    ) {
      return NextResponse.json(
        { error: "A valid action and YYYY-MM-DD date are required" },
        { status: 400 },
      );
    }

    const action: AlarmAction = body.action;
    const date = body.date;

    const current = await prisma.endOfWorkAlarm.findUnique({
      where: { id: 1 },
    });

    // Avoid incrementing revision on every browser poll.
    if (
      action === "activate" &&
      current?.active &&
      current.alarmDate === date
    ) {
      return NextResponse.json(current);
    }

    if (
      action === "stop" &&
      !current?.active &&
      current?.dismissedDate === date
    ) {
      return NextResponse.json(current);
    }

    const alarm = await prisma.endOfWorkAlarm.upsert({
      where: { id: 1 },
      create: {
        active: action === "activate",
        alarmDate: action === "activate" ? date : null,
        dismissedDate: action === "stop" ? date : null,
        revision: 1,
      },
      update: {
        active: action === "activate",
        alarmDate:
          action === "activate" ? date : current?.alarmDate,
        dismissedDate:
          action === "stop" ? date : current?.dismissedDate,
        revision: { increment: 1 },
      },
    });

    return NextResponse.json(alarm);
  } catch (error) {
    console.error("PUT /api/end-of-work-alarm:", error);

    return NextResponse.json(
      { error: "Failed to update end-of-work alarm" },
      { status: 500 },
    );
  }
}
