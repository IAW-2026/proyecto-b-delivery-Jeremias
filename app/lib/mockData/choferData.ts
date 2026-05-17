import { Chofer, Vehiculo, Ruta, Pedido, Zona } from "./types";

// Chofer autenticado (simulado)
export const choferActual: Chofer = {
  idChofer: 1,
  nombre: "Juan Pérez",
  telefono: "1234567890",
  estado: "activo",
  idVehiculo: 1,
};

// Vehículo asignado al chofer
export const vehiculoAsignado: Vehiculo = {
  idVehiculo: 1,
  patente: "ABC123",
  tipo: "Furgón",
  capacidadBidones: 50,
  idVendedor: 1,
};

// Zonas disponibles
export const zonas: Zona[] = [
  { idZona: 1, nombre: "Palihue" },
  { idZona: 2, nombre: "12 de Octubre" },
  { idZona: 3, nombre: "Centro" },
];

// Ruta del día actual
export const rutaDelDia: Ruta = {
  idRuta: 101,
  idChofer: 1,
  idVendedor: 1,
  idZona: 1,
  fecha: new Date("2026-05-17"),
  horaInicio: new Date("2026-05-17T08:00:00"),
  horaFin: new Date("2026-05-17T18:00:00"),
  estado: "activa",
  zona: "Palihue",
};

// Pedidos asignados para hoy
export const pedidosDelDia: Pedido[] = [
  {
    idPedido: 5,
    cliente: "Juan García",
    direccion: "Calle 123, Apto 4",
    telefono: "1111111",
    cantBidones: 2,
    zona: "Palihue",
    estado: "ready",
  },
  {
    idPedido: 6,
    cliente: "María López",
    direccion: "Avenida 456, Casa 2",
    telefono: "2222222",
    cantBidones: 3,
    zona: "Palihue",
    estado: "ready",
  },
  {
    idPedido: 7,
    cliente: "Carlos Ruiz",
    direccion: "Calle Principal 789",
    telefono: "3333333",
    cantBidones: 1,
    zona: "Palihue",
    estado: "ready",
  },
  {
    idPedido: 8,
    cliente: "Ana Martínez",
    direccion: "Pasaje San Martín 321",
    telefono: "4444444",
    cantBidones: 4,
    zona: "Palihue",
    estado: "ready",
  },
  {
    idPedido: 9,
    cliente: "Roberto Díaz",
    direccion: "Calle Moreno 654",
    telefono: "5555555",
    cantBidones: 2,
    zona: "Palihue",
    estado: "ready",
  },
];

// Función para obtener total de bidones
export const getTotalBidones = (pedidos: Pedido[]): number => {
  return pedidos.reduce((sum, pedido) => sum + pedido.cantBidones, 0);
};

// Función para obtener disponibilidad de bidones
export const getBidonesDisponibles = (
  pedidos: Pedido[],
  capacidad: number
): number => {
  const totalUsado = getTotalBidones(pedidos);
  return capacidad - totalUsado;
};

// Función para obtener cantidad de pedidos
export const getCantidadPedidos = (pedidos: Pedido[]): number => {
  return pedidos.length;
};
