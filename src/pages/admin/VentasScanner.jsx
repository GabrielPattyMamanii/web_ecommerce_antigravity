import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { calcPrice } from '../../utils/pricingUtils';
import toast from 'react-hot-toast';
import {
    ScanLine, Trash2, CheckCircle, Package,
    ShoppingCart, X, User, Info, Loader2, Tag, Store,
    Banknote, ArrowLeftRight, Blend, Building2
} from 'lucide-react';

const METODOS = [
    { id: 'efectivo',       label: 'Efectivo',       Icon: Banknote },
    { id: 'transferencia',  label: 'Transferencia',  Icon: Building2 },
    { id: 'mixto',          label: 'Mixto',          Icon: Blend },
];

export function VentasScanner() {
    // --- Scanner ---
    const scanBufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const [scanStatus, setScanStatus] = useState('idle');
    const [lastScanned, setLastScanned] = useState('');

    // --- Usuarios y cuentas ---
    const [appUsers, setAppUsers] = useState([]);
    const [cuentas, setCuentas] = useState([]);

    // --- Producto encontrado ---
    const [foundEntradas, setFoundEntradas] = useState([]);
    const [showPropietarioModal, setShowPropietarioModal] = useState(false);
    const [selectedEntrada, setSelectedEntrada] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [precioInfo, setPrecioInfo] = useState(null);

    // --- Formulario de ítem actual ---
    const [currentPrice, setCurrentPrice] = useState('');
    const [currentQty, setCurrentQty] = useState('1');
    const [currentDolarBlue, setCurrentDolarBlue] = useState(null);
    const priceInputRef = useRef(null);
    const qtyInputRef = useRef(null);

    // --- Pago ---
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [selectedCuenta, setSelectedCuenta] = useState(null);
    const [montoEfectivo, setMontoEfectivo] = useState('');

    // --- Carrito ---
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);

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

    const resetPago = () => {
        setMetodoPago('efectivo');
        setSelectedCuenta(null);
        setMontoEfectivo('');
    };

    const selectEntrada = useCallback(async (entrada) => {
        setShowPropietarioModal(false);
        setFoundEntradas([]);
        setSelectedEntrada(entrada);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setPrecioInfo(null);
        resetPago();
        setLoadingPrice(true);

        try {
            const [dolarRes, settingsRes] = await Promise.all([
                fetch('https://dolarapi.com/v1/dolares/blue'),
                supabase
                    .from('tanda_settings')
                    .select('indice_ganancia_valor')
                    .eq('tanda_nombre', entrada.tanda_nombre)
                    .maybeSingle(),
            ]);

            if (!dolarRes.ok) throw new Error('API dólar no disponible');
            const dolarJson = await dolarRes.json();
            const dolarBlue = parseFloat(dolarJson?.venta);
            if (!dolarBlue) throw new Error('Sin valor de dólar');

            const indice = parseFloat(settingsRes.data?.indice_ganancia_valor || 1.5);

            const prices = calcPrice(
                { ...entrada, _source: 'entradas' },
                { cotizacion_dolar: dolarBlue, indice_ganancia_valor: indice }
            );

            if (prices.precioVentaArg != null) {
                setCurrentPrice(prices.precioVentaArg.toFixed(0));
            }
            setCurrentDolarBlue(dolarBlue);
            setPrecioInfo({ dolar: dolarBlue, indice });
        } catch {
            toast.error('No se pudo obtener el dólar blue — ingresá el precio manualmente');
        } finally {
            setLoadingPrice(false);
            setTimeout(() => priceInputRef.current?.focus(), 50);
        }
    }, []);

    const processCode = useCallback(async (code, codigoFallback = null) => {
        setScanStatus('searching');
        setLastScanned(codigoFallback || code);
        setSelectedEntrada(null);
        setFoundEntradas([]);

        try {
            const FIELDS = 'id, producto_titulo, codigo, propietario, propietario_producto, precio_docena, gastos, bultos, cantidad_docenas, marca, tanda_nombre';

            // 1. Buscar por ID (UUID/bigint del QR)
            const { data: byId } = await supabase
                .from('entradas')
                .select(FIELDS)
                .eq('id', code)
                .maybeSingle();

            if (byId) {
                setLastScanned(byId.codigo || byId.producto_titulo || code);
                selectEntrada(byId);
                return;
            }

            // 2. Si el ID no existe (tanda re-guardada → IDs cambiaron), intentar con ?c=codigo
            const codigoToSearch = codigoFallback || code;

            const { data, error } = await supabase
                .from('entradas')
                .select(FIELDS)
                .eq('codigo', codigoToSearch);

            if (error) throw error;

            if (!data || data.length === 0) {
                if (codigoFallback) {
                    toast.error(`Producto "${codigoFallback}" no encontrado — regenerá el QR`);
                } else {
                    toast.error(`Código "${code}" no encontrado`);
                }
                setScanStatus('idle');
                return;
            }

            const seen = new Map();
            data.forEach(e => {
                const key = getPropietario(e) ?? `__id_${e.id}`;
                if (!seen.has(key)) seen.set(key, e);
            });
            const unique = [...seen.values()];

            if (unique.length === 1) {
                selectEntrada(unique[0]);
            } else {
                setFoundEntradas(unique);
                setShowPropietarioModal(true);
            }
        } catch {
            toast.error('Error al buscar el producto');
        } finally {
            setScanStatus('idle');
        }
    }, [selectEntrada]);

    useEffect(() => {
        const onKeyDown = (e) => {
            const active = document.activeElement;
            const isUserInput =
                active &&
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) &&
                !active.dataset.scanner;

            const now = Date.now();
            const timeSinceLastKey = now - lastKeyTimeRef.current;

            if (e.key === 'Enter') {
                const raw = scanBufferRef.current.trim();
                scanBufferRef.current = '';
                setScanStatus('idle');

                if (raw.length >= 2) {
                    // Hay contenido en el buffer → es un escaneo, procesar siempre
                    e.preventDefault();
                    let code = raw;
                    let codigoFallback = null;
                    try {
                        if (raw.startsWith('http')) {
                            const url = new URL(raw);
                            const segments = url.pathname.split('/').filter(Boolean);
                            code = segments[segments.length - 1] || raw;
                            // ?c= es el código del producto, usado si el ID quedó desactualizado
                            codigoFallback = url.searchParams.get('c') || null;
                        }
                    } catch { /* no es URL */ }
                    processCode(code, codigoFallback);
                }
                // Si buffer vacío, dejar que Enter actúe normal en el input
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (isUserInput) {
                    // Continuación de un escaneo en curso (caracteres llegando rápido)
                    const isScanContinuation = scanBufferRef.current.length > 0 && timeSinceLastKey < 80;
                    if (isScanContinuation) {
                        // Capturar en buffer y bloquear el input para que no reciba el char
                        e.preventDefault();
                    } else if (timeSinceLastKey > 800) {
                        // Pausa larga → resetear buffer (podría ser escritura manual)
                        scanBufferRef.current = '';
                    }
                    // Primer char del escaneo: va al input Y al buffer (sin prevent)
                    // los siguientes chars llegan rápido y se bloquean del input
                } else {
                    e.preventDefault();
                }

                if (now - lastKeyTimeRef.current > 800) {
                    scanBufferRef.current = '';
                }
                scanBufferRef.current += e.key;
                lastKeyTimeRef.current = now;
                setScanStatus('scanning');
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [processCode]);

    const addToCart = () => {
        if (!selectedEntrada) return;
        const qty = parseFloat(currentQty);
        const price = parseFloat(currentPrice);

        if (!qty || qty <= 0) { toast.error('Ingresá una cantidad válida'); return; }
        if (!price || price <= 0) { toast.error('Ingresá un precio válido'); return; }

        const total = parseFloat((price * qty).toFixed(2));

        if (metodoPago !== 'efectivo' && !selectedCuenta) {
            toast.error('Seleccioná una cuenta bancaria');
            return;
        }

        let mEfectivo = null;
        let mTransferencia = null;

        if (metodoPago === 'efectivo') {
            mEfectivo = total;
        } else if (metodoPago === 'transferencia') {
            mTransferencia = total;
        } else {
            // mixto
            const ef = parseFloat(montoEfectivo);
            if (!ef || ef <= 0 || ef >= total) {
                toast.error('El monto en efectivo debe ser mayor a 0 y menor al total');
                return;
            }
            mEfectivo = ef;
            mTransferencia = parseFloat((total - ef).toFixed(2));
        }

        const propietario = getPropietario(selectedEntrada) || 'Sin propietario';

        setCart(prev => [...prev, {
            producto_titulo: selectedEntrada.producto_titulo || selectedEntrada.codigo,
            codigo: selectedEntrada.codigo,
            propietario,
            cantidad_docenas: qty,
            precio_docena_ars: price,
            total_ars: total,
            dolar_blue: currentDolarBlue ?? 0,
            metodo_pago: metodoPago,
            monto_efectivo: mEfectivo,
            monto_transferencia: mTransferencia,
            cuenta_id: selectedCuenta?.id || null,
            cuenta_nombre: selectedCuenta?.nombre || null,
        }]);

        setSelectedEntrada(null);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setPrecioInfo(null);
        resetPago();
        toast.success('Agregado al carrito');
    };

    const confirmSale = async () => {
        if (cart.length === 0) { toast.error('El carrito está vacío'); return; }

        setSaving(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const records = cart.map(({ dolar_blue, ...item }) => ({
                ...item,
                fecha: today,
                dolar_blue,
            }));

            const { error } = await supabase.from('ventas').insert(records);
            if (error) throw error;

            setCart([]);
            toast.success(`✓ ${records.length} venta(s) registrada(s)`);
        } catch {
            toast.error('Error al guardar las ventas');
        } finally {
            setSaving(false);
        }
    };

    const totalCarrito = cart.reduce((sum, i) => sum + i.total_ars, 0);

    const ownerName = selectedEntrada ? getPropietario(selectedEntrada) : null;
    const ownerColor = ownerName ? getUserColor(ownerName) : '#9ca3af';

    const total = currentPrice && currentQty
        ? parseFloat(currentPrice) * parseFloat(currentQty)
        : 0;

    const montoTransferenciaCalculado = metodoPago === 'mixto' && montoEfectivo
        ? Math.max(0, total - parseFloat(montoEfectivo || 0))
        : null;

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

            <div>
                <h1 className="text-2xl font-bold text-foreground">Registrar Venta</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Escaneá los productos con el lector QR para agregar al carrito
                </p>
            </div>

            {/* Zona de escaneo */}
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors
                ${scanStatus === 'scanning'
                    ? 'border-primary bg-primary/5'
                    : scanStatus === 'searching'
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
                        : 'border-border bg-muted/30'}`}
            >
                <ScanLine className={`w-10 h-10 mx-auto mb-2 transition-colors
                    ${scanStatus === 'scanning' ? 'text-primary' : 'text-muted-foreground'}`}
                />
                {scanStatus === 'idle' && <p className="text-muted-foreground text-sm">Listo para escanear</p>}
                {scanStatus === 'scanning' && <p className="text-primary font-medium text-sm animate-pulse">Escaneando...</p>}
                {scanStatus === 'searching' && (
                    <p className="text-yellow-600 text-sm">Buscando <strong>{lastScanned}</strong>...</p>
                )}
            </div>

            {/* Modal: seleccionar propietario */}
            {showPropietarioModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-foreground">Seleccioná el propietario</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Código: <strong>{lastScanned}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowPropietarioModal(false); setFoundEntradas([]); }}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {foundEntradas.map((entrada, i) => {
                                const name = getPropietario(entrada);
                                const color = getUserColor(name);
                                return (
                                    <button
                                        key={entrada.id ?? i}
                                        onClick={() => selectEntrada(entrada)}
                                        className="w-full text-left px-4 py-3 rounded-xl border transition-all hover:shadow-md"
                                        style={{ borderColor: color + '60', backgroundColor: color + '08' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: color + '25', border: `2px solid ${color}` }}
                                            >
                                                <User className="w-4 h-4" style={{ color }} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm" style={{ color }}>
                                                    {name || 'Sin propietario'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {entrada.producto_titulo} · {entrada.marca}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Card del producto seleccionado */}
            {selectedEntrada && (
                <div
                    className="bg-card rounded-2xl overflow-hidden shadow-md"
                    style={{ borderLeft: `5px solid ${ownerColor}` }}
                >
                    {/* Cabecera */}
                    <div className="px-5 pt-5 pb-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold text-foreground leading-tight">
                                    {selectedEntrada.producto_titulo || selectedEntrada.codigo}
                                </h2>
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {selectedEntrada.codigo && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">
                                            <Tag className="w-3 h-3" />{selectedEntrada.codigo}
                                        </span>
                                    )}
                                    {selectedEntrada.marca && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">
                                            <Store className="w-3 h-3" />{selectedEntrada.marca}
                                        </span>
                                    )}
                                    {selectedEntrada.tanda_nombre && (
                                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">
                                            {selectedEntrada.tanda_nombre}
                                        </span>
                                    )}
                                    <span
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{
                                            backgroundColor: ownerColor + '20',
                                            color: ownerColor,
                                            border: `1px solid ${ownerColor}50`,
                                        }}
                                    >
                                        <User className="w-3 h-3" />
                                        {ownerName || 'Sin propietario'}
                                    </span>
                                </div>

                                {loadingPrice && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Calculando precio sugerido...
                                    </div>
                                )}
                                {!loadingPrice && precioInfo && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                                        <Info className="w-3 h-3 flex-shrink-0" />
                                        Dólar: ${Number(precioInfo.dolar).toLocaleString('es-AR')} · Índice: {precioInfo.indice}
                                    </div>
                                )}
                                {!loadingPrice && !precioInfo && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-yellow-600">
                                        <Info className="w-3 h-3 flex-shrink-0" />
                                        Ingresá el precio manualmente
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setSelectedEntrada(null)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0 mt-0.5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="h-px mx-5" style={{ backgroundColor: ownerColor + '30' }} />

                    {/* Formulario */}
                    <div className="px-5 py-4 space-y-4">

                        {/* Precio y cantidad */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                    Precio por docena (ARS)
                                </label>
                                <input
                                    ref={priceInputRef}
                                    type="number"
                                    value={currentPrice}
                                    onChange={e => setCurrentPrice(e.target.value)}
                                    placeholder={loadingPrice ? 'Calculando...' : '0'}
                                    disabled={loadingPrice}
                                    className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none disabled:opacity-50 font-medium"
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); qtyInputRef.current?.focus(); } }}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                    Cantidad (docenas)
                                </label>
                                <input
                                    ref={qtyInputRef}
                                    type="number"
                                    value={currentQty}
                                    onChange={e => setCurrentQty(e.target.value)}
                                    min="0.5"
                                    step="0.5"
                                    className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); } }}
                                />
                            </div>
                        </div>

                        {/* Método de pago */}
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wide">
                                Método de pago
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {METODOS.map(({ id, label, Icon }) => {
                                    const active = metodoPago === id;
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => { setMetodoPago(id); setSelectedCuenta(null); setMontoEfectivo(''); }}
                                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
                                            style={active
                                                ? { borderColor: ownerColor, backgroundColor: ownerColor + '15', color: ownerColor }
                                                : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                                            }
                                        >
                                            <Icon className="w-4 h-4" />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selector de cuenta */}
                        {(metodoPago === 'transferencia' || metodoPago === 'mixto') && (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                    Cuenta destino
                                </label>
                                {cuentas.length === 0 ? (
                                    <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-xl">
                                        No hay cuentas activas. Agregá una en Cuentas Bancarias.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {cuentas.map(cuenta => {
                                            const sel = selectedCuenta?.id === cuenta.id;
                                            return (
                                                <button
                                                    key={cuenta.id}
                                                    type="button"
                                                    onClick={() => setSelectedCuenta(cuenta)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all"
                                                    style={sel
                                                        ? { borderColor: ownerColor, backgroundColor: ownerColor + '15' }
                                                        : { borderColor: 'var(--border)' }
                                                    }
                                                >
                                                    <Building2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-foreground">{cuenta.nombre}</p>
                                                        <p className="text-xs text-muted-foreground">{cuenta.titular}</p>
                                                    </div>
                                                    {sel && (
                                                        <div
                                                            className="ml-auto w-4 h-4 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: ownerColor }}
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Monto efectivo (solo mixto) */}
                        {metodoPago === 'mixto' && total > 0 && (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                    Monto en efectivo (ARS)
                                </label>
                                <input
                                    type="number"
                                    value={montoEfectivo}
                                    onChange={e => setMontoEfectivo(e.target.value)}
                                    placeholder="0"
                                    min="0"
                                    max={total - 1}
                                    className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                />
                                {montoEfectivo && parseFloat(montoEfectivo) > 0 && parseFloat(montoEfectivo) < total && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-muted rounded-lg px-3 py-2 text-center">
                                            <p className="text-muted-foreground">Efectivo</p>
                                            <p className="font-bold text-foreground">
                                                ${parseFloat(montoEfectivo).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="bg-muted rounded-lg px-3 py-2 text-center">
                                            <p className="text-muted-foreground">Transferencia</p>
                                            <p className="font-bold text-foreground">
                                                ${montoTransferenciaCalculado?.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Total destacado */}
                        {total > 0 && (
                            <div
                                className="rounded-xl px-4 py-3 flex items-center justify-between"
                                style={{ backgroundColor: ownerColor + '12', border: `1px solid ${ownerColor}30` }}
                            >
                                <span className="text-sm font-medium text-muted-foreground">Total</span>
                                <span className="text-2xl font-bold" style={{ color: ownerColor }}>
                                    ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    <span className="text-sm font-semibold ml-1 opacity-70">ARS</span>
                                </span>
                            </div>
                        )}

                        <button
                            onClick={addToCart}
                            disabled={loadingPrice}
                            className="w-full py-3 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                            style={{ backgroundColor: ownerColor }}
                        >
                            <ShoppingCart className="w-5 h-5" />
                            Agregar al carrito
                        </button>
                    </div>
                </div>
            )}

            {/* Carrito */}
            {cart.length > 0 && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Carrito
                            <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                {cart.length}
                            </span>
                        </h3>
                        <span className="text-base font-bold text-foreground">
                            ${totalCarrito.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            <span className="text-xs font-normal text-muted-foreground ml-1">ARS</span>
                        </span>
                    </div>

                    <ul className="divide-y divide-border">
                        {cart.map((item, i) => {
                            const color = getUserColor(item.propietario);
                            const MetodoIcon = METODOS.find(m => m.id === item.metodo_pago)?.Icon || Banknote;
                            return (
                                <li key={i} className="px-5 py-3.5 flex items-center gap-3">
                                    <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">
                                            {item.producto_titulo}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                            <span
                                                className="text-xs font-medium px-1.5 py-0.5 rounded"
                                                style={{ backgroundColor: color + '20', color }}
                                            >
                                                {item.propietario}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {item.cantidad_docenas} doc × ${Number(item.precio_docena_ars).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        {/* Desglose de pago */}
                                        <div className="flex items-center gap-1 mt-1">
                                            <MetodoIcon className="w-3 h-3 text-muted-foreground" />
                                            {item.metodo_pago === 'efectivo' && (
                                                <span className="text-xs text-muted-foreground">Efectivo</span>
                                            )}
                                            {item.metodo_pago === 'transferencia' && (
                                                <span className="text-xs text-muted-foreground">
                                                    Transferencia → {item.cuenta_nombre}
                                                </span>
                                            )}
                                            {item.metodo_pago === 'mixto' && (
                                                <span className="text-xs text-muted-foreground">
                                                    ${item.monto_efectivo?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} efectivo
                                                    + ${item.monto_transferencia?.toLocaleString('es-AR', { maximumFractionDigits: 0 })} → {item.cuenta_nombre}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-foreground">
                                            ${item.total_ars.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                        </p>
                                        <button
                                            onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}
                                            className="mt-0.5 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="p-4 border-t border-border">
                        <button
                            onClick={confirmSale}
                            disabled={saving}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {saving ? 'Guardando...' : `Confirmar venta · $${totalCarrito.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
