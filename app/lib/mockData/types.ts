// Tipos compartidos para el sistema de entregas

export interface Pedido {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "entregado" | "cancelado";
}

export interface Vehiculo {
  idVehiculo: number;
  patente: string;
  tipo: string;
  capacidadBidones: number;
  idVendedor: number;
}

export interface Ruta {
  idRuta: number;
  idChofer: number;
  idVendedor: number;
  idZona: number;
  fecha: Date;
  horaInicio?: Date;
  horaFin?: Date;
  estado: string;
  zona: string;
}

export interface Zona {
  idZona: number;
  nombre: string;
}

export interface Chofer {
  idChofer: number;
  nombre: string;
  telefono: string;
  estado: string;
  idVehiculo: number;
}
