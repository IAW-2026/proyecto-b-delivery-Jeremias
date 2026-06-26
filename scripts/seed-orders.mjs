/**
 * Script para poblar pedidos de prueba directamente en la base de datos.
 * Uso: node scripts/seed-orders.mjs
 * No requiere que el servidor de Next.js esté corriendo.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MOCK_PEDIDOS = [
  {
    id_pedido_externo: 2001,
    id_vendedor: 1,
    cliente: "Juan García",
    direccion: "Calle 123, Apto 4",
    telefono: "1111111",
    cant_bidones: 2,
    zona: "Palihue",
  },
  {
    id_pedido_externo: 2002,
    id_vendedor: 1,
    cliente: "María López",
    direccion: "Avenida 456, Casa 2",
    telefono: "2222222",
    cant_bidones: 3,
    zona: "Panama",
  },
  {
    id_pedido_externo: 2003,
    id_vendedor: 2,
    cliente: "Carlos Ruiz",
    direccion: "Calle Principal 789",
    telefono: "3333333",
    cant_bidones: 1,
    zona: "12 de Octubre",
  },
  {
    id_pedido_externo: 2004,
    id_vendedor: 2,
    cliente: "Ana Martínez",
    direccion: "Pasaje San Martín 321",
    telefono: "4444444",
    cant_bidones: 4,
    zona: "Alem",
  },
  {
    id_pedido_externo: 2005,
    id_vendedor: 2,
    cliente: "Roberto Díaz",
    direccion: "Calle Moreno 654",
    telefono: "5555555",
    cant_bidones: 2,
    zona: "Palihue",
  },
];

async function main() {
  console.log(`Insertando ${MOCK_PEDIDOS.length} pedidos en la base de datos...`);

  const results = [];

  for (const pedido of MOCK_PEDIDOS) {
    const idPedidoExterno = pedido.id_pedido_externo;
    const idVendedor = pedido.id_vendedor;
    const cliente = pedido.cliente.trim();
    const direccion = pedido.direccion.trim();
    const telefono = pedido.telefono ? pedido.telefono.trim() : null;
    const cantBidones = pedido.cant_bidones;
    const zona = pedido.zona.trim();

    const existing = await prisma.pedido.findFirst({
      where: { idVendedor, idPedidoExterno },
    });

    if (existing) {
      await prisma.pedido.update({
        where: { idPedido: existing.idPedido },
        data: {
          cliente,
          direccion,
          telefono,
          cantBidones,
          zona,
          updatedAt: new Date(),
        },
      });
      results.push({
        idPedido: existing.idPedido,
        idPedidoExterno,
        idVendedor,
        created: false,
      });
    } else {
      const created = await prisma.pedido.create({
        data: {
          idVendedor,
          idPedidoExterno,
          cliente,
          direccion,
          telefono,
          cantBidones,
          zona,
          estado: "ready",
        },
      });
      results.push({
        idPedido: created.idPedido,
        idPedidoExterno,
        idVendedor,
        created: true,
      });
    }
  }

  console.log(`\n✅ ${results.length} pedidos procesados correctamente.`);
  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error("\n❌ Error al insertar pedidos:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
