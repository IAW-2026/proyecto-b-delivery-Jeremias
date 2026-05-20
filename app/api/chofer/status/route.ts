import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        canOperate: false,
        isAuthenticated: false,
      },
      { status: 200 }
    );
  }

  try {
    const chofer = await prisma.chofer.findUnique({
      where: { clerkUserId: userId },
      select: {
        idChofer: true,
        estado: true,
        idVehiculo: true,
        idVendedor: true,
      },
    });

    if (!chofer) {
      return NextResponse.json(
        {
          canOperate: false,
          isAuthenticated: true,
          hasProfile: false,
        },
        { status: 200 }
      );
    }

    const isRejected = chofer.estado === "rechazado";
    const isVerified = chofer.idVehiculo !== null && !isRejected;

    return NextResponse.json(
      {
        canOperate: isVerified,
        isAuthenticated: true,
        hasProfile: true,
        isRejected,
        estado: chofer.estado,
        idVehiculo: chofer.idVehiculo,
        idVendedor: chofer.idVendedor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching chofer status:", error);
    return NextResponse.json(
      {
        canOperate: false,
        isAuthenticated: true,
        hasProfile: false,
        error: "Error fetching chofer status",
      },
      { status: 500 }
    );
  }
}
