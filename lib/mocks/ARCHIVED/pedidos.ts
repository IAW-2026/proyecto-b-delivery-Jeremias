export type Pedido = {
  idPedido: number;
  cliente: string;
  direccion: string;
  telefono?: string;
  cantBidones: number;
  zona: string;
  estado: "ready" | "assigned" | "cancelled" | "delivered";
};

export const MOCK_PEDIDOS: Pedido[] = [
  { idPedido: 5, cliente: "Juan García", direccion: "Calle 123, Apto 4", telefono: "1111111", cantBidones: 2, zona: "Palihue", estado: "ready" },
  { idPedido: 6, cliente: "María López", direccion: "Avenida 456, Casa 2", telefono: "2222222", cantBidones: 3, zona: "Panama", estado: "ready" },
  { idPedido: 7, cliente: "Carlos Ruiz", direccion: "Calle Principal 789", telefono: "3333333", cantBidones: 1, zona: "12 de Octubre", estado: "ready" },
  { idPedido: 8, cliente: "Ana Martínez", direccion: "Pasaje San Martín 321", telefono: "4444444", cantBidones: 4, zona: "Alem", estado: "ready" },
  { idPedido: 9, cliente: "Roberto Díaz", direccion: "Calle Moreno 654", telefono: "5555555", cantBidones: 2, zona: "Palihue", estado: "ready" },
];

export function getMockPedidos(): Pedido[] {
  return MOCK_PEDIDOS;
}
