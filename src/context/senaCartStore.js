import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const itemKey = (item) => `${item.product_source || 'products'}-${item.product_id}`;

export const useSenaCartStore = create(
    persist(
        (set, get) => ({
            items: [],
            addItem: (product, quantity = 1) => {
                const key = itemKey(product);
                const items = get().items;
                const existingItem = items.find((item) => itemKey(item) === key);
                if (existingItem) {
                    set({
                        items: items.map((item) =>
                            itemKey(item) === key
                                ? { ...item, quantity: item.quantity + quantity }
                                : item
                        ),
                    });
                } else {
                    set({ items: [...items, { ...product, quantity }] });
                }
            },
            removeItem: (product) => {
                const key = itemKey(product);
                set({
                    items: get().items.filter((item) => itemKey(item) !== key),
                });
            },
            updateQuantity: (product, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(product);
                    return;
                }
                const key = itemKey(product);
                set({
                    items: get().items.map((item) =>
                        itemKey(item) === key ? { ...item, quantity } : item
                    ),
                });
            },
            clearCart: () => set({ items: [] }),
            totalQuantity: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
        }),
        {
            name: 'sena-cart-storage',
        }
    )
);
