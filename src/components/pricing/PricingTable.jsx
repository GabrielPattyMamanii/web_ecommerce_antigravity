import React, { useMemo, useState, useEffect } from 'react';
import { BrandAccordion } from './BrandAccordion';
import { Search, X, Filter, ChevronDown, Package } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { useLocation } from 'react-router-dom';
import { GlobalPriceSearchResults } from './GlobalPriceSearchResults';

export function PricingTable({ products, settings, users = [], isOldEntrada = false, tandaParametros = {} }) {

    // Filters
    const [filterBrand, setFilterBrand] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterBoleta, setFilterBoleta] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const isMobile = useMobile();
    const location = useLocation();

    // Pre-fill search filter from URL query param ?q= (passed from global price search)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        if (q) {
            setFilterSearch(q);
        }
    }, [location.search]);

    // 1. Get Total Tanda Expenses (not prorated)
    const totalTandaExpense = parseFloat(products.find(p => p.gastos)?.gastos || 0);

    // 2. Group by Brand + Boleta
    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
            const brand = product.marca || 'Sin Marca';
            const key = `${brand}_${product.codigo_boleta || 'sin_boleta'}`;

            if (!acc[key]) {
                acc[key] = {
                    name: brand,
                    boletaCode: product.codigo_boleta || '-',
                    propietario: product.propietario || '',
                    bultosPersonalizados: 0,
                    items: []
                };

                // Look up bultos_personalizados from tanda metadata
                if (tandaParametros?.marcasMetadata) {
                    const meta = product.marca_id
                        ? tandaParametros.marcasMetadata[product.marca_id]
                        : tandaParametros.marcasMetadata[brand];
                    const val = meta?.bultos_personalizados;
                    if (val && parseFloat(val) > 0) {
                        acc[key].bultosPersonalizados = parseFloat(val);
                    }
                }
            }
            // Propietario fallback (in case first row had none)
            if (!acc[key].propietario && product.propietario) {
                acc[key].propietario = product.propietario;
            }
            acc[key].items.push(product);
            return acc;
        }, {});
    }, [products, tandaParametros]);

    // 3. Filter options (derived from groups)
    const allGroups = Object.values(groupedProducts);
    const uniqueBrands = [...new Set(allGroups.map(g => g.name))].sort();
    const uniqueOwners = [...new Set(allGroups.map(g => g.propietario).filter(Boolean))].sort();
    const uniqueBoletas = [...new Set(allGroups.map(g => g.boletaCode).filter(b => b && b !== '-'))].sort();

    // 4. Apply all filters — text search filters items within each group
    const normalizedSearch = filterSearch.trim().toLowerCase();

    const filteredGroups = allGroups
        .map(group => {
            // Apply dropdown filters at the group level
            const matchBrand = filterBrand ? group.name === filterBrand : true;
            const matchOwner = filterOwner ? group.propietario === filterOwner : true;
            const matchBoleta = filterBoleta ? group.boletaCode === filterBoleta : true;
            if (!matchBrand || !matchOwner || !matchBoleta) return null;

            // Apply text search at the item level (by código or nombre)
            const matchedItems = normalizedSearch
                ? group.items.filter(item =>
                    (item.codigo || '').toLowerCase().includes(normalizedSearch) ||
                    (item.producto_titulo || '').toLowerCase().includes(normalizedSearch)
                )
                : group.items;

            if (matchedItems.length === 0) return null;

            return { ...group, items: matchedItems };
        })
        .filter(Boolean);

    const hasFilters = filterBrand || filterOwner || filterBoleta || filterSearch;

    const clearAll = () => {
        setFilterBrand('');
        setFilterOwner('');
        setFilterBoleta('');
        setFilterSearch('');
    };

    if (isMobile) {
        const activeFilterCount = [filterBrand, filterOwner, filterBoleta].filter(Boolean).length;

        return (
            <div className="flex flex-col bg-gray-50 pb-8">
                {/* Sticky filter bar */}
                <div className="bg-white px-4 pt-4 pb-3 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-[#1A1A1A] uppercase tracking-wide">Listado de Marcas</h2>
                        <button
                            onClick={() => setShowFilters(true)}
                            className="relative flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider active:scale-95 transition-all"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filtros
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF5C39] text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Main Search Input */}
                    <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            placeholder="Buscar en TODO el sistema..."
                            className="w-full bg-gray-100 border-none rounded-2xl py-3 pl-11 pr-10 text-[14px] focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400 font-medium text-gray-800"
                        />
                        {filterSearch && (
                            <button
                                onClick={() => setFilterSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 bg-gray-200 hover:bg-gray-300 rounded-full transition-all"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {/* Active chips */}
                    {activeFilterCount > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {filterBrand && (
                                <span className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                    {filterBrand}
                                    <button onClick={() => setFilterBrand('')} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {filterOwner && (
                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                    {filterOwner}
                                    <button onClick={() => setFilterOwner('')} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {filterBoleta && (
                                <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                    Bol: {filterBoleta}
                                    <button onClick={() => setFilterBoleta('')} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Brand cards */}
                <div className="px-4 py-5 space-y-4">
                    {filteredGroups.length === 0 && (!filterSearch || filterSearch.trim().length < 2) ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">Sin resultados con esos filtros</p>
                        </div>
                    ) : (
                        filteredGroups.sort((a, b) => a.name.localeCompare(b.name)).map((group, idx) => {
                            const owner = users.find(u => u.username === group.propietario);
                            const ownerColor = owner ? owner.color : null;
                    const groupOriginalItems = allGroups.find(g => g.name === group.name && g.boletaCode === group.boletaCode)?.items || group.items;
                    return (
                        <BrandAccordion
                            key={`${group.name}_${idx}`}
                            brandName={group.name}
                            boletaCode={group.boletaCode}
                            propietario={group.propietario}
                            ownerColor={ownerColor}
                            products={group.items}
                            allProductsForK={groupOriginalItems}
                            settings={settings}
                            isOldEntrada={isOldEntrada}
                            bultosPersonalizados={group.bultosPersonalizados || 0}
                            isMobile={true}
                            users={users}
                        />
                    );
                        })
                    )}
                    
                    {/* INLINE GLOBAL SEARCH RESULTS */}
                    <GlobalPriceSearchResults 
                        searchTerm={filterSearch} 
                        currentTanda={products[0]?.tanda_nombre} 
                    />
                </div>

                {/* Bottom-sheet Filter Modal */}
                {showFilters && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setShowFilters(false)}>
                        <div
                            className="bg-white rounded-t-[32px] w-full max-w-lg p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[18px] font-black text-[#1A1A1A] uppercase tracking-tight">Filtros</h3>
                                <div className="flex gap-2">
                                    {activeFilterCount > 0 && (
                                        <button onClick={clearAll} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-full text-[11px] font-bold uppercase">Limpiar</button>
                                    )}
                                    <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[{label: 'Marca', value: filterBrand, set: setFilterBrand, options: uniqueBrands, placeholder: 'Todas las Marcas'},
                                  {label: 'Propietario', value: filterOwner, set: setFilterOwner, options: uniqueOwners, placeholder: 'Todos los Propietarios'},
                                  {label: 'N° Boleta', value: filterBoleta, set: setFilterBoleta, options: uniqueBoletas, placeholder: 'Todas las Boletas'}]
                                  .map(({label, value, set, options, placeholder}) => (
                                    <div key={label}>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
                                        <div className="relative">
                                            <select
                                                value={value}
                                                onChange={e => set(e.target.value)}
                                                className="w-full appearance-none bg-gray-100 border-none rounded-2xl py-3.5 px-4 pr-10 text-[15px] font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
                                            >
                                                <option value="">{placeholder}</option>
                                                {options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full mt-6 py-4 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all"
                            >
                                {activeFilterCount > 0 ? `Ver Resultados (${filteredGroups.length})` : 'Ver Todo'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="pb-12">
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center px-1">
                <h3 className="text-xl font-bold text-foreground mb-2 sm:mb-0">Listado de Marcas y Precios</h3>
                <div className="text-sm text-foreground bg-card shadow-sm border border-border px-4 py-2 rounded-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    Gastos Totales Tanda: <span className="font-bold">${totalTandaExpense.toLocaleString('es-AR')}</span>
                    <span className="text-muted-foreground mx-2">|</span>
                    <span className="text-muted-foreground">Aplicado a cada producto en el cálculo</span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6 bg-muted/20 p-4 rounded-xl border border-border flex-wrap">

                {/* Text search — código or nombre */}
                <div className="w-full">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Buscar por Código o Nombre</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            placeholder="Buscar producto en TODO el sistema..."
                            className="w-full pl-9 pr-9 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-medium"
                        />
                        {filterSearch && (
                            <button
                                onClick={() => setFilterSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Marca</label>
                    <select
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={filterBrand}
                        onChange={e => setFilterBrand(e.target.value)}
                    >
                        <option value="">Todas las Marcas</option>
                        {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Propietario</label>
                    <select
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={filterOwner}
                        onChange={e => setFilterOwner(e.target.value)}
                    >
                        <option value="">Todos los Propietarios</option>
                        {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">N° Boleta</label>
                    <select
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={filterBoleta}
                        onChange={e => setFilterBoleta(e.target.value)}
                    >
                        <option value="">Todas las Boletas</option>
                        {uniqueBoletas.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                {hasFilters && (
                    <div className="flex items-end">
                        <button
                            onClick={clearAll}
                            className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-sm font-medium transition-colors"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {filteredGroups.sort((a, b) => a.name.localeCompare(b.name)).map((group, idx) => {
                    const owner = users.find(u => u.username === group.propietario);
                    const ownerColor = owner ? owner.color : null;
                    const groupOriginalItems = allGroups.find(g => g.name === group.name && g.boletaCode === group.boletaCode)?.items || group.items;
                    return (
                        <BrandAccordion
                            key={`${group.name}_${idx}`}
                            brandName={group.name}
                            boletaCode={group.boletaCode}
                            propietario={group.propietario}
                            ownerColor={ownerColor}
                            products={group.items}
                            allProductsForK={groupOriginalItems}
                            settings={settings}
                            isOldEntrada={isOldEntrada}
                            bultosPersonalizados={group.bultosPersonalizados || 0}
                            users={users}
                        />
                    );
                })}

                {/* INLINE GLOBAL SEARCH RESULTS */}
                <GlobalPriceSearchResults 
                    searchTerm={filterSearch} 
                    currentTanda={products[0]?.tanda_nombre} 
                />

                {filteredGroups.length === 0 && (!filterSearch || filterSearch.trim().length < 2) && (
                    <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border text-muted-foreground text-sm">
                        {hasFilters
                            ? 'No se encontraron productos en esta tanda con esos filtros.'
                            : 'No se encontraron marcas con los filtros aplicados.'
                        }
                    </div>
                )}
            </div>
        </div>
    );
}
