
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getJakartaDate, getJakartaDateRange } from "@/lib/visitor-date";



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
    const body = await request.json();

    //Validate required field
    if (!body.name) {
      return NextResponse.json(
        {
          error: "Name is required",
        },
        { status: 400 },
      );
    }


    const visitor = await prisma.visitor.create({
      data: {
        name: body.name,
        company: body.company,
        vessel: body.vessel,
        visitorType: body.visitorType,
        rank: body.rank,
        position: body.position,
        phone: body.phone,
        division: body.division,
        purpose: body.purpose,
        pic: body.pic,
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
