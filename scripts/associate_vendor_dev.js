require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const clerkUserId = process.env.DEV_TEST_USER_ID || 'user_3DSoZz9M37XMh3MPSCCyVAOfe7v';
    const res = await prisma.userRole.upsert({
      where: { clerkUserId },
      update: { idVendedor: 999, role: 'logistic_admin', nombreEmpresa: 'AGUASNEARDAS' },
      create: { clerkUserId, idVendedor: 999, role: 'logistic_admin', nombreEmpresa: 'AGUASNEARDAS' },
    });

    console.log('Upserted userRole:', res);
  } catch (err) {
    console.error('Error upserting userRole:', err);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); } catch {};
  }
}

main();
