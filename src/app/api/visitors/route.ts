
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getJakartaDate, getJakartaDateRange } from "@/lib/visitor-date";
import { scrollRank } from "@/data/scroll";



export async function GET(request: Request) {
  try {
    const requestedDate =
      new URL(request.url).searchParams.get("date") ?? "today";
    const date = requestedDate === "today" ? getJakartaDate() : requestedDate;
    const dateRange =
      date === "all" ? null : getJakartaDateRange(date);

    if (date !== "all" && !dateRange) {
      return NextResponse.json(
        { error: "Date must be today, all, or a valid YYYY-MM-DD date" },
        { status: 400 },
      );
    }

    const visitors = await prisma.visitor.findMany({
      ...(dateRange ? { where: { created_at: dateRange } } : {}),
      orderBy: {
        id: "asc", // DARI ATAS KE BAWAH SESUAI
      },
    });
    return NextResponse.json(visitors);
  } catch (error) {
    console.error("GET/api/visitors error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch visitors",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}


export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    const allowedStatuses=[
      "Waiting",
      "Meeting",
      "Completed",
      "Cancelled",
    ]
    
    if (!id || !status) {
      return NextResponse.json(
        { error: "ID and status are required" },
        { status: 400 },
      );
    }

if(!allowedStatuses.includes(status)){
  return NextResponse.json(
    {
      error:"Invalid visitor status",
    },
    {status:400},
  )
}

    const visitor = await prisma.visitor.update({
      where: { id: Number(id) },
      data: { status },
    });
    return NextResponse.json(visitor);
  } catch (error) {
    console.error("PUT/api/visitors error:", error);
    return NextResponse.json(
      {
        error: "Failed to update visitor",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}


export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "A visitor object is required" },
        { status: 400 },
      );
    }

    const visitorInput = body as Record<string, unknown>;
    const textFields = [
      "name",
      "company",
      "vessel",
      "phone",
      "division",
      "purpose",
      "pic",
      "visitorType",
      "rank",
      "position",
    ] as const;
    const hasInvalidTextField = textFields.some((field) => {
      const value = visitorInput[field];
      return value !== undefined && value !== null && typeof value !== "string";
    });

    if (hasInvalidTextField) {
      return NextResponse.json(
        { error: "Visitor fields must be strings" },
        { status: 400 },
      );
    }

    //Validate required field
    if (typeof visitorInput.name !== "string" || !visitorInput.name) {
      return NextResponse.json(
        {
          error: "Name is required",
        },
        { status: 400 },
      );
    }

    const visitorType = visitorInput.visitorType;
    const rank = visitorInput.rank;
    const position = visitorInput.position;
    if (visitorType !== undefined) {
      if (visitorType !== "SEAFARER" && visitorType !== "GUEST") {
        return NextResponse.json(
          { error: "Visitor type must be SEAFARER or GUEST" },
          { status: 400 },
        );
      }

      if (visitorType === "SEAFARER") {
        if (
          typeof rank !== "string" ||
          !scrollRank.includes(rank.toUpperCase())
        ) {
          return NextResponse.json(
            { error: "A valid seafarer rank is required" },
            { status: 400 },
          );
        }
        if (
          rank.toUpperCase() === "OTHERS" &&
          (typeof position !== "string" || !position.trim())
        ) {
          return NextResponse.json(
            { error: "Position is required when rank is OTHERS" },
            { status: 400 },
          );
        }
        if (
          rank.toUpperCase() !== "OTHERS" &&
          typeof position === "string" &&
          position.trim()
        ) {
          return NextResponse.json(
            { error: "Position is only accepted when rank is OTHERS" },
            { status: 400 },
          );
        }
      } else if (typeof position !== "string" || !position.trim()) {
        return NextResponse.json(
          { error: "Position is required for guests" },
          { status: 400 },
        );
      } else if (typeof rank === "string" && rank.trim()) {
        return NextResponse.json(
          { error: "Guests must not provide a seafarer rank" },
          { status: 400 },
        );
      }
    } else if (rank !== undefined || position !== undefined) {
      return NextResponse.json(
        { error: "Visitor type is required with rank or position" },
        { status: 400 },
      );
    }

    const uppercaseField = (
      field: (typeof textFields)[number],
    ): string | null | undefined => {
      const value = visitorInput[field];
      if (value === undefined || value === null) {
        return value;
      }

      if (typeof value !== "string") {
        throw new TypeError(`Visitor field "${field}" must be a string`);
      }

      return value.toUpperCase();
    };

    const visitor = await prisma.visitor.create({
      data: {
        name: visitorInput.name.toUpperCase(),
        company:
          visitorType === "SEAFARER"
            ? null
            : uppercaseField("company"),
        vessel:
          visitorType === "SEAFARER" || visitorType === "GUEST"
            ? null
            : uppercaseField("vessel"),
        phone: uppercaseField("phone"),
        division: uppercaseField("division"),
        purpose: uppercaseField("purpose"),
        pic: uppercaseField("pic"),
        visitorType:
          visitorType === "SEAFARER" || visitorType === "GUEST"
            ? visitorType
            : null,
        rank: visitorType === "SEAFARER" ? uppercaseField("rank") : null,
        position:
          visitorType === "GUEST" ||
          (visitorType === "SEAFARER" &&
            typeof rank === "string" &&
            rank.toUpperCase() === "OTHERS")
            ? uppercaseField("position")
            : null,
        check_in: new Date(),
        status: "Waiting",
      },
    });
    return NextResponse.json(visitor, {
      status: 201,
    });
  } catch (error) {
    console.error("POST/api/visitors error:", error);
    return NextResponse.json(
      {
        error: "Failed to create visitor",
        details: error instanceof Error ? error.message : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
