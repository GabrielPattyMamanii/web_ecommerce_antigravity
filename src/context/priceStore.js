import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePriceStore = create(
    persist(
        (set) => ({
            isWholesale: false,
            toggleMode: () => set((state) => ({ isWholesale: !state.isWholesale })),
            setWholesale: (value) => set({ isWholesale: value }),
        }),
        {
            name: 'price-mode-storage',
        }
    )
);
