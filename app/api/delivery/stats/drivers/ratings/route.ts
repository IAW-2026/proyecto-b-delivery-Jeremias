import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAdminApiKey } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!validateAdminApiKey(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Record<string, unknown> = {};
  
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
  }

  const drivers = await prisma.chofer.findMany({
    where,
    select: {
      idChofer: true,
      nombre: true,
      _count: {
        select: {
          ratings: true,
        },
      },
      ratings: {
        select: { rating: true },
      },
    },
  });

  const result = drivers.map((driver: {
    idChofer: number;
    nombre: string;
    _count: { ratings: number };
    ratings: Array<{ rating: number }>;
  }) => {
    const ratingSum = driver.ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0);
    const avgRating = driver.ratings.length > 0 ? ratingSum / driver.ratings.length : 0;
    
    return {
      driverId: String(driver.idChofer),
      name: driver.nombre,
      avgRating: Math.round(avgRating * 10) / 10,
      totalRatings: driver._count.ratings,
    };
  });

  return NextResponse.json(result);
}