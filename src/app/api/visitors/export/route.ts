import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "../../../../../lib/prisma";

export async function GET() {
  try {
    // Get visitor data directly from MySQL through Prisma
    const visitors = await prisma.visitor.findMany({
      orderBy: {
        id: "asc",
      },
    });

    // Convert database data into Excel-friendly data
    const excelData = visitors.map((visitor) => ({
      ID: visitor.id,
      Name: visitor.name,
      Company: visitor.company ?? "",
      Vessel: visitor.vessel ?? "",
      Phone: visitor.phone ?? "",
      Division: visitor.division ?? "",
      PIC: visitor.pic ?? "",
      Purpose: visitor.purpose ?? "",

      "Check In": visitor.check_in
        ? new Date(visitor.check_in).toLocaleString("en-GB")
        : "",

      "Check Out": visitor.check_out
        ? new Date(visitor.check_out).toLocaleString("en-GB")
        : "",

      Status: visitor.status,

      "Created At": visitor.created_at
        ? new Date(visitor.created_at).toLocaleString("en-GB")
        : "",
    }));

    // Create Excel worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Visitors"
    );

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

        "Content-Disposition":
          'attachment; filename="visitor-data.xlsx"',
      },
    });
  } catch (error) {
    console.error("GET /api/visitors/export error:", error);

    return NextResponse.json(
      {
        message: "Failed to export visitor data",
      },
      {
        status: 500,
      }
    );
  }
}