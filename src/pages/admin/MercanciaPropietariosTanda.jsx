import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Users, ChevronDown, Package, Layers, Calendar } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

export function MercanciaPropietariosTanda() {
    const { tanda } = useParams();
    const tandaName = decodeURIComponent(tanda);
    const isMobile = useMobile();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tree, setTree] = useState({});
    const [propietarios, setPropietarios] = useState([]);
    const [filterPropietario, setFilterPropietario] = useState('');
    const [tandaInfo, setTandaInfo] = useState({ fecha: null, totalProductos: 0, totalDocenas: 0 });

    useEffect(() => {
        fetchData();
    }, [tandaName]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: entradas, error } = await supabase
                .from('entradas')
                .select('tanda_nombre, tanda_fecha, propietario, propietario_producto, codigo_boleta, codigo, marca, producto_titulo, cantidad_docenas, precio_docena')
                .eq('tanda_nombre', tandaName)
                .order('marca', { ascending: true });

            if (error) throw error;

            const allProps = new Set();
            const built = {};
            let totalP = 0;
            let totalD = 0;
            let fecha = null;

            (entradas || []).forEach(e => {
                const owner = e.propietario_producto?.trim() || e.propietario?.trim() || '';
                if (!owner) return;
                if (!fecha && e.tanda_fecha) fecha = e.tanda_fecha;

                allProps.add(owner);
                const boleta = e.codigo_boleta || 'Sin boleta';

                if (!built[owner]) built[owner] = {};
                if (!built[owner][boleta]) built[owner][boleta] = [];
                built[owner][boleta].push(e);
                totalP += 1;
                totalD += e.cantidad_docenas || 0;
            });

            setPropietarios([...allProps].sort());
            setTree(built);
            setTandaInfo({ fecha, totalProductos: totalP, totalDocenas: totalD });
        } catch (error) {
            console.error('Error fetching tanda data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOwners = filterPropietario
        ? Object.keys(tree).filter(o => o === filterPropietario).sort()
        : Object.keys(tree).sort();

    if (isMobile) {
        return (
            <div className="flex flex-col min-h-screen bg-gray-50 pb-8">
                <header className="bg-white px-5 pt-6 pb-4 sticky top-0 z-20 border-b border-gray-100">
                    <button
                        onClick={() => navigate('/admin/mercancia/propietarios')}
                        className="flex items-center gap-1.5 text-sm text-[#1A1A1A] mb-3"
                    >
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-[#EEF2FF] rounded-2xl flex items-center justify-center text-[#4B6BFB]">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-[18px] font-black text-[#1A1A1A] uppercase tracking-tight">{tandaName}</h1>
                            {tandaInfo.fecha && (
                                <div className="flex items-center gap-1 text-[#8E8E93] mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    <span className="text-[11px] font-bold uppercase tracking-widest">
                                        {new Date(tandaInfo.fecha).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <select
                        className="w-full bg-gray-100 border-none rounded-2xl py-3.5 px-4 text-[15px] font-bold focus:ring-2 focus:ring-blue-500"
                        value={filterPropietario}
                        onChange={(e) => setFilterPropietario(e.target.value)}
                    >
                        <option value="">Todos los propietarios</option>
                        {propietarios.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </header>

                {/* Summary */}
                <div className="px-4 pt-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-white rounded-2xl p-3 text-center border border-gray-100">
                            <span className="block text-[10px] font-bold text-[#4B6BFB] uppercase tracking-wider mb-1">Propietarios</span>
                            <span className="text-lg font-black text-[#4B6BFB]">{propietarios.length}</span>
                        </div>
                        <div className="bg-white rounded-2xl p-3 text-center border border-gray-100">
                            <span className="block text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider mb-1">Productos</span>
                            <span className="text-lg font-black text-[#7C3AED]">{tandaInfo.totalProductos}</span>
                        </div>
                        <div className="bg-white rounded-2xl p-3 text-center border border-gray-100">
                            <span className="block text-[10px] font-bold text-[#FF5C39] uppercase tracking-wider mb-1">Docenas</span>
                            <span className="text-lg font-black text-[#FF5C39]">{tandaInfo.totalDocenas}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 px-4 pb-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Cargando...</span>
                        </div>
                    ) : filteredOwners.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No se encontraron propietarios</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOwners.map(owner => (
                                <OwnerSectionMobile key={owner} owner={owner} boletas={tree[owner]} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => navigate('/admin/mercancia/propietarios')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a Tandas
                </button>
            </div>

            {/* Header */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary text-primary-foreground rounded-lg">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground uppercase">{tandaName}</h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {tandaInfo.fecha && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" /> {new Date(tandaInfo.fecha).toLocaleDateString()}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" /> {propietarios.length} propietarios
                            </span>
                            <span className="flex items-center gap-1">
                                <Package className="w-4 h-4" /> {tandaInfo.totalProductos} productos
                            </span>
                        </div>
                    </div>
                </div>

                <div className="min-w-[250px]">
                    <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Filtrar Propietario</label>
                    <select
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={filterPropietario}
                        onChange={(e) => setFilterPropietario(e.target.value)}
                    >
                        <option value="">Todos los propietarios</option>
                        {propietarios.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando datos...</div>
            ) : filteredOwners.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron propietarios en esta tanda.
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredOwners.map(owner => (
                        <OwnerSection key={owner} owner={owner} boletas={tree[owner]} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Desktop Components ─── */

function OwnerSection({ owner, boletas }) {
    const [expanded, setExpanded] = useState(true);
    const boletaKeys = Object.keys(boletas).sort();
    const allProducts = Object.values(boletas).flat();
    const totalProducts = allProducts.length;
    const totalDocenas = allProducts.reduce((s, p) => s + (p.cantidad_docenas || 0), 0);
    const totalValue = allProducts.reduce((s, p) => s + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0)), 0);

    const marcaTotals = {};
    allProducts.forEach(p => {
        const marca = p.marca || 'Sin marca';
        if (!marcaTotals[marca]) marcaTotals[marca] = { docenas: 0, valor: 0 };
        marcaTotals[marca].docenas += p.cantidad_docenas || 0;
        marcaTotals[marca].valor += (p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0);
    });

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <button
                className="w-full px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-border flex justify-between items-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-200 uppercase">{owner}</h2>
                        <span className="text-xs text-blue-700 dark:text-blue-300">
                            {totalProducts} productos - {boletaKeys.length} boleta(s) - {totalDocenas} docenas
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        ${totalValue.toLocaleString('es-AR')}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-blue-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <>
                    <div className="px-6 py-3 bg-muted/20 border-b border-border flex flex-wrap gap-3">
                        {Object.entries(marcaTotals).sort(([a], [b]) => a.localeCompare(b)).map(([marca, { docenas, valor }]) => (
                            <div key={marca} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
                                <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase">{marca}</span>
                                <span className="text-[10px] text-muted-foreground">{docenas} doc.</span>
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">${valor.toLocaleString('es-AR')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="divide-y divide-border">
                        {boletaKeys.map(boleta => (
                            <BoletaSection key={boleta} boleta={boleta} products={boletas[boleta]} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function BoletaSection({ boleta, products }) {
    const marcas = [...new Set(products.map(p => p.marca))].sort();

    return (
        <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Boleta:</span>
                <span className="font-mono text-sm font-bold text-foreground bg-muted px-2 py-0.5 rounded">{boleta}</span>
                <span className="text-xs text-muted-foreground">({products.length} productos)</span>
            </div>

            {marcas.map(marca => {
                const marcaProducts = products.filter(p => p.marca === marca);
                return (
                    <div key={marca} className="mb-4 last:mb-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wide">{marca}</span>
                            <span className="text-[10px] text-muted-foreground">({marcaProducts.length})</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-xs uppercase text-muted-foreground border-b border-border">
                                        <th className="text-left py-1.5 pr-4">Código</th>
                                        <th className="text-left py-1.5 pr-4">Producto</th>
                                        <th className="text-center py-1.5 pr-4">Docenas</th>
                                        <th className="text-right py-1.5">Precio Doc.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {marcaProducts.map((prod, i) => (
                                        <tr key={prod.id || i} className="hover:bg-muted/10">
                                            <td className="py-2 pr-4 font-mono text-xs text-foreground">{prod.codigo || '—'}</td>
                                            <td className="py-2 pr-4 text-foreground">{prod.producto_titulo || 'Sin nombre'}</td>
                                            <td className="py-2 pr-4 text-center font-bold">{prod.cantidad_docenas || 0}</td>
                                            <td className="py-2 text-right text-muted-foreground">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Mobile Components ─── */

function OwnerSectionMobile({ owner, boletas }) {
    const [expanded, setExpanded] = useState(true);
    const boletaKeys = Object.keys(boletas).sort();
    const allProducts = Object.values(boletas).flat();
    const totalProducts = allProducts.length;
    const totalValue = allProducts.reduce((s, p) => s + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0)), 0);

    const marcaTotals = {};
    allProducts.forEach(p => {
        const marca = p.marca || 'Sin marca';
        if (!marcaTotals[marca]) marcaTotals[marca] = { docenas: 0, valor: 0 };
        marcaTotals[marca].docenas += p.cantidad_docenas || 0;
        marcaTotals[marca].valor += (p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0);
    });

    return (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
                className="w-full px-5 py-4 flex justify-between items-center active:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#EEF2FF] rounded-2xl flex items-center justify-center text-[#4B6BFB]">
                        <Users className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-black text-[#1A1A1A] text-[15px] uppercase tracking-tight">{owner}</h3>
                        <p className="text-[11px] text-[#8E8E93] font-bold">{totalProducts} prod. - {boletaKeys.length} boleta(s)</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[14px] font-black text-green-600">${totalValue.toLocaleString('es-AR')}</span>
                    <ChevronDown className={`w-5 h-5 text-[#8E8E93] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {/* Totales por marca */}
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(marcaTotals).sort(([a], [b]) => a.localeCompare(b)).map(([marca, { docenas, valor }]) => (
                            <div key={marca} className="bg-[#FEF1EC] rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-[#FF5C39] uppercase">{marca}</span>
                                <span className="text-[10px] text-[#8E8E93]">{docenas}d.</span>
                                <span className="text-[11px] font-black text-green-600">${valor.toLocaleString('es-AR')}</span>
                            </div>
                        ))}
                    </div>
                    {boletaKeys.map(boleta => (
                        <BoletaSectionMobile key={boleta} boleta={boleta} products={boletas[boleta]} />
                    ))}
                </div>
            )}
        </div>
    );
}

function BoletaSectionMobile({ boleta, products }) {
    const marcas = [...new Set(products.map(p => p.marca))].sort();

    return (
        <div className="bg-gray-50 rounded-[14px] p-3">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest">Boleta:</span>
                <span className="font-mono text-[12px] font-black text-[#1A1A1A] bg-white px-2 py-0.5 rounded-lg border border-gray-100">{boleta}</span>
            </div>

            {marcas.map(marca => {
                const marcaProducts = products.filter(p => p.marca === marca);
                return (
                    <div key={marca} className="mb-2 last:mb-0">
                        <span className="text-[10px] font-black text-[#FF5C39] uppercase tracking-widest block mb-1">{marca}</span>
                        {marcaProducts.map((prod, i) => (
                            <div key={prod.id || i} className="flex items-start justify-between py-1.5 border-b border-gray-100 last:border-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{prod.producto_titulo || 'Sin nombre'}</p>
                                    <p className="text-[10px] text-[#8E8E93] font-bold">Cód: {prod.codigo || '—'}</p>
                                </div>
                                <div className="text-right ml-2">
                                    <p className="text-[12px] font-black text-[#1A1A1A]">{prod.cantidad_docenas || 0} doc.</p>
                                    <p className="text-[10px] text-[#8E8E93]">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}
