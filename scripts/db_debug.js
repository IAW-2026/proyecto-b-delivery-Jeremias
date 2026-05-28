const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Listing first 10 pedidos:');
  const pedidos = await prisma.pedido.findMany({ take: 10 });
  console.log(pedidos);

  console.log('\nListing first 10 choferes:');
  const choferes = await prisma.chofer.findMany({ take: 10 });
  console.log(choferes);

  if (pedidos.length > 0 && choferes.length > 0) {
    const pedidoId = pedidos[0].idPedido;
    const choferId = choferes[0].idChofer;
    console.log(`\nAttempting to assign pedido ${pedidoId} to chofer ${choferId}...`);

    const res = await prisma.pedido.updateMany({
      where: { idPedido: pedidoId },
      data: { idChoferAsignado: choferId, estado: 'asignado', assignedAt: new Date(), updatedAt: new Date() },
    });

    console.log('updateMany result:', res);

    const updated = await prisma.pedido.findUnique({ where: { idPedido: pedidoId }, include: { choferAsignado: true } });
    console.log('Updated pedido:', updated);
  } else {
    console.log('No pedidos or no choferes to test assignment.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
