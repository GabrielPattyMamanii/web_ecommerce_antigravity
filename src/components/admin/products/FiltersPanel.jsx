import React, { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import CategorySelect from './CategorySelect';
import { ChevronUp, ChevronDown, Wrench, Folder, DollarSign, Package, Trash2 } from 'lucide-react';

// Colores del panel — primary rosa del resto de la app + naranja limpio
// (reemplaza el tono marrón/rojizo "secondary" del mockup original de Stitch)
const STITCH_PRIMARY = '#e11d48';   // primary
const STITCH_SECONDARY = '#ea580c'; // orange-600 — combina con el resto de la app

const FiltersPanel = ({
    categoria,
    onCategoriaChange,
    categorias,
    precioRange,
    onPrecioChange,
    stockRange,
    onStockChange,
    soloVisibles,
    onSoloVisiblesChange,
    soloOcultos,
    onSoloOcultosChange,
    onLimpiar
}) => {
    // Collapse by default on mobile screens (width < 768px)
    const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);

    const handleVisiblesChange = (checked) => {
        onSoloVisiblesChange(checked);
        if (checked) onSoloOcultosChange(false);
    };

    const handleOcultosChange = (checked) => {
        onSoloOcultosChange(checked);
        if (checked) onSoloVisiblesChange(false);
    };

    return (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
            <div
                className="flex justify-between items-center cursor-pointer pb-4 border-b border-border mb-5"
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className="flex items-center gap-2.5">
                    <Wrench className="w-5 h-5" style={{ color: STITCH_PRIMARY }} />
                    <h3 className="text-lg font-semibold text-foreground">Filtros Avanzados</h3>
                </div>
                <button
                    title={collapsed ? 'Expandir filtros' : 'Colapsar filtros'}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                    {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
            </div>

            {!collapsed && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Filtro por Categoría */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Folder className="w-4 h-4" style={{ color: STITCH_SECONDARY }} />
                                Categoría
                            </label>
                            <CategorySelect
                                value={categoria}
                                onChange={onCategoriaChange}
                                categorias={categorias}
                            />
                        </div>

                        {/* Filtro por Precio — degradado primary → secondary, igual que en Stitch */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <DollarSign className="w-4 h-4" style={{ color: STITCH_SECONDARY }} />
                                Rango de Precio
                            </label>
                            <div className="p-3 bg-muted/40 border border-border rounded-lg">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="text-xs font-bold bg-card px-2.5 py-1 rounded-md border border-border shadow-sm" style={{ color: STITCH_SECONDARY }}>
                                        ${precioRange.min.toLocaleString()}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">hasta</span>
                                    <span className="text-xs font-bold bg-card px-2.5 py-1 rounded-md border border-border shadow-sm" style={{ color: STITCH_SECONDARY }}>
                                        ${precioRange.max.toLocaleString()}
                                    </span>
                                </div>
                                <Slider
                                    range
                                    min={0}
                                    max={10000}
                                    value={[precioRange.min, precioRange.max]}
                                    onChange={(values) => onPrecioChange({
                                        min: values[0],
                                        max: values[1]
                                    })}
                                    allowCross={false}
                                    styles={{
                                        track: { background: `linear-gradient(to right, ${STITCH_PRIMARY}, ${STITCH_SECONDARY})` },
                                        handle: { borderColor: STITCH_PRIMARY, backgroundColor: 'var(--card)' },
                                        rail: { backgroundColor: 'var(--muted)' }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Filtro por Stock — mismo degradado pero invertido (secondary → primary), igual que en Stitch */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Package className="w-4 h-4" style={{ color: STITCH_SECONDARY }} />
                                Rango de Stock
                            </label>
                            <div className="p-3 bg-muted/40 border border-border rounded-lg">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <span className="text-xs font-bold bg-card px-2.5 py-1 rounded-md border border-border shadow-sm" style={{ color: STITCH_SECONDARY }}>
                                        {stockRange.min}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">hasta</span>
                                    <span className="text-xs font-bold bg-card px-2.5 py-1 rounded-md border border-border shadow-sm" style={{ color: STITCH_SECONDARY }}>
                                        {stockRange.max}
                                    </span>
                                </div>
                                <Slider
                                    range
                                    min={0}
                                    max={1000}
                                    value={[stockRange.min, stockRange.max]}
                                    onChange={(values) => onStockChange({
                                        min: values[0],
                                        max: values[1]
                                    })}
                                    allowCross={false}
                                    styles={{
                                        track: { background: `linear-gradient(to right, ${STITCH_SECONDARY}, ${STITCH_PRIMARY})` },
                                        handle: { borderColor: STITCH_SECONDARY, backgroundColor: 'var(--card)' },
                                        rail: { backgroundColor: 'var(--muted)' }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros de Visibilidad */}
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 bg-muted/40 border border-border rounded-lg mb-4">
                        <label className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-card transition-colors">
                            <div
                                className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all"
                                style={soloVisibles
                                    ? { backgroundColor: STITCH_PRIMARY, borderColor: STITCH_PRIMARY }
                                    : { borderColor: 'var(--border)', backgroundColor: 'var(--card)' }
                                }
                                onClick={() => handleVisiblesChange(!soloVisibles)}
                            >
                                {soloVisibles && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="text-sm font-medium text-foreground select-none">
                                Solo productos visibles en catálogo
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-card transition-colors">
                            <div
                                className="w-5 h-5 border-2 rounded flex items-center justify-center transition-all"
                                style={soloOcultos
                                    ? { backgroundColor: STITCH_PRIMARY, borderColor: STITCH_PRIMARY }
                                    : { borderColor: 'var(--border)', backgroundColor: 'var(--card)' }
                                }
                                onClick={() => handleOcultosChange(!soloOcultos)}
                            >
                                {soloOcultos && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="text-sm font-medium text-foreground select-none">
                                Solo productos ocultos del catálogo
                            </span>
                        </label>
                    </div>

                    {/* Botón Limpiar Filtros — mismo hover a rojo error que en Stitch */}
                    <button
                        className="w-full sm:w-auto px-5 py-3 sm:py-2 bg-transparent text-muted-foreground border-2 border-border rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all mt-6 sm:mt-0 hover:bg-[#ffdad6]/40 hover:text-[#ba1a1a] hover:border-[#ba1a1a]/30 dark:hover:bg-[#ba1a1a]/15"
                        onClick={onLimpiar}
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpiar Filtros
                    </button>
                </>
            )}
        </div>
    );
};

export default FiltersPanel;
