import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useGlobalScanner } from '../../hooks/useGlobalScanner';
import { supabase } from '../../lib/supabase';
import { calcPrice } from '../../utils/pricingUtils';
import toast from 'react-hot-toast';
import {
    ScanLine, X, User, Loader2, Banknote, Building2, Blend,
    Package, ShoppingCart, CheckCircle, Trash2, AlertTriangle,
    ChevronDown, Search,
} from 'lucide-react';

const METODOS = [
    { id: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
    { id: 'transferencia', label: 'Transferencia', Icon: Building2 },
    { id: 'mixto',         label: 'Mixto',         Icon: Blend },
];

const fmtMiles = (str) => {
    const digits = String(str).replace(/[^\d]/g, '');
    if (!digits) return '';
    return parseInt(digits, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const rawNum = (str) => String(str ?? '').replace(/\./g, '');

export function GlobalQuickSale() {
    const location = useLocation();
    const isOnVentasPage = location.pathname.startsWith('/admin/ventas');

    const [isOpen, setIsOpen] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle');
    const [lastScanned, setLastScanned] = useState('');

    // Producto
    const [foundEntradas, setFoundEntradas] = useState([]);
    const [showPropietarioModal, setShowPropietarioModal] = useState(false);
    const [showTandaModal, setShowTandaModal] = useState(false);
    const [tandaEntries, setTandaEntries] = useState([]);
    const [tandaSoldMap, setTandaSoldMap] = useState({});
    const [loadingTandaStock, setLoadingTandaStock] = useState(false);
    const [selectedEntrada, setSelectedEntrada] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [stockInfo, setStockInfo] = useState(null);

    // Formulario
    const [currentPrice, setCurrentPrice] = useState('');
    const [currentQty, setCurrentQty] = useState('1');
    const [currentDolarBlue, setCurrentDolarBlue] = useState(null);
    const [currentIndice, setCurrentIndice] = useState('');
    const [dolarFailed, setDolarFailed] = useState(false);
    const [manualDolar, setManualDolar] = useState('');

    // Pago
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [cuentas, setCuentas] = useState([]);
    const [selectedCuenta, setSelectedCuenta] = useState(null);
    const [montoEfectivo, setMontoEfectivo] = useState('');
    const [montoTransferencia, setMontoTransferencia] = useState('');
    const [recargoPct, setRecargoPct] = useState('');

    // Carrito
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);
    const [nombrePedido, setNombrePedido] = useState('');
    const [appUsers, setAppUsers] = useState([]);

    // Buscador manual
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef(null);

    const sheetRef = useRef(null);

    useEffect(() => {
        Promise.all([
            supabase.from('app_users').select('username, color'),
            supabase.from('cuentas_bancarias').select('*').eq('activa', true).order('created_at'),
        ]).then(([{ data: users }, { data: cuentasData }]) => {
            if (users) setAppUsers(users);
            if (cuentasData) setCuentas(cuentasData);
        });
    }, []);

    const getUserColor = (name) =>
        appUsers.find(u => u.username === name)?.color || '#9ca3af';

    const getPropietario = (entrada) =>
        entrada?.propietario_producto || entrada?.propietario || null;

    const resetForm = useCallback(() => {
        setSelectedEntrada(null);
        setStockInfo(null);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setCurrentIndice('');
        setDolarFailed(false);
        setManualDolar('');
        setMetodoPago('efectivo');
        setSelectedCuenta(null);
        setMontoEfectivo('');
        setMontoTransferencia('');
        setRecargoPct('');
    }, []);

    const closeSheet = useCallback(() => {
        setIsOpen(false);
        resetForm();
        setCart([]);
        setNombrePedido('');
        setFoundEntradas([]);
        setShowPropietarioModal(false);
        setShowTandaModal(false);
        setScanStatus('idle');
    }, [resetForm]);

    const selectEntrada = useCallback(async (entrada) => {
        setShowPropietarioModal(false);
        setFoundEntradas([]);
        setSelectedEntrada(entrada);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setCurrentIndice('');
        setDolarFailed(false);
        setManualDolar('');
        setStockInfo({ total: Number(entrada.cantidad_docenas) || 0, sold: 0, loading: true });
        setMetodoPago('efectivo');
        setSelectedCuenta(null);
        setMontoEfectivo('');
        setMontoTransferencia('');
        setRecargoPct('');
        setLoadingPrice(true);

        try {
            const propietarioKey = entrada.propietario_producto?.trim() || entrada.propietario?.trim() || null;
            const [dolarRes, settingsRes, precioCustomRes, ventasRes] = await Promise.all([
                fetch('https://dolarapi.com/v1/dolares/blue'),
                supabase.from('tanda_settings')
                    .select('indice_ganancia_valor')
                    .eq('tanda_nombre', entrada.tanda_nombre)
                    .maybeSingle(),
                entrada.codigo
                    ? supabase.from('precios_custom').select('precio_ars').eq('codigo', entrada.codigo).maybeSingle()
                    : Promise.resolve({ data: null }),
                entrada.codigo && propietarioKey
                    ? (() => {
                        const q = supabase.from('ventas')
                            .select('cantidad_docenas')
                            .eq('codigo', entrada.codigo)
                            .eq('propietario', propietarioKey);
                        return entrada.tanda_nombre ? q.eq('tanda_nombre', entrada.tanda_nombre) : q;
                    })()
                    : Promise.resolve({ data: [] }),
            ]);

            const totalDocenas = Number(entrada.cantidad_docenas) || 0;
            const sold = (ventasRes.data || []).reduce((sum, v) => sum + Number(v.cantidad_docenas), 0);
            setStockInfo({ total: totalDocenas, sold, loading: false });

            if (!dolarRes.ok) throw new Error('no dolar');
            const dolarJson = await dolarRes.json();
            const dolarBlue = parseFloat(dolarJson?.venta);
            if (!dolarBlue) throw new Error('no dolar value');

            const indice = parseFloat(settingsRes.data?.indice_ganancia_valor || 1.5);
            const prices = calcPrice(
                { ...entrada, _source: 'entradas' },
                { cotizacion_dolar: dolarBlue, indice_ganancia_valor: indice }
            );

            const precioCustom = precioCustomRes.data?.precio_ars ?? null;
            if (precioCustom != null) {
                setCurrentPrice(fmtMiles(precioCustom.toFixed(0)));
            } else if (prices.precioVentaArg != null) {
                setCurrentPrice(fmtMiles(prices.precioVentaArg.toFixed(0)));
            }
            setCurrentDolarBlue(dolarBlue);
            setCurrentIndice(indice.toString());
        } catch {
            setDolarFailed(true);
            setCurrentIndice('1.5');
            setStockInfo(prev => prev ? { ...prev, loading: false } : null);
            toast.error('No se pudo obtener el dólar — ingresá el precio manualmente');
        } finally {
            setLoadingPrice(false);
        }
    }, []);

    const openTandaPicker = useCallback(async (entries) => {
        const propietarioKey = getPropietario(entries[0]) ?? null;
        setTandaEntries(entries);
        setShowTandaModal(true);
        setLoadingTandaStock(true);
        try {
            const codigo = entries[0].codigo;
            const tandaNames = entries.map(e => e.tanda_nombre).filter(Boolean);
            const { data } = await supabase.from('ventas')
                .select('cantidad_docenas, tanda_nombre')
                .eq('codigo', codigo)
                .eq('propietario', propietarioKey)
                .in('tanda_nombre', tandaNames.length > 0 ? tandaNames : ['__none__']);
            const soldByTanda = {};
            for (const v of data || []) {
                const t = v.tanda_nombre || '__unknown__';
                soldByTanda[t] = (soldByTanda[t] || 0) + Number(v.cantidad_docenas);
            }
            setTandaSoldMap(soldByTanda);
        } catch {
            setTandaSoldMap({});
        } finally {
            setLoadingTandaStock(false);
        }
    }, []);

    const processCode = useCallback(async (code, codigoFallback = null) => {
        if (isOnVentasPage) return;
        setIsOpen(true);
        setScanStatus('searching');
        setLastScanned(codigoFallback || code);
        setSelectedEntrada(null);
        setFoundEntradas([]);

        try {
            const FIELDS = 'id, producto_titulo, codigo, propietario, propietario_producto, precio_docena, gastos, bultos, cantidad_docenas, marca, tanda_nombre';

            const { data: byId } = await supabase.from('entradas')
                .select(FIELDS).eq('id', code).maybeSingle();

            if (byId) {
                setLastScanned(byId.codigo || byId.producto_titulo || code);
                selectEntrada(byId);
                return;
            }

            const codigoToSearch = codigoFallback || code;
            const { data, error } = await supabase.from('entradas')
                .select(FIELDS).eq('codigo', codigoToSearch);

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error(`Código "${codigoToSearch}" no encontrado`);
                setScanStatus('idle');
                return;
            }

            const byPropietario = new Map();
            data.forEach(e => {
                const key = getPropietario(e) ?? `__id_${e.id}`;
                if (!byPropietario.has(key)) byPropietario.set(key, []);
                byPropietario.get(key).push(e);
            });
            const uniquePropietarios = [...byPropietario.keys()];

            if (uniquePropietarios.length === 1) {
                const entries = byPropietario.get(uniquePropietarios[0]);
                if (entries.length === 1) {
                    selectEntrada(entries[0]);
                } else {
                    openTandaPicker(entries);
                }
            } else {
                setFoundEntradas(data);
                setShowPropietarioModal(true);
            }
        } catch {
            toast.error('Error al buscar el producto');
        } finally {
            setScanStatus('idle');
        }
    }, [isOnVentasPage, selectEntrada, openTandaPicker]);

    useGlobalScanner(processCode);

    const handleSelectPropietario = useCallback((propietarioKey) => {
        const entries = foundEntradas.filter(e => (getPropietario(e) ?? null) === propietarioKey);
        setShowPropietarioModal(false);
        setFoundEntradas([]);
        if (entries.length === 1) {
            selectEntrada(entries[0]);
        } else {
            openTandaPicker(entries);
        }
    }, [foundEntradas, selectEntrada, openTandaPicker]);

    const calcTransferencia = (ef, pct, tot) => {
        const base = Math.max(0, tot - (parseFloat(rawNum(ef)) || 0));
        if (base === 0) return '';
        return fmtMiles((base * (1 + (parseFloat(pct) || 0) / 100)).toFixed(0));
    };

    const handleEfectivoChange = (val) => {
        const fmt = fmtMiles(val);
        setMontoEfectivo(fmt);
        setMontoTransferencia(calcTransferencia(fmt, recargoPct, subTotal));
    };
    const handleTransferenciaChange = (val) => {
        const fmt = fmtMiles(val);
        setMontoTransferencia(fmt);
        const tr = parseFloat(rawNum(fmt)) || 0;
        const pct = parseFloat(recargoPct) || 0;
        const trBase = pct > 0 ? tr / (1 + pct / 100) : tr;
        const ef = Math.max(0, subTotal - trBase);
        setMontoEfectivo(ef > 0 ? fmtMiles(ef.toFixed(0)) : '');
    };
    const handleRecargoPctChange = (val) => {
        setRecargoPct(val);
        setMontoTransferencia(calcTransferencia(montoEfectivo, val, subTotal));
    };

    const subTotal = currentPrice && currentQty
        ? (parseFloat(rawNum(currentPrice)) || 0) * (parseFloat(currentQty) || 0)
        : 0;

    const ownerName = selectedEntrada ? getPropietario(selectedEntrada) : null;
    const ownerColor = ownerName ? getUserColor(ownerName) : '#9ca3af';

    const cartDocenasForSelected = selectedEntrada && stockInfo
        ? cart
            .filter(item => item.codigo === selectedEntrada.codigo && item.propietario === (ownerName || 'Sin propietario'))
            .reduce((sum, item) => sum + item.cantidad_docenas, 0)
        : 0;
    const stockAvailableNet = stockInfo && !stockInfo.loading
        ? stockInfo.total - stockInfo.sold - cartDocenasForSelected
        : null;
    const stockIsOut = stockAvailableNet !== null && stockAvailableNet <= 0;
    const stockIsLow = !stockIsOut && stockAvailableNet !== null && stockInfo.total > 0
        && (stockAvailableNet / stockInfo.total) <= 0.25;
    const stockBadgeColor = stockIsOut ? '#ef4444' : stockIsLow ? '#f59e0b' : '#16a34a';

    const addToCart = () => {
        if (!selectedEntrada) return;
        const qty = parseFloat(currentQty);
        const price = parseFloat(rawNum(currentPrice));
        if (!qty || qty <= 0) { toast.error('Ingresá una cantidad válida'); return; }
        if (!price || price <= 0) { toast.error('Ingresá un precio válido'); return; }

        const propietarioCheck = getPropietario(selectedEntrada) || 'Sin propietario';
        if (stockInfo && !stockInfo.loading) {
            const inCartQty = cart
                .filter(item => item.codigo === selectedEntrada.codigo && item.propietario === propietarioCheck)
                .reduce((sum, item) => sum + item.cantidad_docenas, 0);
            const available = stockInfo.total - stockInfo.sold - inCartQty;
            if (qty > available) {
                if (available <= 0) {
                    toast.error(`Sin stock disponible para ${propietarioCheck}`, { duration: 4000 });
                } else {
                    toast.error(`Solo quedan ${available % 1 === 0 ? available : available.toFixed(1)} docenas disponibles`, { duration: 4000 });
                }
                return;
            }
        }

        if (metodoPago !== 'efectivo' && !selectedCuenta) {
            toast.error('Seleccioná una cuenta bancaria'); return;
        }
        if (dolarFailed && !manualDolar) {
            toast.error('Ingresá el valor del dólar blue'); return;
        }

        const total = parseFloat((price * qty).toFixed(2));
        let mEfectivo = null;
        let mTransferencia = null;

        if (metodoPago === 'efectivo') {
            mEfectivo = total;
        } else if (metodoPago === 'transferencia') {
            const pct = parseFloat(recargoPct) || 0;
            mTransferencia = parseFloat((total * (1 + pct / 100)).toFixed(2));
        } else {
            const ef = parseFloat(rawNum(montoEfectivo));
            const tr = parseFloat(rawNum(montoTransferencia));
            if (!ef || ef <= 0) { toast.error('Ingresá el monto en efectivo'); return; }
            if (!tr || tr <= 0) { toast.error('El monto de transferencia debe ser mayor a 0'); return; }
            mEfectivo = ef;
            mTransferencia = parseFloat(tr.toFixed(2));
        }

        const totalRegistrado = metodoPago === 'efectivo'
            ? total
            : parseFloat(((mEfectivo || 0) + (mTransferencia || 0)).toFixed(2));

        const dolarGuardar = currentDolarBlue ?? (manualDolar ? parseFloat(manualDolar) : 0);

        if (selectedEntrada.codigo) {
            supabase.from('precios_custom').upsert(
                { codigo: selectedEntrada.codigo, precio_ars: price, updated_at: new Date().toISOString() },
                { onConflict: 'codigo' }
            );
        }

        setCart(prev => [...prev, {
            producto_titulo: selectedEntrada.producto_titulo || selectedEntrada.codigo,
            codigo: selectedEntrada.codigo,
            tanda_nombre: selectedEntrada.tanda_nombre || null,
            propietario: propietarioCheck,
            cantidad_docenas: qty,
            precio_docena_ars: price,
            total_ars: totalRegistrado,
            dolar_blue: dolarGuardar,
            metodo_pago: metodoPago,
            monto_efectivo: mEfectivo,
            monto_transferencia: mTransferencia,
            cuenta_id: selectedCuenta?.id || null,
            cuenta_nombre: selectedCuenta?.nombre || null,
        }]);

        toast.success('Agregado al carrito');
        resetForm();
    };

    const confirmSale = async () => {
        if (cart.length === 0) { toast.error('El carrito está vacío'); return; }
        setSaving(true);
        try {
            let registradoPor = sessionStorage.getItem('app_username') || null;
            if (!registradoPor) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.email) {
                    const { data: appUser } = await supabase.from('app_users')
                        .select('username').eq('email', user.email).maybeSingle();
                    registradoPor = appUser?.username || user.user_metadata?.full_name || user.email || null;
                }
            }
            const _now = new Date();
            const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
            const ventaId = crypto.randomUUID();
            const nombrePedidoTrim = nombrePedido.trim() || null;
            const records = cart.map(({ dolar_blue, ...item }) => ({
                ...item,
                fecha: today,
                dolar_blue,
                venta_id: ventaId,
                nombre_pedido: nombrePedidoTrim,
                registrado_por: registradoPor,
            }));
            const { error } = await supabase.from('ventas').insert(records);
            if (error) throw error;
            toast.success(`✓ ${records.length} venta(s) registrada(s)`);
            closeSheet();
        } catch {
            toast.error('Error al guardar las ventas');
        } finally {
            setSaving(false);
        }
    };

    const searchProducts = useCallback(async (query) => {
        if (!query.trim()) { setSearchResults([]); return; }
        setSearchLoading(true);
        try {
            const FIELDS = 'id, producto_titulo, codigo, propietario, propietario_producto, cantidad_docenas, marca, tanda_nombre, precio_docena, gastos, bultos';
            const { data, error } = await supabase.from('entradas')
                .select(FIELDS)
                .or(`codigo.ilike.%${query}%,producto_titulo.ilike.%${query}%,propietario.ilike.%${query}%,marca.ilike.%${query}%`)
                .order('tanda_nombre', { ascending: false })
                .limit(20);
            if (error) throw error;
            setSearchResults(data || []);
        } catch {
            toast.error('Error al buscar productos');
        } finally {
            setSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(searchQuery), 320);
        return () => clearTimeout(timer);
    }, [searchQuery, searchProducts]);

    const totalCarrito = cart.reduce((sum, i) => sum + i.total_ars, 0);
    const fmt = (n) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    if (isOnVentasPage) return null;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={closeSheet}
                />
            )}

            {/* Bottom Sheet */}
            <div
                ref={sheetRef}
                className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out"
                style={{ transform: isOpen ? 'translateY(0)' : 'translateY(100%)' }}
            >
                <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[88vh] flex flex-col">
                    {/* Handle */}
                    <div className="flex items-center justify-center pt-3 pb-1 flex-shrink-0">
                        <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pb-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <ScanLine className="w-5 h-5 text-primary" />
                            <span className="font-bold text-foreground text-base">Registrar Venta</span>
                            {cart.length > 0 && (
                                <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {cart.length}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={closeSheet}
                            className="p-2 rounded-xl hover:bg-muted text-muted-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-4">

                        {/* Estado de escaneo */}
                        {scanStatus === 'searching' && (
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                <Loader2 className="w-4 h-4 text-yellow-600 animate-spin flex-shrink-0" />
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                    Buscando <strong>{lastScanned}</strong>...
                                </p>
                            </div>
                        )}

                        {/* Producto seleccionado */}
                        {loadingPrice && (
                            <div className="flex items-center gap-2 p-4 border border-border rounded-xl">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Cargando precio...</span>
                            </div>
                        )}

                        {selectedEntrada && !loadingPrice && (
                            <div className="border border-border rounded-xl overflow-hidden">
                                {/* Cabecera del producto */}
                                <div
                                    className="p-3 flex items-center gap-3"
                                    style={{ backgroundColor: ownerColor + '12', borderBottom: `1px solid ${ownerColor}30` }}
                                >
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: ownerColor + '25', border: `2px solid ${ownerColor}` }}
                                    >
                                        <User className="w-4 h-4" style={{ color: ownerColor }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">
                                            {selectedEntrada.producto_titulo || selectedEntrada.codigo || '—'}
                                        </p>
                                        <p className="text-xs font-semibold truncate" style={{ color: ownerColor }}>
                                            {ownerName || 'Sin propietario'}
                                            {selectedEntrada.tanda_nombre && (
                                                <span className="text-muted-foreground font-normal ml-1">· {selectedEntrada.tanda_nombre}</span>
                                            )}
                                        </p>
                                    </div>
                                    {/* Stock badge */}
                                    {stockInfo && !stockInfo.loading && (
                                        <span
                                            className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1"
                                            style={{ backgroundColor: stockBadgeColor + '15', color: stockBadgeColor }}
                                        >
                                            {stockIsOut
                                                ? <><AlertTriangle className="w-3 h-3" />Sin stock</>
                                                : <><Package className="w-3 h-3" />{stockAvailableNet % 1 === 0 ? stockAvailableNet : stockAvailableNet?.toFixed(1)} doc.</>
                                            }
                                        </span>
                                    )}
                                </div>

                                {/* Formulario precio + cantidad */}
                                <div className="p-3 space-y-3">
                                    {dolarFailed && (
                                        <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-700">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400">Sin dólar automático</p>
                                            <input
                                                type="number"
                                                value={manualDolar}
                                                onChange={e => setManualDolar(e.target.value)}
                                                placeholder="Dólar blue"
                                                className="ml-auto w-24 text-sm border border-amber-300 rounded-lg px-2 py-1 bg-white dark:bg-amber-950/30 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400"
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground font-medium block mb-1">Precio / docena</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={currentPrice}
                                                    onChange={e => setCurrentPrice(fmtMiles(e.target.value))}
                                                    className="w-full pl-7 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground font-medium block mb-1">Cantidad (doc.)</label>
                                            <input
                                                type="number"
                                                value={currentQty}
                                                onChange={e => setCurrentQty(e.target.value)}
                                                min="0.5"
                                                step="0.5"
                                                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            />
                                        </div>
                                    </div>

                                    {subTotal > 0 && (
                                        <p className="text-right text-sm font-semibold text-foreground">
                                            Subtotal: <span className="text-primary">{fmt(subTotal)}</span>
                                        </p>
                                    )}

                                    {/* Método de pago */}
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium block mb-2">Método de pago</label>
                                        <div className="flex gap-2">
                                            {METODOS.map(({ id, label, Icon }) => (
                                                <button
                                                    key={id}
                                                    type="button"
                                                    onClick={() => setMetodoPago(id)}
                                                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all"
                                                    style={metodoPago === id
                                                        ? { borderColor: ownerColor, backgroundColor: ownerColor + '15', color: ownerColor }
                                                        : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                                                >
                                                    <Icon className="w-4 h-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cuenta bancaria */}
                                    {(metodoPago === 'transferencia' || metodoPago === 'mixto') && (
                                        <div>
                                            <label className="text-xs text-muted-foreground font-medium block mb-1">Cuenta bancaria</label>
                                            <div className="flex flex-col gap-1.5">
                                                {cuentas.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => setSelectedCuenta(selectedCuenta?.id === c.id ? null : c)}
                                                        className="w-full text-left px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all"
                                                        style={selectedCuenta?.id === c.id
                                                            ? { borderColor: ownerColor, backgroundColor: ownerColor + '12', color: ownerColor }
                                                            : { borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                                    >
                                                        <span className="font-semibold">{c.nombre}</span>
                                                        {c.banco && <span className="text-muted-foreground text-xs ml-1">· {c.banco}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Montos mixto */}
                                    {metodoPago === 'mixto' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-muted-foreground font-medium block mb-1">Efectivo</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={montoEfectivo}
                                                        onChange={e => handleEfectivoChange(e.target.value)}
                                                        className="w-full pl-7 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground font-medium block mb-1">Transferencia</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={montoTransferencia}
                                                        onChange={e => handleTransferenciaChange(e.target.value)}
                                                        className="w-full pl-7 pr-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recargo transferencia */}
                                    {(metodoPago === 'transferencia' || metodoPago === 'mixto') && (
                                        <div>
                                            <label className="text-xs text-muted-foreground font-medium block mb-1">Recargo %</label>
                                            <input
                                                type="number"
                                                value={recargoPct}
                                                onChange={e => handleRecargoPctChange(e.target.value)}
                                                min="0"
                                                step="1"
                                                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                                placeholder="0"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={addToCart}
                                        disabled={stockIsOut}
                                        className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: ownerColor, color: '#fff' }}
                                    >
                                        <ShoppingCart className="w-4 h-4" />
                                        Agregar al carrito
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Buscador manual */}
                        {!selectedEntrada && !loadingPrice && scanStatus === 'idle' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSearchModal(true);
                                    setTimeout(() => searchInputRef.current?.focus(), 80);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
                            >
                                <Search className="w-4 h-4" />
                                Buscar sin etiqueta
                            </button>
                        )}

                        {/* Carrito */}
                        {cart.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Carrito ({cart.length})
                                </p>
                                {cart.map((item, i) => {
                                    const color = getUserColor(item.propietario);
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 p-3 rounded-xl border"
                                            style={{ borderColor: color + '40', backgroundColor: color + '08' }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    {item.producto_titulo}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.cantidad_docenas} doc. · {fmt(item.precio_docena_ars)}/doc.
                                                    {item.metodo_pago !== 'efectivo' && (
                                                        <span className="ml-1">· {item.metodo_pago}</span>
                                                    )}
                                                </p>
                                            </div>
                                            <p className="text-sm font-bold flex-shrink-0" style={{ color }}>
                                                {fmt(item.total_ars)}
                                            </p>
                                            <button
                                                onClick={() => setCart(prev => prev.filter((_, idx) => idx !== i))}
                                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}

                                <div className="flex items-center justify-between px-1">
                                    <p className="text-sm font-semibold text-foreground">Total</p>
                                    <p className="text-base font-bold text-primary">{fmt(totalCarrito)}</p>
                                </div>

                                <input
                                    type="text"
                                    value={nombrePedido}
                                    onChange={e => setNombrePedido(e.target.value)}
                                    placeholder="Nombre del pedido (opcional)"
                                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />

                                <button
                                    type="button"
                                    onClick={confirmSale}
                                    disabled={saving}
                                    className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                                >
                                    {saving
                                        ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</>
                                        : <><CheckCircle className="w-4 h-4" />Confirmar venta</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal selector de propietario */}
            {showPropietarioModal && (() => {
                const byProp = new Map();
                for (const e of foundEntradas) {
                    const key = getPropietario(e) ?? null;
                    if (!byProp.has(key)) byProp.set(key, []);
                    byProp.get(key).push(e);
                }
                return (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-foreground text-sm">Seleccioná el propietario</h3>
                                    <p className="text-xs text-muted-foreground">Código: <strong>{lastScanned}</strong></p>
                                </div>
                                <button
                                    onClick={() => { setShowPropietarioModal(false); setFoundEntradas([]); }}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-4 space-y-2">
                                {[...byProp.entries()].map(([propKey, entries]) => {
                                    const color = getUserColor(propKey);
                                    return (
                                        <button
                                            key={propKey ?? '__sin_prop__'}
                                            onClick={() => handleSelectPropietario(propKey)}
                                            className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all hover:shadow-md active:scale-[0.98] flex items-center gap-3"
                                            style={{ borderColor: color + '60', backgroundColor: color + '08' }}
                                        >
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: color + '25', border: `2px solid ${color}` }}
                                            >
                                                <User className="w-3.5 h-3.5" style={{ color }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm" style={{ color }}>{propKey || 'Sin propietario'}</p>
                                                <p className="text-xs text-muted-foreground truncate">{entries[0].producto_titulo}</p>
                                            </div>
                                            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: color + '20', color }}>
                                                {entries.length} tanda{entries.length !== 1 ? 's' : ''}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal selector de tanda */}
            {showTandaModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-foreground text-sm">Seleccioná la tanda</h3>
                                <p className="text-xs text-muted-foreground">{tandaEntries[0]?.producto_titulo}</p>
                            </div>
                            <button
                                onClick={() => { setShowTandaModal(false); setTandaEntries([]); }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {loadingTandaStock && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {!loadingTandaStock && tandaEntries.map(entry => {
                                const propKey = getPropietario(entry);
                                const color = getUserColor(propKey);
                                const sold = tandaSoldMap[entry.tanda_nombre || '__unknown__'] || 0;
                                const total = Number(entry.cantidad_docenas) || 0;
                                const available = total - sold;
                                const isOut = available <= 0 && total > 0;
                                const stockColor = isOut ? '#ef4444' : '#16a34a';
                                return (
                                    <button
                                        key={entry.id}
                                        onClick={() => { setShowTandaModal(false); selectEntrada(entry); }}
                                        className="w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] flex items-center gap-3"
                                        style={{ borderColor: color + '60', backgroundColor: color + '08' }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-foreground">{entry.tanda_nombre || '—'}</p>
                                            <p className="text-xs" style={{ color: stockColor }}>
                                                {isOut ? 'Sin stock' : `${available % 1 === 0 ? available : available.toFixed(1)} / ${total} doc. disponibles`}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal buscador manual */}
            {showSearchModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col justify-end">
                    <div className="bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col">
                        <div className="p-4 border-b border-border flex items-center gap-3">
                            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Código, nombre, marca..."
                                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                            {searchLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                            <button
                                onClick={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); }}
                                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {!searchQuery.trim() && (
                                <p className="text-center text-sm text-muted-foreground py-10">Escribí para buscar</p>
                            )}
                            {searchQuery.trim() && !searchLoading && searchResults.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-10">Sin resultados</p>
                            )}
                            <ul className="divide-y divide-border">
                                {searchResults.map(entry => {
                                    const propKey = getPropietario(entry);
                                    const color = getUserColor(propKey);
                                    return (
                                        <li key={entry.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSearchModal(false);
                                                    setSearchQuery('');
                                                    setSearchResults([]);
                                                    selectEntrada(entry);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center gap-3"
                                            >
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: color + '20', border: `2px solid ${color}` }}
                                                >
                                                    <User className="w-3.5 h-3.5" style={{ color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        {entry.producto_titulo || entry.codigo || '—'}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {entry.codigo && (
                                                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                                {entry.codigo}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-semibold" style={{ color }}>
                                                            {propKey || 'Sin propietario'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
