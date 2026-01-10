import React from 'react';
import { X } from 'lucide-react';

export function PromoBanner() {
    const [isVisible, setIsVisible] = React.useState(true);

    if (!isVisible) return null;

    return (
        <div className="bg-black text-white text-center py-2.5 px-4 text-sm relative">
            <p className="font-normal">
                Regístrate y obtén 20% de descuento en tu primer pedido.{' '}
                <a href="#" className="underline font-medium hover:text-gray-300 transition-colors">
                    Regístrate Ahora
                </a>
            </p>
            <button
                onClick={() => setIsVisible(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                aria-label="Cerrar banner"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
