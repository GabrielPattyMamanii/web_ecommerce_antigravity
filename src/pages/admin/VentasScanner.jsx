import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { calcPrice } from '../../utils/pricingUtils';
import toast from 'react-hot-toast';
import {
    ScanLine, Trash2, CheckCircle, Package,
    ShoppingCart, X, User, Info, Loader2, Tag, Store,
    Banknote, ArrowLeftRight, Blend, Building2, Pencil
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
    const [currentIndice, setCurrentIndice] = useState('');
    const [indicePreset, setIndicePreset] = useState('');
    const [dolarFailed, setDolarFailed] = useState(false);
    const [manualDolar, setManualDolar] = useState('');
    const [savedPrice, setSavedPrice] = useState(null);
    const priceInputRef = useRef(null);
    const qtyInputRef = useRef(null);
    const productCardRef = useRef(null);

    // --- Pago ---
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [selectedCuenta, setSelectedCuenta] = useState(null);
    const [montoEfectivo, setMontoEfectivo] = useState('');
    const [montoTransferencia, setMontoTransferencia] = useState('');
    const [recargoPct, setRecargoPct] = useState('');

    // --- Carrito ---
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);

    // --- Editar ítem del carrito ---
    const [editingIndex, setEditingIndex] = useState(null);
    const [editPrice, setEditPrice] = useState('');
    const [editQty, setEditQty] = useState('');
    const [editMetodo, setEditMetodo] = useState('efectivo');
    const [editCuenta, setEditCuenta] = useState(null);
    const [editEfectivo, setEditEfectivo] = useState('');
    const [editTransferencia, setEditTransferencia] = useState('');
    const [editRecargoPct, setEditRecargoPct] = useState('');

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
        setMontoTransferencia('');
        setRecargoPct('');
    };

    const calcTransferencia = (ef, pct, tot) => {
        const base = Math.max(0, tot - (parseFloat(ef) || 0));
        if (base === 0) return '';
        const con_recargo = base * (1 + (parseFloat(pct) || 0) / 100);
        return con_recargo.toFixed(0);
    };

    const handleEfectivoChange = (val) => {
        setMontoEfectivo(val);
        setMontoTransferencia(calcTransferencia(val, recargoPct, total));
    };

    const handleRecargoPctChange = (val) => {
        setRecargoPct(val);
        setMontoTransferencia(calcTransferencia(montoEfectivo, val, total));
    };

    const selectEntrada = useCallback(async (entrada) => {
        setShowPropietarioModal(false);
        setFoundEntradas([]);
        setSelectedEntrada(entrada);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setCurrentIndice('');
        setIndicePreset('');
        setDolarFailed(false);
        setManualDolar('');
        setPrecioInfo(null);
        setSavedPrice(null);
        resetPago();
        setLoadingPrice(true);

        try {
            const [dolarRes, settingsRes, precioCustomRes] = await Promise.all([
                fetch('https://dolarapi.com/v1/dolares/blue'),
                supabase
                    .from('tanda_settings')
                    .select('indice_ganancia_valor')
                    .eq('tanda_nombre', entrada.tanda_nombre)
                    .maybeSingle(),
                entrada.codigo
                    ? supabase.from('precios_custom').select('precio_ars').eq('codigo', entrada.codigo).maybeSingle()
                    : Promise.resolve({ data: null }),
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

            const precioCustom = precioCustomRes.data?.precio_ars ?? null;
            if (precioCustom != null) {
                setCurrentPrice(precioCustom.toFixed(0));
                setSavedPrice(precioCustom);
            } else if (prices.precioVentaArg != null) {
                setCurrentPrice(prices.precioVentaArg.toFixed(0));
            }
            setCurrentDolarBlue(dolarBlue);
            setCurrentIndice(indice.toString());
            setIndicePreset(['1.4', '1.5', '1.6'].includes(indice.toFixed(1)) ? indice.toFixed(1) : 'custom');
            setPrecioInfo({ dolar: dolarBlue, indice });
        } catch {
            setDolarFailed(true);
            setCurrentIndice('1.5');
            setIndicePreset('1.5');
            toast.error('No se pudo obtener el dólar blue — ingresá el precio y el dólar manualmente');
        } finally {
            setLoadingPrice(false);
        }
    }, []);

    // Al seleccionar un producto, desplazar la vista hasta la tarjeta (útil en móvil)
    // sin enfocar ningún input, para que el usuario vea y edite si lo desea.
    useEffect(() => {
        if (selectedEntrada) {
            requestAnimationFrame(() => {
                productCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    }, [selectedEntrada]);

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
                    if (raw.startsWith('http')) {
                        try {
                            // URL bien formada (funciona en desarrollo o si el scanner no garbliza)
                            const url = new URL(raw);
                            const segments = url.pathname.split('/').filter(Boolean);
                            code = segments[segments.length - 1] || raw;
                            // ?c= es el código del producto, usado si el ID quedó desactualizado
                            codigoFallback = url.searchParams.get('c') || null;
                        } catch {
                            // URL garbled por layout de teclado español (: → Ñ, / → -, - → ', ? → _, = → ¡)
                            // Restaurar los guiones del UUID (los ' reemplazan los - del UUID)
                            const normalized = raw.replace(/'/g, '-');
                            // Extraer UUID del patrón -scan-{uuid}
                            const uuidMatch = normalized.match(
                                /-scan-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
                            );
                            // Extraer código de producto del patrón _c{cualquier_char}{codigo}
                            const codeMatch = normalized.match(/_c.(.+)$/);
                            if (uuidMatch) code = uuidMatch[1];
                            if (codeMatch) codigoFallback = codeMatch[1];
                        }
                    }
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

    const recalcWithIndice = (entrada, dolar, indiceVal) => {
        const idx = parseFloat(indiceVal);
        if (!idx || !dolar || !entrada) return;
        const prices = calcPrice(
            { ...entrada, _source: 'entradas' },
            { cotizacion_dolar: dolar, indice_ganancia_valor: idx }
        );
        if (prices.precioVentaArg != null) {
            setCurrentPrice(prices.precioVentaArg.toFixed(0));
        }
    };

    const handleIndiceChange = (val) => {
        setCurrentIndice(val);
        const dolar = currentDolarBlue ?? (manualDolar ? parseFloat(manualDolar) : null);
        recalcWithIndice(selectedEntrada, dolar, val);
    };

    const handleManualDolarChange = (val) => {
        setManualDolar(val);
        recalcWithIndice(selectedEntrada, parseFloat(val), currentIndice);
    };

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
            const pct = parseFloat(recargoPct) || 0;
            mTransferencia = parseFloat((total * (1 + pct / 100)).toFixed(2));
        } else {
            // mixto
            const ef = parseFloat(montoEfectivo);
            const tr = parseFloat(montoTransferencia);
            if (!ef || ef <= 0) {
                toast.error('Ingresá el monto en efectivo');
                return;
            }
            if (!tr || tr <= 0) {
                toast.error('El monto de transferencia debe ser mayor a 0');
                return;
            }
            mEfectivo = ef;
            mTransferencia = parseFloat(tr.toFixed(2));
        }

        const totalRegistrado = metodoPago === 'efectivo'
            ? total
            : parseFloat(((mEfectivo || 0) + (mTransferencia || 0)).toFixed(2));

        const propietario = getPropietario(selectedEntrada) || 'Sin propietario';

        const dolarGuardar = currentDolarBlue ?? (manualDolar ? parseFloat(manualDolar) : 0);

        if (dolarFailed && !manualDolar) {
            toast.error('Ingresá el valor del dólar blue');
            return;
        }

        setCart(prev => [...prev, {
            producto_titulo: selectedEntrada.producto_titulo || selectedEntrada.codigo,
            codigo: selectedEntrada.codigo,
            propietario,
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

        if (selectedEntrada.codigo) {
            const codigoGuardar = selectedEntrada.codigo;
            supabase.from('precios_custom').upsert(
                { codigo: codigoGuardar, precio_ars: price, updated_at: new Date().toISOString() },
                { onConflict: 'codigo' }
            ).then(({ error }) => {
                if (error) toast.error(`No se pudo guardar el precio: ${error.message}`);
            });
        }

        setSelectedEntrada(null);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setCurrentIndice('');
        setIndicePreset('');
        setDolarFailed(false);
        setManualDolar('');
        setPrecioInfo(null);
        setSavedPrice(null);
        resetPago();
        toast.success('Agregado al carrito');
    };

    const confirmSale = async () => {
        if (cart.length === 0) { toast.error('El carrito está vacío'); return; }

        setSaving(true);
        try {
            const _now = new Date();
            const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
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

    const abortSale = () => {
        if (cart.length === 0) return;
        if (!window.confirm('¿Abortar la venta? Se eliminarán todos los productos del carrito.')) return;
        setCart([]);
        setSelectedEntrada(null);
        setFoundEntradas([]);
        setShowPropietarioModal(false);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setCurrentIndice('');
        setIndicePreset('');
        setDolarFailed(false);
        setManualDolar('');
        setPrecioInfo(null);
        setSavedPrice(null);
        setEditingIndex(null);
        resetPago();
        toast.success('Venta abortada — carrito vacío');
    };

    const openEdit = (index) => {
        const item = cart[index];
        setEditingIndex(index);
        setEditPrice(item.precio_docena_ars.toString());
        setEditQty(item.cantidad_docenas.toString());
        setEditMetodo(item.metodo_pago);
        setEditCuenta(cuentas.find(c => c.id === item.cuenta_id) || null);
        setEditEfectivo(item.monto_efectivo != null ? item.monto_efectivo.toString() : '');
        setEditTransferencia(item.monto_transferencia != null ? item.monto_transferencia.toString() : '');
        setEditRecargoPct('');
    };

    const saveEdit = () => {
        const qty = parseFloat(editQty);
        const price = parseFloat(editPrice);
        if (!qty || qty <= 0) { toast.error('Cantidad inválida'); return; }
        if (!price || price <= 0) { toast.error('Precio inválido'); return; }

        const baseTotal = parseFloat((price * qty).toFixed(2));

        if (editMetodo !== 'efectivo' && !editCuenta) {
            toast.error('Seleccioná una cuenta bancaria');
            return;
        }

        let mEfectivo = null;
        let mTransferencia = null;

        if (editMetodo === 'efectivo') {
            mEfectivo = baseTotal;
        } else if (editMetodo === 'transferencia') {
            mTransferencia = parseFloat(editTransferencia) || baseTotal;
        } else {
            const ef = parseFloat(editEfectivo);
            const tr = parseFloat(editTransferencia);
            if (!ef || ef <= 0) { toast.error('Ingresá el monto en efectivo'); return; }
            if (!tr || tr <= 0) { toast.error('El monto de transferencia debe ser mayor a 0'); return; }
            mEfectivo = ef;
            mTransferencia = parseFloat(tr.toFixed(2));
        }

        const totalRegistrado = editMetodo === 'efectivo'
            ? baseTotal
            : parseFloat(((mEfectivo || 0) + (mTransferencia || 0)).toFixed(2));

        setCart(prev => prev.map((item, i) => i !== editingIndex ? item : {
            ...item,
            cantidad_docenas: qty,
            precio_docena_ars: price,
            total_ars: totalRegistrado,
            metodo_pago: editMetodo,
            monto_efectivo: mEfectivo,
            monto_transferencia: mTransferencia,
            cuenta_id: editCuenta?.id || null,
            cuenta_nombre: editCuenta?.nombre || null,
        }));

        setEditingIndex(null);
        toast.success('Ítem actualizado');
    };

    const totalCarrito = cart.reduce((sum, i) => sum + i.total_ars, 0);

    const ownerName = selectedEntrada ? getPropietario(selectedEntrada) : null;
    const ownerColor = ownerName ? getUserColor(ownerName) : '#9ca3af';

    const total = currentPrice && currentQty
        ? parseFloat(currentPrice) * parseFloat(currentQty)
        : 0;

    const editItem = editingIndex !== null ? cart[editingIndex] : null;
    const editColor = editItem ? getUserColor(editItem.propietario) : '#9ca3af';
    const editTotalCalc = editPrice && editQty ? (parseFloat(editPrice) || 0) * (parseFloat(editQty) || 0) : 0;

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

            {/* Modal: editar ítem del carrito */}
            {editingIndex !== null && editItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <div
                            className="px-5 pt-5 pb-4 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-card z-10"
                            style={{ borderLeft: `4px solid ${editColor}` }}
                        >
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-foreground">Editar ítem</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{editItem.producto_titulo}</p>
                            </div>
                            <button
                                onClick={() => setEditingIndex(null)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Precio y cantidad */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                        Precio / docena (ARS)
                                    </label>
                                    <input
                                        type="number"
                                        value={editPrice}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setEditPrice(val);
                                            if (editRecargoPct) {
                                                const tot = (parseFloat(val) || 0) * (parseFloat(editQty) || 0);
                                                if (editMetodo === 'transferencia') {
                                                    setEditTransferencia((tot * (1 + (parseFloat(editRecargoPct) || 0) / 100)).toFixed(0));
                                                } else if (editMetodo === 'mixto') {
                                                    setEditTransferencia(calcTransferencia(editEfectivo, editRecargoPct, tot));
                                                }
                                            }
                                        }}
                                        className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                        Cantidad (doc)
                                    </label>
                                    <input
                                        type="number"
                                        value={editQty}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setEditQty(val);
                                            if (editRecargoPct) {
                                                const tot = (parseFloat(editPrice) || 0) * (parseFloat(val) || 0);
                                                if (editMetodo === 'transferencia') {
                                                    setEditTransferencia((tot * (1 + (parseFloat(editRecargoPct) || 0) / 100)).toFixed(0));
                                                } else if (editMetodo === 'mixto') {
                                                    setEditTransferencia(calcTransferencia(editEfectivo, editRecargoPct, tot));
                                                }
                                            }
                                        }}
                                        min="0.5"
                                        step="0.5"
                                        className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
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
                                        const active = editMetodo === id;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => {
                                                    setEditMetodo(id);
                                                    setEditCuenta(null);
                                                    setEditEfectivo('');
                                                    setEditTransferencia('');
                                                    setEditRecargoPct('');
                                                }}
                                                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all"
                                                style={active
                                                    ? { borderColor: editColor, backgroundColor: editColor + '15', color: editColor }
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

                            {/* Cuenta destino */}
                            {(editMetodo === 'transferencia' || editMetodo === 'mixto') && (
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                        Cuenta destino
                                    </label>
                                    {cuentas.length === 0 ? (
                                        <p className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-xl">
                                            No hay cuentas activas.
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {cuentas.map(cuenta => {
                                                const sel = editCuenta?.id === cuenta.id;
                                                return (
                                                    <button
                                                        key={cuenta.id}
                                                        type="button"
                                                        onClick={() => setEditCuenta(cuenta)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all"
                                                        style={sel
                                                            ? { borderColor: editColor, backgroundColor: editColor + '15' }
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
                                                                style={{ backgroundColor: editColor }}
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recargo transferencia */}
                            {editMetodo === 'transferencia' && editTotalCalc > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Recargo transferencia
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                value={editRecargoPct}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setEditRecargoPct(val);
                                                    setEditTransferencia((editTotalCalc * (1 + (parseFloat(val) || 0) / 100)).toFixed(0));
                                                }}
                                                placeholder="0"
                                                min="0"
                                                className="w-16 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none text-center font-medium"
                                            />
                                            <span className="text-xs text-muted-foreground font-semibold">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                            Monto transferencia (ARS)
                                        </label>
                                        <input
                                            type="number"
                                            value={editTransferencia}
                                            onChange={e => setEditTransferencia(e.target.value)}
                                            placeholder={editTotalCalc.toFixed(0)}
                                            className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Montos mixto */}
                            {editMetodo === 'mixto' && editTotalCalc > 0 && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                            Monto en efectivo (ARS)
                                        </label>
                                        <input
                                            type="number"
                                            value={editEfectivo}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setEditEfectivo(val);
                                                setEditTransferencia(calcTransferencia(val, editRecargoPct, editTotalCalc));
                                            }}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Transferencia (ARS)
                                            </label>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-muted-foreground">Recargo</span>
                                                <input
                                                    type="number"
                                                    value={editRecargoPct}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditRecargoPct(val);
                                                        setEditTransferencia(calcTransferencia(editEfectivo, val, editTotalCalc));
                                                    }}
                                                    placeholder="0"
                                                    min="0"
                                                    className="w-16 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none text-center font-medium"
                                                />
                                                <span className="text-xs text-muted-foreground font-semibold">%</span>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            value={editTransferencia}
                                            onChange={e => setEditTransferencia(e.target.value)}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Total */}
                            {editTotalCalc > 0 && (
                                <div
                                    className="rounded-xl px-4 py-3 flex items-center justify-between"
                                    style={{ backgroundColor: editColor + '12', border: `1px solid ${editColor}30` }}
                                >
                                    <span className="text-sm font-medium text-muted-foreground">Total base</span>
                                    <span className="text-2xl font-bold" style={{ color: editColor }}>
                                        ${editTotalCalc.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                        <span className="text-sm font-semibold ml-1 opacity-70">ARS</span>
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={saveEdit}
                                className="w-full py-3 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2 text-white"
                                style={{ backgroundColor: editColor }}
                            >
                                <CheckCircle className="w-5 h-5" />
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card del producto seleccionado */}
            {selectedEntrada && (
                <div
                    ref={productCardRef}
                    className="bg-card rounded-2xl overflow-hidden shadow-md scroll-mt-4"
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
                                {!loadingPrice && savedPrice != null && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold" style={{ color: ownerColor }}>
                                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                        Precio guardado: ${Number(savedPrice).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </div>
                                )}
                                {!loadingPrice && precioInfo && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                                        <Info className="w-3 h-3 flex-shrink-0" />
                                        Dólar: ${Number(precioInfo.dolar).toLocaleString('es-AR')} · Índice: {currentIndice || precioInfo.indice}
                                    </div>
                                )}
                                {!loadingPrice && dolarFailed && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-yellow-600">
                                        <Info className="w-3 h-3 flex-shrink-0" />
                                        API del dólar no disponible — ingresá precio y dólar manualmente
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


                        {/* Dólar manual (solo si la API falló) */}
                        {dolarFailed && (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                    Cotización dólar blue (ARS)
                                </label>
                                <input
                                    type="number"
                                    value={manualDolar}
                                    onChange={e => handleManualDolarChange(e.target.value)}
                                    placeholder="Ej: 1250"
                                    className="w-full px-3 py-2.5 border border-yellow-400 rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                />
                            </div>
                        )}

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

                        {/* Recargo transferencia completa */}
                        {metodoPago === 'transferencia' && total > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Recargo transferencia
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            value={recargoPct}
                                            onChange={e => handleRecargoPctChange(e.target.value)}
                                            placeholder="0"
                                            min="0"
                                            className="w-16 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none text-center font-medium"
                                        />
                                        <span className="text-xs text-muted-foreground font-semibold">%</span>
                                    </div>
                                </div>
                                {parseFloat(recargoPct) > 0 && (
                                    <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-xl">
                                        <span className="text-amber-700 font-medium">
                                            ${total.toLocaleString('es-AR', { maximumFractionDigits: 0 })} + {recargoPct}%
                                        </span>
                                        <span className="font-bold text-amber-700">
                                            ${(total * (1 + parseFloat(recargoPct) / 100)).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Montos mixto */}
                        {metodoPago === 'mixto' && total > 0 && (
                            <div className="space-y-3">
                                {/* Efectivo */}
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wide">
                                        Monto en efectivo (ARS)
                                    </label>
                                    <input
                                        type="number"
                                        value={montoEfectivo}
                                        onChange={e => handleEfectivoChange(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Transferencia + recargo */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Transferencia (ARS)
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-muted-foreground">Recargo</span>
                                            <input
                                                type="number"
                                                value={recargoPct}
                                                onChange={e => handleRecargoPctChange(e.target.value)}
                                                placeholder="0"
                                                min="0"
                                                className="w-16 px-2 py-1.5 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none text-center font-medium"
                                            />
                                            <span className="text-xs text-muted-foreground font-semibold">%</span>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        value={montoTransferencia}
                                        onChange={e => setMontoTransferencia(e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        className="w-full px-3 py-2.5 border border-input rounded-xl text-base bg-background text-foreground focus:outline-none font-medium"
                                    />
                                </div>

                                {/* Resumen desglose */}
                                {parseFloat(montoEfectivo) > 0 && parseFloat(montoTransferencia) > 0 && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-muted rounded-lg px-3 py-2 text-center">
                                                <p className="text-muted-foreground">Efectivo</p>
                                                <p className="font-bold text-foreground">
                                                    ${parseFloat(montoEfectivo).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                            <div className="bg-muted rounded-lg px-3 py-2 text-center">
                                                <p className="text-muted-foreground flex items-center justify-center gap-1">
                                                    Transferencia
                                                    {parseFloat(recargoPct) > 0 && (
                                                        <span className="text-amber-600 font-semibold">+{recargoPct}%</span>
                                                    )}
                                                </p>
                                                <p className="font-bold text-foreground">
                                                    ${parseFloat(montoTransferencia).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                        </div>
                                        {parseFloat(recargoPct) > 0 && (
                                            <div className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-xl">
                                                <span className="text-amber-700 font-medium">Total con recargo</span>
                                                <span className="font-bold text-amber-700">
                                                    ${(parseFloat(montoEfectivo) + parseFloat(montoTransferencia)).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                                                </span>
                                            </div>
                                        )}
                                    </>
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
                                        <div className="flex items-center gap-0.5 mt-0.5 justify-end">
                                            <button
                                                onClick={() => openEdit(i)}
                                                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}
                                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="p-4 border-t border-border space-y-2">
                        <button
                            onClick={confirmSale}
                            disabled={saving}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {saving ? 'Guardando...' : `Confirmar venta · $${totalCarrito.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS`}
                        </button>
                        <button
                            onClick={abortSale}
                            disabled={saving}
                            className="w-full bg-transparent border-2 border-destructive/30 hover:bg-destructive/10 text-destructive py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <Trash2 className="w-4 h-4" />
                            Abortar venta
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
