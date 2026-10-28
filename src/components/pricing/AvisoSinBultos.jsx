import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AVISO_SIN_BULTOS } from '../../utils/pricingUtils';

// Etiqueta de aviso: la boleta tiene gastos de envío pero ningún bulto cargado, así que el costo (y el precio
// sugerido) no incluyen el envío. El texto completo está en el tooltip.
export function AvisoSinBultos({ className = '' }) {
    return (
        <span
            title={AVISO_SIN_BULTOS}
            className={`inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ${className}`}
        >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Sin bultos
        </span>
    );
}
