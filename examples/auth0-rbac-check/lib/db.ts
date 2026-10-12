// Stand-in for a real database client.
export type User = { id: string; email: string; name: string };
export type Order = { id: string; userId: string; total: number };

export const db = {
  users: {
    findById: async (id: string): Promise<User | null> => ({ id, email: "a@b.c", name: "Ana" }),
    list: async (): Promise<User[]> => [],
    delete: async (id: string): Promise<void> => void id,
  },
  orders: {
    findById: async (id: string): Promise<Order | null> => ({ id, userId: "u1", total: 4200 }),
  },
};
