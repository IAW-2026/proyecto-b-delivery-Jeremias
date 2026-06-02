export type Pedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono?: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "assigned" | "cancelled" | "delivered";
  id_vendedor: number;
};

export const MOCK_PEDIDOS: Pedido[] = [
  { idPedido: 5, cliente: "Juan García", direccion: "Calle 123, Apto 4", telefono: "1111111", cantBidones: 2, zona: "Palihue", estado: "ready", id_vendedor: 1 },
  { idPedido: 6, cliente: "María López", direccion: "Avenida 456, Casa 2", telefono: "2222222", cantBidones: 3, zona: "Panama", estado: "ready", id_vendedor: 1 },
  { idPedido: 7, cliente: "Carlos Ruiz", direccion: "Calle Principal 789", telefono: "3333333", cantBidones: 1, zona: "12 de Octubre", estado: "ready", id_vendedor: 2 },
  { idPedido: 8, cliente: "Ana Martínez", direccion: "Pasaje San Martín 321", telefono: "4444444", cantBidones: 4, zona: "Alem", estado: "ready", id_vendedor: 2 },
  { idPedido: 9, cliente: "Roberto Díaz", direccion: "Calle Moreno 654", telefono: "5555555", cantBidones: 2, zona: "Palihue", estado: "ready", id_vendedor: 2 },
];

export function getMockPedidos(): Pedido[] {
  return MOCK_PEDIDOS;
}
