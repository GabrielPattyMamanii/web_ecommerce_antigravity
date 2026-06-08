import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    ArrowLeft, Layers, Calendar, Package, ClipboardList, ChevronLeft,
    QrCode, Download, X, AlertTriangle, TrendingDown
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

export function ControlMercanciaTanda() {
    const { tanda } = useParams();
    const navigate = useNavigate();
    const tandaName = decodeURIComponent(tanda);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tandaInfo, setTandaInfo] = useState({ date: null, count: 0, gastos: 0 });
    const [users, setUsers] = useState([]);
    // soldMap: { [`${codigo}_${propietario}`]: docenas_vendidas }
    const [soldMap, setSoldMap] = useState({});

    // Filters
    const [filterBrand, setFilterBrand] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterCode, setFilterCode] = useState('');

    // QR state: persisted in localStorage so it survives page refreshes
    const localKey = `generated_qrs_${tandaName}`;
    const [generatedQRs, setGeneratedQRs] = useState(() => {
        try {
            const saved = localStorage.getItem(localKey);
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch { return new Set(); }
    });
    // QR modal state
    const [qrModal, setQrModal] = useState(null); // { id, titulo, url }

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
                    count: data.length,
                    gastos: data[0].gastos || 0
                });
            }

            // Traer ventas para los códigos de esta tanda
            const codes = [...new Set((data || []).filter(p => p.codigo).map(p => p.codigo))];
            if (codes.length > 0) {
                const { data: ventasData } = await supabase
                    .from('ventas')
                    .select('codigo, propietario, cantidad_docenas')
                    .in('codigo', codes);
                const map = {};
                for (const v of ventasData || []) {
                    const key = `${v.codigo}_${v.propietario}`;
                    map[key] = (map[key] || 0) + Number(v.cantidad_docenas);
                }
                setSoldMap(map);
            }
        } catch (err) {
            console.error('Error fetching control detail:', err);
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

    // Totals using cant_docenas_copy
    const totalDocenasCopy = filteredProducts.reduce((sum, p) => sum + (p.cant_docenas_copy ?? p.cantidad_docenas ?? 0), 0);
    const totalMoney = filteredProducts.reduce((sum, p) => {
        const docenas = p.cant_docenas_copy ?? p.cantidad_docenas ?? 0;
        return sum + (docenas * (Number(p.precio_docena) || 0));
    }, 0);

    // --- Group by brand ---
    const brandGroups = Object.values(
        filteredProducts.reduce((acc, prod) => {
            const key = prod.marca_id
                ? prod.marca_id
                : `${prod.marca}_${prod.codigo_boleta || 'sin_boleta'}`;

            if (!acc[key]) {
                acc[key] = {
                    key,
                    name: prod.marca,
                    boleta: prod.codigo_boleta,
                    propietario: prod.propietario || '',
                    items: []
                };
            } else if (!acc[key].propietario && prod.propietario) {
                acc[key].propietario = prod.propietario;
            }
            acc[key].items.push(prod);
            return acc;
        }, {})
    );

    // --- QR Handlers ---
    // Usamos prod.codigo como clave estable (el UUID cambia si el producto se re-crea al editar)
    const getStableKey = (prod) => prod.codigo ? `c:${prod.codigo}` : prod.id;

    const handleGenerateQR = (prod) => {
        const updated = new Set([...generatedQRs, getStableKey(prod)]);
        setGeneratedQRs(updated);
        try { localStorage.setItem(localKey, JSON.stringify([...updated])); } catch { }
    };

    const getQRUrl = (prod) => {
        const base = import.meta.env.VITE_APP_URL || window.location.origin;
        // ?c= permite al escáner encontrar el producto por código si el ID queda desactualizado
        const codigoParam = prod.codigo ? `?c=${encodeURIComponent(prod.codigo)}` : '';
        return `${base}/scan/${prod.id}${codigoParam}`;
    };

    const handleOpenQR = (prod) => {
        const url = getQRUrl(prod);
        setQrModal({ id: prod.id, titulo: prod.producto_titulo, marca: prod.marca, url });
    };

    const handleDownloadQR = () => {
        if (!qrModal) return;
        const canvas = document.getElementById('qr-download-canvas');
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR-${qrModal.titulo || qrModal.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back button */}
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="ghost"
                    className="pl-0 gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/admin/control-mercancia')}
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al Listado
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
                    {/* Header Card */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500 text-white rounded-lg">
                                <ClipboardList className="w-6 h-6" />
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

                        {/* Middle: Gastos */}
                        <div className="flex flex-col md:flex-row gap-6 md:px-12 items-center flex-1 justify-center border-t border-b md:border-t-0 md:border-b-0 md:border-l md:border-r border-border py-4 md:py-0">
                            <div>
                                <p className="text-xs uppercase text-muted-foreground font-semibold mb-1 text-center">Gastos Totales</p>
                                <p className="font-mono font-medium text-foreground text-center text-lg">
                                    ${Number(tandaInfo.gastos || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Right: total value */}
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Valor Control Estimado</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                ${totalMoney.toLocaleString('es-AR')}
                            </p>
                            <p className="text-xs text-muted-foreground">{totalDocenasCopy} docenas (control)</p>
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
                            // Compute per-product owner totals (same logic as DetalleTanda)
                            const ownerTotals = {};
                            let hasExplicitOwner = false;
                            brandGroup.items.forEach(prod => {
                                const ownerName = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                const docenas = prod.cant_docenas_copy ?? prod.cantidad_docenas ?? 0;
                                const amount = docenas * (Number(prod.precio_docena) || 0);
                                const bucket = ownerName || '—';
                                if (ownerName) hasExplicitOwner = true;
                                if (!ownerTotals[bucket]) ownerTotals[bucket] = 0;
                                ownerTotals[bucket] += amount;
                            });
                            if (!hasExplicitOwner) Object.keys(ownerTotals).forEach(k => delete ownerTotals[k]);
                            const isMultiOwner = Object.keys(ownerTotals).length > 1;

                            const owner = users.find(u => u.username === brandGroup.propietario);
                            const singleOwnerKey = !isMultiOwner && Object.keys(ownerTotals).length === 1 && Object.keys(ownerTotals)[0] !== '—'
                                ? Object.keys(ownerTotals)[0] : null;
                            const ownerColor = owner?.color || (singleOwnerKey ? users.find(u => u.username === singleOwnerKey)?.color : null);

                            return (
                                <ControlBrandSection
                                    key={idx}
                                    brandGroup={brandGroup}
                                    ownerColor={ownerColor}
                                    ownerTotals={ownerTotals}
                                    isMultiOwner={isMultiOwner}
                                    users={users}
                                    generatedQRs={generatedQRs}
                                    getStableKey={getStableKey}
                                    onGenerate={handleGenerateQR}
                                    onOpen={handleOpenQR}
                                    soldMap={soldMap}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {qrModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setQrModal(null)}
                >
                    <div
                        className="bg-card rounded-2xl shadow-2xl border border-border p-8 max-w-sm w-full flex flex-col items-center gap-5"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between w-full">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">QR del producto</p>
                                <h3 className="font-bold text-foreground text-lg leading-tight">{qrModal.titulo}</h3>
                                <p className="text-xs text-muted-foreground">{qrModal.marca}</p>
                            </div>
                            <button
                                onClick={() => setQrModal(null)}
                                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* QR Code visible (SVG) */}
                        <div className="p-4 bg-white rounded-xl shadow-inner">
                            <QRCodeSVG
                                value={qrModal.url}
                                size={200}
                                level="H"
                                includeMargin={false}
                            />
                        </div>

                        {/* Hidden canvas for download */}
                        <div className="hidden">
                            <QRCodeCanvas
                                id="qr-download-canvas"
                                value={qrModal.url}
                                size={400}
                                level="H"
                                includeMargin={true}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground text-center break-all font-mono bg-muted px-3 py-2 rounded-lg w-full">
                            {qrModal.url}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setQrModal(null)}
                                className="flex-1 px-4 py-2.5 border border-input rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleDownloadQR}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Brand Section ---
function ControlBrandSection({ brandGroup, ownerColor, ownerTotals = {}, isMultiOwner = false, users = [], generatedQRs, getStableKey, onGenerate, onOpen, soldMap = {} }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getColor = (name) => users.find(u => u.username === name)?.color || '#9ca3af';

    const borderStyle = (() => {
        if (!isMultiOwner) {
            return ownerColor ? { borderLeft: `4px solid ${ownerColor}` } : {};
        }
        const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
        let pct = 0;
        const stops = Object.entries(ownerTotals).flatMap(([name, amt]) => {
            const color = getColor(name);
            const start = pct;
            pct += (amt / total) * 100;
            return [`${color} ${start.toFixed(1)}%`, `${color} ${pct.toFixed(1)}%`];
        });
        return { borderLeft: '4px solid transparent', borderImage: `linear-gradient(to bottom, ${stops.join(', ')}) 1` };
    })();

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
            style={borderStyle}
        >
            {/* Header */}
            <div
                className="bg-muted/30 px-4 py-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Top row: brand name + chevron */}
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-base md:text-lg font-bold text-foreground uppercase tracking-wide truncate">
                            {brandGroup.name}
                        </h3>
                        {!isExpanded && (
                            <span className="flex-shrink-0 text-xs font-normal text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full">
                                {brandGroup.items.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Total money (always visible) */}
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground leading-none mb-0.5">Total</p>
                            <p className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                                ${totalMoney.toLocaleString('es-AR')}
                            </p>
                        </div>
                        <div className="text-muted-foreground">
                            <ChevronLeft className={`w-5 h-5 transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`} />
                        </div>
                    </div>
                </div>

                {/* Bottom row: badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Boleta */}
                    <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-0.5 rounded-md">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Boleta</span>
                        <span className={`font-mono text-xs font-medium ${brandGroup.boleta ? 'text-foreground' : 'text-destructive italic'}`}>
                            {brandGroup.boleta || 'NO INGRESADA'}
                        </span>
                    </div>

                    {/* Doc. Control badge */}
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {totalDocenasCopy} doc.
                    </div>

                    {/* Owner Badge(s) */}
                    {isMultiOwner ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(ownerTotals).map(([name, amt]) => {
                                const color = getColor(name);
                                const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                                const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                                return (
                                    <div key={name} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border text-xs font-bold" style={{ borderColor: color }}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-foreground">{name}</span>
                                        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : brandGroup.propietario ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border border-border">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ownerColor || '#9ca3af' }} />
                            <span className="text-xs font-bold text-muted-foreground uppercase">{brandGroup.propietario}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Collapsible content */}
            {isExpanded && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 border-b border-border text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3">Producto</th>
                                    <th className="px-6 py-3">Código</th>
                                    {isMultiOwner && <th className="px-6 py-3">Propietario</th>}
                                    <th className="px-6 py-3 text-center">Doc. Control</th>
                                    <th className="px-6 py-3 text-center">Vendidas / Disp.</th>
                                    <th className="px-6 py-3 text-right">Precio Doc.</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-center">QR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {brandGroup.items.map((prod) => {
                                    const docenasCopy = prod.cant_docenas_copy ?? prod.cantidad_docenas ?? 0;
                                    const total = docenasCopy * (Number(prod.precio_docena) || 0);
                                    const isGenerated = generatedQRs.has(getStableKey(prod));
                                    const prodOwner = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                    const prodOwnerColor = prodOwner ? getColor(prodOwner) : null;
                                    return (
                                        <tr
                                            key={prod.id}
                                            className="hover:bg-muted/10 transition-colors"
                                            style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                        >
                                            <td className="px-6 py-4 font-medium text-foreground">{prod.producto_titulo}</td>
                                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{prod.codigo}</td>
                                            {isMultiOwner && (
                                                <td className="px-6 py-4">
                                                    {prodOwner ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prodOwnerColor || '#9ca3af' }} />
                                                            {prodOwner}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">—</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                                                    {docenasCopy}
                                                </span>
                                            </td>
                                            {(() => {
                                                const ownerKey = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                                const sold = soldMap[`${prod.codigo}_${ownerKey}`] || 0;
                                                const available = docenasCopy - sold;
                                                const isOut = available <= 0 && docenasCopy > 0;
                                                const isLow = !isOut && docenasCopy > 0 && (available / docenasCopy) <= 0.25;
                                                const color = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#16a34a';
                                                return (
                                                    <td className="px-6 py-4 text-center">
                                                        {sold > 0 || docenasCopy > 0 ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                                                                    {isOut && <AlertTriangle className="w-3 h-3" />}
                                                                    <span>{sold} vend. / {available >= 0 ? available : 0} disp.</span>
                                                                </div>
                                                                {docenasCopy > 0 && (
                                                                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full transition-all"
                                                                            style={{
                                                                                width: `${Math.min(100, (sold / docenasCopy) * 100)}%`,
                                                                                backgroundColor: color,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })()}
                                            <td className="px-6 py-4 text-right text-muted-foreground">
                                                ${Number(prod.precio_docena || 0).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                                                ${total.toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {!isGenerated ? (
                                                    <button
                                                        onClick={() => onGenerate(prod)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-indigo-50 hover:text-indigo-700 border border-border hover:border-indigo-300 text-muted-foreground rounded-lg text-xs font-semibold transition-all"
                                                    >
                                                        <QrCode className="w-3.5 h-3.5" />
                                                        Generar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onOpen(prod)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                    >
                                                        <QrCode className="w-3.5 h-3.5" />
                                                        Abrir
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-border">
                        {brandGroup.items.map((prod) => {
                            const docenasCopy = prod.cant_docenas_copy ?? prod.cantidad_docenas ?? 0;
                            const total = docenasCopy * (Number(prod.precio_docena) || 0);
                            const isGenerated = generatedQRs.has(getStableKey(prod));
                            const prodOwner = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                            const prodOwnerColor = prodOwner ? getColor(prodOwner) : null;
                            const ownerKey = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                            const sold = soldMap[`${prod.codigo}_${ownerKey}`] || 0;
                            const available = docenasCopy - sold;
                            const isOut = available <= 0 && docenasCopy > 0;
                            const isLow = !isOut && docenasCopy > 0 && (available / docenasCopy) <= 0.25;
                            const stockColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#16a34a';

                            return (
                                <div
                                    key={prod.id}
                                    className="p-4 bg-card"
                                    style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                >
                                    {/* Top row: title + QR button */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-foreground leading-tight">{prod.producto_titulo}</p>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{prod.codigo}</p>
                                            {isMultiOwner && prodOwner && (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold mt-1" style={{ color: prodOwnerColor || '#9ca3af' }}>
                                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: prodOwnerColor || '#9ca3af' }} />
                                                    {prodOwner}
                                                </span>
                                            )}
                                        </div>
                                        {!isGenerated ? (
                                            <button
                                                onClick={() => onGenerate(prod)}
                                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border text-muted-foreground rounded-lg text-xs font-semibold transition-all"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                                Generar QR
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onOpen(prod)}
                                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                                Ver QR
                                            </button>
                                        )}
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Doc. Control</p>
                                            <p className="font-bold text-indigo-600 dark:text-indigo-400">{docenasCopy}</p>
                                        </div>
                                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Precio Doc.</p>
                                            <p className="font-bold text-foreground text-xs">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</p>
                                        </div>
                                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Total</p>
                                            <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">${total.toLocaleString('es-AR')}</p>
                                        </div>
                                    </div>

                                    {/* Stock bar */}
                                    {(sold > 0 || docenasCopy > 0) && (
                                        <div>
                                            <div className="flex items-center gap-1.5 text-xs font-semibold mb-1" style={{ color: stockColor }}>
                                                {isOut && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                                                <span>{sold} vendidas / {available >= 0 ? available : 0} disponibles</span>
                                            </div>
                                            {docenasCopy > 0 && (
                                                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, (sold / docenasCopy) * 100)}%`,
                                                            backgroundColor: stockColor,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
