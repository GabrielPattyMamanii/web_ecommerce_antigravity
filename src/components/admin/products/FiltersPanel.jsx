import React, { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import CategorySelect from './CategorySelect';
import { ChevronDown } from 'lucide-react';

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
    const [collapsed, setCollapsed] = useState(false);

    const handleVisiblesChange = (checked) => {
        onSoloVisiblesChange(checked);
        if (checked) onSoloOcultosChange(false);
    };

    const handleOcultosChange = (checked) => {
        onSoloOcultosChange(checked);
        if (checked) onSoloVisiblesChange(false);
    };

    return (
        <div className="bg-card border border-border rounded-lg p-6 mb-6 shadow-md">
            <div
                className="flex justify-between items-center cursor-pointer pb-4 border-b border-border mb-5"
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">🔧</span>
                    <h3 className="text-lg font-semibold text-foreground">Filtros Avanzados</h3>
                </div>
                <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`}
                />
            </div>

            {!collapsed && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Filtro por Categoría */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <span>📁</span>
                                Categoría
                            </label>
                            <CategorySelect
                                value={categoria}
                                onChange={onCategoriaChange}
                                categorias={categorias}
                            />
                        </div>

                        {/* Filtro por Precio */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <span>💰</span>
                                Rango de Precio
                            </label>
                            <div className="p-4 bg-muted/30 border border-border rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-semibold text-primary bg-card px-3 py-1 rounded border border-border">
                                        ${precioRange.min.toLocaleString()}
                                    </span>
                                    <span className="text-sm font-semibold text-primary bg-card px-3 py-1 rounded border border-border">
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
                                        track: { backgroundColor: 'var(--primary)' },
                                        handle: { borderColor: 'var(--primary)', backgroundColor: 'var(--card)' },
                                        rail: { backgroundColor: 'var(--muted)' }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Filtro por Stock */}
                        <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                <span>📦</span>
                                Rango de Stock
                            </label>
                            <div className="p-4 bg-muted/30 border border-border rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-semibold text-primary bg-card px-3 py-1 rounded border border-border">
                                        {stockRange.min}
                                    </span>
                                    <span className="text-sm font-semibold text-primary bg-card px-3 py-1 rounded border border-border">
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
                                        track: { backgroundColor: 'var(--primary)' },
                                        handle: { borderColor: 'var(--primary)', backgroundColor: 'var(--card)' },
                                        rail: { backgroundColor: 'var(--muted)' }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros de Visibilidad */}
                    <div className="flex gap-6 p-4 bg-muted/30 border border-border rounded-lg mb-4">
                        <label className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-card transition-colors">
                            <div
                                className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${soloVisibles
                                        ? 'bg-primary border-primary'
                                        : 'border-border bg-card'
                                    }`}
                                onClick={() => handleVisiblesChange(!soloVisibles)}
                            >
                                {soloVisibles && <span className="text-primary-foreground text-xs">✓</span>}
                            </div>
                            <span className="text-sm font-medium text-foreground select-none">
                                Solo productos visibles en catálogo
                            </span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-card transition-colors">
                            <div
                                className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${soloOcultos
                                        ? 'bg-primary border-primary'
                                        : 'border-border bg-card'
                                    }`}
                                onClick={() => handleOcultosChange(!soloOcultos)}
                            >
                                {soloOcultos && <span className="text-primary-foreground text-xs">✓</span>}
                            </div>
                            <span className="text-sm font-medium text-foreground select-none">
                                Solo productos ocultos del catálogo
                            </span>
                        </label>
                    </div>

                    {/* Botón Limpiar Filtros */}
                    <button
                        className="px-5 py-2 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border-2 border-border rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                        onClick={onLimpiar}
                    >
                        <span>🗑️</span>
                        Limpiar Filtros
                    </button>
                </>
            )}
        </div>
    );
};

export default FiltersPanel;
