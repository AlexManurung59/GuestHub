import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const alarm = await prisma.alarmControl.findUnique({
      where: { id: 1 },
      select: { active: true, revision: true, visitorId: true },
    });

    return NextResponse.json(
      alarm ?? { active: false, revision: 0, visitorId: null },
    );
  } catch (error) {
    console.error("GET /api/alarm error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alarm state" },
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
      !("active" in body) ||
      typeof body.active !== "boolean" ||
      !("visitorId" in body) ||
      typeof body.visitorId !== "number" ||
      !Number.isInteger(body.visitorId) ||
      body.visitorId < 1
    ) {
      return NextResponse.json(
        { error: "A boolean active value and positive visitorId are required" },
        { status: 400 },
      );
    }

    const currentAlarm = await prisma.alarmControl.findUnique({
      where: { id: 1 },
      select: { active: true, revision: true, visitorId: true },
    });

    if (
      !body.active &&
      currentAlarm?.active &&
      currentAlarm.visitorId !== body.visitorId
    ) {
      return NextResponse.json(currentAlarm);
    }

    const alarm = await prisma.alarmControl.upsert({
      where: { id: 1 },
      create: {
        active: body.active,
        visitorId: body.active ? body.visitorId : null,
        revision: 1,
      },
      update: {
        active: body.active,
        visitorId: body.active ? body.visitorId : null,
        revision: { increment: 1 },
      },
      select: { active: true, revision: true, visitorId: true },
    });

    return NextResponse.json(alarm);
  } catch (error) {
    console.error("PUT /api/alarm error:", error);
    return NextResponse.json(
      { error: "Failed to update alarm state" },
      { status: 500 },
    );
  }
}
