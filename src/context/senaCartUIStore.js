import { create } from 'zustand';

export const useSenaCartUIStore = create((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}));
