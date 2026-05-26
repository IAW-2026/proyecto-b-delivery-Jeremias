export type Pedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "en_camino" | "entregado" | "cancelado";
};

export type Vehiculo = {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
};

export type Ruta = {
  idRuta: number;
  idChofer: number;
  idVendedor: number;
  idZona: number;
  fecha: Date;
  horaInicio?: Date;
  horaFin?: Date;
  estado: string;
  zona: string;
};

export type Zona = {
  idZona: number;
  nombre: string;
};

export type Chofer = {
  idChofer: number;
  nombre: string;
  telefono: string;
  estado: string;
  idVehiculo: number;
};

export type ChoferOnboardingProfile = {
  idChofer: number;
  nombre: string;
  telefono: string;
  estado: string;
  idVendedor: number;
  idVehiculo: number | null;
  vehiculo?: {
    patente: string;
    tipo: string;
  } | null;
};

export type ChoferProfileMock = {
  nombre: string;
  apellido: string;
  telefono: string;
  disponible: boolean;
  cbuCvu: string;
  alias: string;
  cuilCuit: string;
};

export type VendorMock = {
  id_vendedor: number;
  nombre: string;
  descripcion: string;
  direccion: string;
};

export const choferActual: Chofer = {
  idChofer: 1,
  nombre: "Juan Pérez",
  telefono: "1234567890",
  estado: "activo",
  idVehiculo: 1,
};

export const vehiculoAsignado: Vehiculo = {
  idVehiculo: 1,
  patente: "ABC123",
  tipo: "Furgón",
  capacidadBidones: 50,
  idVendedor: 1,
};

export const vendorsMockeados: VendorMock[] = [
  {
    id_vendedor: 1,
    nombre: "Distribuciones Norte",
    descripcion: "Distribuidor mayorista de Aguas",
    direccion: "Av. Siempre Viva 742, Ciudad",
  },
  {
    id_vendedor: 2,
    nombre: "Suministros del Sur",
    descripcion: "Proveedor Agua",
    direccion: "Calle Falsa 123, Pueblo",
  },
];

export const choferActivoMock: ChoferOnboardingProfile = {
  idChofer: 1,
  nombre: "Juan Pérez",
  telefono: "1234567890",
  estado: "activo",
  idVendedor: 1,
  idVehiculo: 1,
  vehiculo: {
    patente: "ABC123",
    tipo: "Furgón",
  },
};

export const choferPendienteMock: ChoferOnboardingProfile = {
  idChofer: 2,
  nombre: "Juan Pérez",
  telefono: "1234567890",
  estado: "pendiente",
  idVendedor: 1,
  idVehiculo: null,
  vehiculo: null,
};

export const perfilChoferMock: ChoferProfileMock = {
  nombre: "Juan",
  apellido: "Pérez",
  telefono: "1234567890",
  disponible: true,
  cbuCvu: "0000003100012345678901",
  alias: "juan.perez.mp",
  cuilCuit: "20-12345678-9",
};

export const zonas: Zona[] = [
  { idZona: 1, nombre: "Palihue" },
  { idZona: 2, nombre: "12 de Octubre" },
  { idZona: 3, nombre: "Centro" },
];

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

export const getTotalBidones = (pedidos: Pedido[]): number => {
  return pedidos.reduce((sum, pedido) => sum + pedido.cantBidones, 0);
};

export const getBidonesDisponibles = (pedidos: Pedido[], capacidad: number): number => {
  const totalUsado = getTotalBidones(pedidos);
  return capacidad - totalUsado;
};

export const getCantidadPedidos = (pedidos: Pedido[]): number => {
  return pedidos.length;
};
