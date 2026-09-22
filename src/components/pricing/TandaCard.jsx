import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, Archive, ChevronRight } from 'lucide-react';

export function TandaCard({ tanda }) {
    // Format date — old_entradas has tanda_fecha but it's the import date, not necessarily meaningful
    // Guard against null/undefined to prevent "Invalid Date"
    const formattedDate = tanda.tanda_fecha
        ? new Date(tanda.tanda_fecha).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
        : 'Archivo histórico';

    const isOld = tanda.isOldEntrada;

    return (
        <Link
            to={`/admin/precio-venta-sugerido/${encodeURIComponent(tanda.tanda_nombre)}`}
            className={`bg-card rounded-2xl border p-5 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between group ${
                isOld
                    ? 'border-amber-200/80 hover:border-amber-300 dark:border-amber-900/40'
                    : 'border-border hover:border-orange-200 dark:hover:border-orange-900/40'
            }`}
        >
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isOld
                            ? 'bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white dark:bg-amber-950/30 dark:border-amber-900/40'
                            : 'bg-orange-50 border-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-950/30 dark:border-orange-900/40'
                    }`}>
                        {isOld ? <Archive className="w-5 h-5" /> : <Package className="w-5 h-5" strokeWidth={1.8} />}
                    </div>
                    <div className="space-y-1 overflow-hidden min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-foreground text-sm tracking-tight uppercase leading-snug truncate">
                                {tanda.tanda_nombre}
                            </h3>
                            {isOld && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-extrabold tracking-wide uppercase shrink-0">
                                    Archivo
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formattedDate}</span>
                        </div>
                    </div>
                </div>

                {/* Metrics Mini Table */}
                <div className={`rounded-xl p-3 grid grid-cols-3 text-center divide-x ${
                    isOld
                        ? 'bg-amber-50/40 border border-amber-100/80 divide-amber-200/60 dark:bg-amber-950/10 dark:border-amber-900/30 dark:divide-amber-900/30'
                        : 'bg-muted/40 border border-border divide-border'
                }`}>
                    <div>
                        <span className="text-[11px] font-semibold text-muted-foreground block">Marcas</span>
                        <span className="text-base font-extrabold text-foreground">{tanda.marcas_count}</span>
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold text-muted-foreground block">Prods</span>
                        <span className="text-base font-extrabold text-foreground">{tanda.productos}</span>
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold text-muted-foreground block">Docenas</span>
                        <span className={`text-base font-extrabold ${isOld ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {tanda.total_docenas}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer CTA */}
            <span className="mt-5 w-full py-2.5 px-4 rounded-xl bg-orange-600 group-hover:bg-orange-700 text-white text-xs font-bold shadow-sm shadow-orange-600/10 transition-all flex items-center justify-center gap-1.5">
                Ver Precios
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    );
}
