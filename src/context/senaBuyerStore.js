import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSenaBuyerStore = create(
    persist(
        (set) => ({
            buyer_name: '',
            buyer_lastname: '',
            buyer_email: '',
            buyer_whatsapp: '',
            delivery_location: '',
            setBuyer: (data) => set({
                buyer_name:        data.buyer_name        || '',
                buyer_lastname:    data.buyer_lastname     || '',
                buyer_email:       data.buyer_email        || '',
                buyer_whatsapp:    data.buyer_whatsapp     || '',
                delivery_location: data.delivery_location  || '',
            }),
        }),
        {
            name: 'sena-buyer-storage',
        }
    )
);
