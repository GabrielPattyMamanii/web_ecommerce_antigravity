import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    ArrowLeft, Layers, Calendar, Package, ClipboardList, ChevronUp, ChevronDown,
    QrCode, Download, X, AlertTriangle, Image as ImageIcon
} from 'lucide-react';
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

    // Photo lightbox state (Comprobantes & Fotos)
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);

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
                    .in('codigo', codes)
                    .eq('tanda_nombre', tandaName);
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
                    items: [],
                    photos: []
                };
            } else if (!acc[key].propietario && prod.propietario) {
                acc[key].propietario = prod.propietario;
            }
            acc[key].items.push(prod);

            if (prod.fotos && Array.isArray(prod.fotos)) {
                prod.fotos.forEach(photo => { if (!acc[key].photos.includes(photo)) acc[key].photos.push(photo); });
            }

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

    // --- Photo lightbox handlers (Comprobantes & Fotos) ---
    const openBrandPhoto = (photoUrl) => {
        setSelectedPhoto(photoUrl);
        setPhotoModalOpen(true);
    };

    const closeLightbox = () => {
        setPhotoModalOpen(false);
        setSelectedPhoto(null);
    };

    const downloadImage = async (imageUrl) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `comprobante-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error descargando imagen:', error);
            alert('Error al descargar la imagen');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Volver al listado */}
            <button
                onClick={() => navigate('/admin/control-mercancia')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Volver al Listado
            </button>

            {loading ? (
                <div className="text-center py-16">
                    <div className="inline-flex items-center gap-3 text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Cargando detalles...
                    </div>
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border text-muted-foreground">
                    No se encontraron registros para esta tanda.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Card */}
                    <section className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                                <ClipboardList className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl font-extrabold text-foreground tracking-tight">{tandaName}</h1>
                                    <span className="px-2 py-0.5 text-[11px] font-bold bg-muted text-muted-foreground rounded-md border border-border">
                                        {brandGroups.length} {brandGroups.length === 1 ? 'Marca' : 'Marcas'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs font-medium text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
                                        {tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString('es-AR') : '—'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-muted-foreground/70" />
                                        {tandaInfo.count} productos cargados
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t md:border-t-0 md:border-l border-border md:pl-8 py-2 md:py-0 flex flex-col justify-center">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gastos Totales</span>
                            <span className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">${Number(tandaInfo.gastos || 0).toLocaleString()}</span>
                        </div>

                        <div className="bg-primary/5 border border-primary/15 rounded-xl px-7 py-3.5 flex flex-col justify-center text-right md:min-w-[230px]">
                            <span className="text-xs font-semibold text-muted-foreground">Valor Control Estimado</span>
                            <span className="text-3xl font-extrabold text-primary mt-0.5 tracking-tight tabular-nums">${totalMoney.toLocaleString('es-AR')}</span>
                            <span className="text-xs font-medium text-muted-foreground mt-0.5">{totalDocenasCopy} docenas (control)</span>
                        </div>
                    </section>

                    {/* Filters */}
                    <section className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Filtrar Marca</label>
                                <select
                                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground hover:border-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={filterBrand}
                                    onChange={e => setFilterBrand(e.target.value)}
                                >
                                    <option value="">Todas las Marcas ({uniqueBrands.length})</option>
                                    {uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Propietario</label>
                                <select
                                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground hover:border-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={filterOwner}
                                    onChange={e => setFilterOwner(e.target.value)}
                                >
                                    <option value="">Todos los Propietarios</option>
                                    {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Nº Boleta</label>
                                <select
                                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground hover:border-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={filterCode}
                                    onChange={e => setFilterCode(e.target.value)}
                                >
                                    <option value="">Todas las Boletas</option>
                                    {uniqueCodes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        {(filterBrand || filterOwner || filterCode) && (
                            <div className="flex justify-end mt-3">
                                <button
                                    onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode(''); }}
                                    className="text-xs font-semibold text-primary hover:underline"
                                >
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Brand Groups (Accordion) */}
                    <div className="space-y-4">
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
                                    onPhotoClick={openBrandPhoto}
                                    soldMap={soldMap}
                                    defaultOpen={idx === 0}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Photo Lightbox (Comprobantes & Fotos) */}
            {photoModalOpen && selectedPhoto && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={closeLightbox}
                >
                    <div className="fixed top-5 right-5 flex flex-col gap-3 z-[9999]">
                        <button
                            onClick={closeLightbox}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold shadow-md hover:bg-destructive/90 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            <span>Salir</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); downloadImage(selectedPhoto); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold shadow-md hover:bg-emerald-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            <span>Descargar</span>
                        </button>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="relative max-w-[90vw] max-h-[90vh]">
                        <img src={selectedPhoto} alt="Comprobante" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
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
                                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={handleDownloadQR}
                                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
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

// --- Brand Section (Acordeón Enriquecido) ---
function ControlBrandSection({ brandGroup, ownerColor, ownerTotals = {}, isMultiOwner = false, users = [], generatedQRs, getStableKey, onGenerate, onOpen, onPhotoClick, soldMap = {}, defaultOpen = false }) {
    const [isExpanded, setIsExpanded] = useState(defaultOpen);

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

    const ownerBadges = isMultiOwner ? (
        <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(ownerTotals).map(([name, amt]) => {
                const color = getColor(name);
                const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                return (
                    <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200/70 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {name} ({pct}%)
                    </span>
                );
            })}
        </div>
    ) : brandGroup.propietario ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200/70 dark:bg-pink-950/30 dark:text-pink-300 dark:border-pink-900">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ownerColor || '#9ca3af' }} />
            Propietario: {brandGroup.propietario}
        </span>
    ) : null;

    return (
        <section
            className={`bg-card rounded-2xl shadow-sm overflow-hidden transition-all ${
                isExpanded ? 'border-2 border-primary/40' : 'border border-border hover:border-muted-foreground/30'
            }`}
            style={borderStyle}
        >
            {/* Header */}
            <div
                className={`p-5 border-b border-border flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none ${
                    isExpanded ? 'bg-primary/5' : ''
                }`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                        {isExpanded && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {isExpanded ? 'ABIERTA' : 'CERRADA'}
                    </span>
                    <h2 className="text-base md:text-lg font-black uppercase tracking-tight text-foreground">
                        {brandGroup.name}
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        Boleta <strong className={`ml-1 font-mono ${brandGroup.boleta ? 'text-foreground' : 'text-destructive italic'}`}>{brandGroup.boleta || 'NO INGRESADA'}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        <ClipboardList className="w-3.5 h-3.5" />
                        <strong className="text-foreground">{totalDocenasCopy}</strong> docenas
                    </span>
                    {ownerBadges}
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground border border-border">
                        {brandGroup.items.length} {brandGroup.items.length === 1 ? 'ítem' : 'ítems'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold block">Total Facturado</span>
                        <span className={`text-lg font-extrabold tabular-nums ${isExpanded ? 'text-primary' : 'text-foreground'}`}>
                            ${totalMoney.toLocaleString('es-AR')}
                        </span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                            isExpanded
                                ? 'text-primary bg-primary/10 hover:bg-primary/15 border-primary/20'
                                : 'text-muted-foreground bg-muted hover:bg-muted/70 border-transparent'
                        }`}
                    >
                        <span>{isExpanded ? 'Plegar' : 'Desplegar'}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Collapsible content */}
            {isExpanded && (
                <>
                    {/* Comprobantes & Fotos */}
                    <div className="px-5 py-4 bg-muted/20 border-b border-border">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-2">
                            <ImageIcon className="w-4 h-4" />
                            Comprobantes y fotos ({brandGroup.photos.length})
                        </div>
                        {brandGroup.photos.length > 0 ? (
                            <div className="flex gap-3 flex-wrap">
                                {brandGroup.photos.map((photoUrl, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onPhotoClick(photoUrl)}
                                        className="relative group rounded-xl overflow-hidden border border-border shadow-sm hover:ring-2 hover:ring-primary/40 transition-all"
                                    >
                                        <img src={photoUrl} alt={`${brandGroup.name} - comprobante ${i + 1}`} className="h-20 w-20 object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                            <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground/70 italic">Sin comprobantes cargados.</p>
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <th className="py-3 px-5">Producto</th>
                                    <th className="py-3 px-5">Código</th>
                                    {isMultiOwner && <th className="py-3 px-5">Propietario</th>}
                                    <th className="py-3 px-5 text-center">Doc. Control</th>
                                    <th className="py-3 px-5">Ventas vs Restante</th>
                                    <th className="py-3 px-5 text-right">Precio Doc.</th>
                                    <th className="py-3 px-5 text-right">Subtotal</th>
                                    <th className="py-3 px-5 text-center">Acción QR</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-sm">
                                {brandGroup.items.map((prod) => {
                                    const docenasCopy = prod.cant_docenas_copy ?? prod.cantidad_docenas ?? 0;
                                    const total = docenasCopy * (Number(prod.precio_docena) || 0);
                                    const isGenerated = generatedQRs.has(getStableKey(prod));
                                    const prodOwner = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                    const prodOwnerColor = prodOwner ? getColor(prodOwner) : null;
                                    return (
                                        <tr
                                            key={prod.id}
                                            className="hover:bg-primary/5 transition-colors"
                                            style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                        >
                                            <td className="py-3 px-5 font-semibold text-foreground">{prod.producto_titulo}</td>
                                            <td className="py-3 px-5">
                                                <span className="inline-block px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono text-xs font-medium border border-border">{prod.codigo}</span>
                                            </td>
                                            {isMultiOwner && (
                                                <td className="py-3 px-5">
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
                                            <td className="py-3 px-5 text-center">
                                                <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                                    {docenasCopy}
                                                </span>
                                            </td>
                                            {(() => {
                                                const ownerKey = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                                const sold = soldMap[`${prod.codigo}_${ownerKey}`] || 0;
                                                const available = docenasCopy - sold;
                                                const isOut = available <= 0 && docenasCopy > 0;
                                                const isLow = !isOut && docenasCopy > 0 && (available / docenasCopy) <= 0.25;
                                                const color = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';
                                                return (
                                                    <td className="py-3 px-5">
                                                        {sold > 0 || docenasCopy > 0 ? (
                                                            <div className="flex flex-col gap-1 max-w-[150px]">
                                                                <div className="flex justify-between text-xs font-bold">
                                                                    <span style={{ color }}>{sold} vend.</span>
                                                                    <span className="text-muted-foreground font-medium">{available >= 0 ? available : 0} disp.</span>
                                                                </div>
                                                                {docenasCopy > 0 && (
                                                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full transition-all"
                                                                            style={{ width: `${Math.min(100, (sold / docenasCopy) * 100)}%`, backgroundColor: color }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                {isOut && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive">
                                                                        <AlertTriangle className="w-3 h-3" /> Agotado
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })()}
                                            <td className="py-3 px-5 text-right tabular-nums text-muted-foreground">
                                                ${Number(prod.precio_docena || 0).toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-5 text-right font-extrabold text-primary tabular-nums">
                                                ${total.toLocaleString('es-AR')}
                                            </td>
                                            <td className="py-3 px-5 text-center">
                                                {!isGenerated ? (
                                                    <button
                                                        onClick={() => onGenerate(prod)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-primary/5 hover:text-primary border border-border hover:border-primary/30 text-muted-foreground rounded-lg text-xs font-semibold transition-all"
                                                    >
                                                        <QrCode className="w-3.5 h-3.5" />
                                                        Generar
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => onOpen(prod)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold transition-all shadow-sm"
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
                            const stockColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981';

                            return (
                                <div
                                    key={prod.id}
                                    className="p-4 bg-card"
                                    style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                >
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
                                                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold transition-all shadow-sm"
                                            >
                                                <QrCode className="w-3.5 h-3.5" />
                                                Ver QR
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Doc. Control</p>
                                            <p className="font-bold text-primary">{docenasCopy}</p>
                                        </div>
                                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Precio Doc.</p>
                                            <p className="font-bold text-foreground text-xs">${Number(prod.precio_docena || 0).toLocaleString('es-AR')}</p>
                                        </div>
                                        <div className="bg-muted/30 rounded-lg p-2 text-center">
                                            <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Total</p>
                                            <p className="font-bold text-primary text-xs">${total.toLocaleString('es-AR')}</p>
                                        </div>
                                    </div>

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
                                                        style={{ width: `${Math.min(100, (sold / docenasCopy) * 100)}%`, backgroundColor: stockColor }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer Summary */}
                    <div className="px-6 py-3.5 bg-muted/30 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>Mostrando los {brandGroup.items.length} productos de la marca {brandGroup.name}</span>
                        <div className="flex items-center gap-4">
                            <span>Docenas totales: <strong className="text-foreground">{totalDocenasCopy} doc</strong></span>
                            <span>Subtotal Marca: <strong className="text-primary text-sm font-bold">${totalMoney.toLocaleString('es-AR')}</strong></span>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
