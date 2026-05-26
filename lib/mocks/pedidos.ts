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
  { idPedido: 1, cliente: "Juan García", direccion: "Calle 123", telefono: "1111111", cantBidones: 2, zona: "Centro", estado: "ready" },
  { idPedido: 2, cliente: "María López", direccion: "Avenida 456", telefono: "2222222", cantBidones: 3, zona: "Centro", estado: "ready" },
  { idPedido: 3, cliente: "Carlos Ruiz", direccion: "Calle Principal 789", telefono: "3333333", cantBidones: 1, zona: "Palihue", estado: "assigned" },
];

export function getMockPedidos(): Pedido[] {
  return MOCK_PEDIDOS;
}
