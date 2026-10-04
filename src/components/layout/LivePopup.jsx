import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function LivePopup() {
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.pathname.startsWith('/live')) return;

        supabase
            .from('site_config')
            .select('live_products_enabled')
            .single()
            .then(({ data }) => {
                if (data?.live_products_enabled) setVisible(true);
            })
            .catch((error) => console.error('Error fetching live flag:', error));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!visible) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [visible]);

    const dismiss = () => {
        setVisible(false);
    };

    const goToLive = () => {
        dismiss();
        navigate('/live');
    };

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <button
                    onClick={dismiss}
                    aria-label="Cerrar"
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="bg-gradient-to-r from-red-500 to-pink-600 px-8 py-8 text-white text-center">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                        <Radio className="w-8 h-8 animate-pulse" />
                    </div>
                    <p className="font-nunito font-extrabold text-2xl tracking-tight">¡Estamos en vivo!</p>
                </div>

                <div className="px-8 py-6 text-center">
                    <p className="text-base text-gray-600">
                        Ahora mismo estamos mostrando productos en vivo. Tocá el botón para ver todo lo que estamos ofreciendo en este momento.
                    </p>

                    <button
                        onClick={goToLive}
                        className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25 text-base"
                    >
                        <Radio className="w-5 h-5" />
                        Ver productos en vivo
                    </button>
                </div>
            </div>
        </div>
    );
}
