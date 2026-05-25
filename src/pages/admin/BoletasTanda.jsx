import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    ArrowLeft, Layers, Calendar, Package, ClipboardList, ChevronLeft,
    ShoppingBag, Eye, Plus
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function BoletasTanda() {
    const { tanda } = useParams();
    const navigate = useNavigate();
    const tandaName = decodeURIComponent(tanda);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tandaInfo, setTandaInfo] = useState({ date: null, count: 0 });
    const [users, setUsers] = useState([]);
    // Map of entradaId → catalog_product id (or null)
    const [publishedMap, setPublishedMap] = useState({});

    // Filters
    const [filterBrand, setFilterBrand] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterCode, setFilterCode] = useState('');

    useEffect(() => {
        fetchDetails();
    }, [tandaName]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [entradasRes, usersRes] = await Promise.all([
                supabase
                    .from('entradas')
                    .select('*')
                    .eq('tanda_nombre', tandaName)
                    .order('marca', { ascending: true }),
                supabase
                    .from('app_users')
                    .select('username, color')
            ]);

            const { data, error } = entradasRes;
            const { data: usersData } = usersRes;

            if (error) throw error;

            setProducts(data || []);
            setUsers(usersData || []);

            if (data && data.length > 0) {
                setTandaInfo({
                    date: data[0].tanda_fecha,
                    count: data.length
                });

                // Check which entries already have catalog products
                const ids = data.map(p => p.id);
                const { data: catData } = await supabase
                    .from('catalog_products')
                    .select('id')
                    .in('id', ids);

                if (catData) {
                    const map = {};
                    catData.forEach(cp => { map[cp.id] = true; });
                    setPublishedMap(map);
                }
            }
        } catch (err) {
            console.error('Error fetching tanda detail:', err);
        } finally {
            setLoading(false);
        }
    };

    // --- Filter options ---
    const uniqueBrands = [...new Set(products.map(p => p.marca))].sort();
    const uniqueOwners = [...new Set(products.map(p => p.propietario).filter(Boolean))].sort();
    const uniqueCodes = [...new Set(products.map(p => p.codigo_boleta).filter(Boolean))].sort();

    // --- Filtered products ---
    const filteredProducts = products.filter(p => {
        const matchBrand = filterBrand ? p.marca === filterBrand : true;
        const matchOwner = filterOwner ? p.propietario === filterOwner : true;
        const matchCode = filterCode ? p.codigo_boleta === filterCode : true;
        return matchBrand && matchOwner && matchCode;
    });

    // --- Group by brand + boleta ---
    const brandGroups = Object.values(
        filteredProducts.reduce((acc, prod) => {
            const key = prod.marca_id
                ? prod.marca_id
                : `${prod.marca}_${prod.codigo_boleta || 'sin_boleta'}_${prod.propietario || 'sin_prop'}`;

            if (!acc[key]) {
                acc[key] = {
                    key,
                    name: prod.marca,
                    boleta: prod.codigo_boleta,
                    propietario: prod.propietario || '',
                    items: []
                };
            }
            acc[key].items.push(prod);
            return acc;
        }, {})
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back button */}
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="ghost"
                    className="pl-0 gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/admin/products/boletas')}
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a Boletas Cargadas
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-16">
                    <div className="inline-flex items-center gap-3 text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Cargando detalles...
                    </div>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron registros para esta tanda.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Card — sin gastos totales, sin valor control estimado */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-500 text-white rounded-lg">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{tandaName}</h1>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString('es-AR') : '—'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" /> {tandaInfo.count} productos
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-4 mb-4 bg-muted/20 p-4 rounded-xl border border-border flex-wrap">
                        <div className="flex-1 min-w-[200px]">
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
                        <div className="flex-1 min-w-[200px]">
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
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">N° Boleta</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterCode}
                                onChange={e => setFilterCode(e.target.value)}
                            >
                                <option value="">Todas las Boletas</option>
                                {uniqueCodes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {(filterBrand || filterOwner || filterCode) && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode(''); }}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-sm font-medium transition-colors"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Brand Groups */}
                    <div className="space-y-6">
                        {brandGroups.map((brandGroup, idx) => {
                            const owner = users.find(u => u.username === brandGroup.propietario);
                            const ownerColor = owner ? owner.color : null;
                            return (
                                <BrandSectionCatalog
                                    key={idx}
                                    brandGroup={brandGroup}
                                    ownerColor={ownerColor}
                                    publishedMap={publishedMap}
                                    tandaName={tandaName}
                                    navigate={navigate}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Brand Section for Catalog ---
function BrandSectionCatalog({ brandGroup, ownerColor, publishedMap, tandaName, navigate }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const totalDocenasCopy = brandGroup.items.reduce((sum, p) =>
        sum + (p.cant_docenas_copy ?? p.cantidad_docenas ?? 0), 0
    );
    const totalMoney = brandGroup.items.reduce((sum, p) => {
        const docenas = p.cant_docenas_copy ?? p.cantidad_docenas ?? 0;
        return sum + (docenas * (Number(p.precio_docena) || 0));
    }, 0);

    return (
        <div
            className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
            style={ownerColor ? { borderLeft: `4px solid ${ownerColor}` } : {}}
        >
            {/* Header */}
            <div
                className="bg-muted/30 px-6 py-4 border-b border-border flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-wide flex items-center gap-3">
                        {brandGroup.name}
                        {!isExpanded && (
                            <span className="text-xs font-normal text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full">
                                {brandGroup.items.length} productos
                            </span>
                        )}
                    </h3>

                    {/* Owner Badge */}
                    {brandGroup.propietario && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border shadow-sm">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: ownerColor || '#9ca3af' }}
                            />
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                {brandGroup.propietario}
                            </span>
                        </div>
                    )}

                    {/* Doc. Control badge */}
                    <div className="text-sm font-medium px-3 py-1 rounded-md border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800">
                        <span className="flex items-center gap-1.5">
                            <ClipboardList className="w-4 h-4" />
                            {totalDocenasCopy} doc. control
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Boleta */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Boleta:</span>
                        <span className={`font-mono text-sm font-medium ${brandGroup.boleta ? 'text-foreground' : 'text-destructive italic'}`}>
                            {brandGroup.boleta || 'NO INGRESADA'}
                        </span>
                    </div>

                    {/* Total money */}
                    <div className="hidden md:block text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-violet-600 dark:text-violet-400 font-mono text-sm">
                            ${totalMoney.toLocaleString('es-AR')}
                        </p>
                    </div>

                    <div className="text-muted-foreground">
                        <ChevronLeft className={`w-5 h-5 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                    </div>
                </div>
            </div>

            {/* Collapsible content */}
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/20 border-b border-border text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3 text-center">Doc. Control</th>
                                <th className="px-6 py-3 text-right">Precio Doc.</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-center">Crear producto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {brandGroup.items.map((prod) => {
                                const docenasCopy = prod.cant_docenas_copy ?? prod.cantidad_docenas ?? 0;
                                const total = docenasCopy * (Number(prod.precio_docena) || 0);
                                const isPublished = !!publishedMap[prod.id];
                                return (
                                    <tr key={prod.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4 font-medium text-foreground">{prod.producto_titulo}</td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{prod.codigo}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-md">
                                                {docenasCopy}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted-foreground">
                                            ${Number(prod.precio_docena || 0).toLocaleString('es-AR')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-violet-600 dark:text-violet-400">
                                            ${total.toLocaleString('es-AR')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {isPublished ? (
                                                <button
                                                    onClick={() => navigate(`/admin/products/new/${prod.id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Ver
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => navigate(`/admin/products/new/${prod.id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Crear
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
