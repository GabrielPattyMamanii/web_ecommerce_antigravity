import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { calcPrice } from '../../utils/pricingUtils';
import toast from 'react-hot-toast';
import {
    ScanLine, Trash2, CheckCircle, Package,
    ShoppingCart, X, User, Info, Loader2
} from 'lucide-react';

export function VentasScanner() {
    // --- Scanner ---
    const scanBufferRef = useRef('');
    const lastKeyTimeRef = useRef(0);
    const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'scanning' | 'searching'
    const [lastScanned, setLastScanned] = useState('');

    // --- Producto encontrado ---
    const [foundEntradas, setFoundEntradas] = useState([]);
    const [showPropietarioModal, setShowPropietarioModal] = useState(false);
    const [selectedEntrada, setSelectedEntrada] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [precioInfo, setPrecioInfo] = useState(null); // { dolar, indice } de tanda_settings

    // --- Formulario de ítem actual ---
    const [currentPrice, setCurrentPrice] = useState('');
    const [currentQty, setCurrentQty] = useState('1');
    const [currentDolarBlue, setCurrentDolarBlue] = useState(null);
    const priceInputRef = useRef(null);
    const qtyInputRef = useRef(null);

    // --- Carrito ---
    const [cart, setCart] = useState([]);
    const [saving, setSaving] = useState(false);

    // ── Seleccionar entrada y calcular precio igual que "Precio Venta Sugerido" ──
    // Consulta en paralelo: dólar blue actual de la API + índice guardado de la tanda.
    // No requiere que el usuario haya guardado el dólar en tanda_settings.
    const selectEntrada = useCallback(async (entrada) => {
        setShowPropietarioModal(false);
        setFoundEntradas([]);
        setSelectedEntrada(entrada);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setPrecioInfo(null);
        setLoadingPrice(true);

        try {
            // Ambas consultas en paralelo
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

            // Índice de la tanda, o 1.5 por defecto si no está configurado
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
        } catch (err) {
            toast.error('No se pudo obtener el dólar blue — ingresá el precio manualmente');
        } finally {
            setLoadingPrice(false);
            setTimeout(() => priceInputRef.current?.focus(), 50);
        }
    }, []);

    const processCode = useCallback(async (code) => {
        setScanStatus('searching');
        setLastScanned(code);
        setSelectedEntrada(null);
        setFoundEntradas([]);

        try {
            const FIELDS = 'id, producto_titulo, codigo, propietario, precio_docena, gastos, bultos, cantidad_docenas, marca, tanda_nombre';

            // Los QR del sistema encodean el ID de la entrada.
            // Intentar primero por id; si no encuentra, buscar por campo 'codigo'.
            const { data: byId } = await supabase
                .from('entradas')
                .select(FIELDS)
                .eq('id', code)
                .maybeSingle();

            if (byId) {
                // Mostrar el código legible en el modal, no el UUID
                const codigoLegible = byId.codigo || byId.producto_titulo || code;
                setLastScanned(codigoLegible);

                // Si la entrada no tiene codigo, ir directo (sin modal)
                if (!byId.codigo) {
                    selectEntrada(byId);
                    return;
                }

                // Buscar todos los propietarios del mismo codigo (sin filtrar por tanda
                // para evitar fallos por diferencias de mayúsculas en el nombre de tanda)
                const { data: byCodigo, error: codigoErr } = await supabase
                    .from('entradas')
                    .select(FIELDS)
                    .eq('codigo', byId.codigo);

                // Si la consulta falla o no trae nada, usar la entrada original
                if (codigoErr || !byCodigo || byCodigo.length === 0) {
                    selectEntrada(byId);
                    return;
                }

                // Deduplicar por propietario (clave = propietario o id si propietario es null)
                const seen = new Map();
                byCodigo.forEach(e => {
                    const key = e.propietario ?? `__id_${e.id}`;
                    if (!seen.has(key)) seen.set(key, e);
                });
                const unique = [...seen.values()];

                if (unique.length === 1) {
                    selectEntrada(unique[0]);
                } else {
                    setFoundEntradas(unique);
                    setShowPropietarioModal(true);
                }
                return;
            }

            const { data, error } = await supabase
                .from('entradas')
                .select(FIELDS)
                .eq('codigo', code);

            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error(`Código "${code}" no encontrado`);
                setScanStatus('idle');
                return;
            }

            // Deduplicar por propietario (si propietario es null, usar id como clave)
            const seen = new Map();
            data.forEach(e => {
                const key = e.propietario ?? `__id_${e.id}`;
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

    // ── Listener global de teclado para el escáner USB ────────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            const active = document.activeElement;
            const isUserInput =
                active &&
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) &&
                !active.dataset.scanner;
            if (isUserInput) return;

            const now = Date.now();

            if (e.key === 'Enter') {
                e.preventDefault();
                const raw = scanBufferRef.current.trim();
                scanBufferRef.current = '';
                setScanStatus('idle');
                if (raw.length >= 2) {
                    let code = raw;
                    try {
                        if (raw.startsWith('http')) {
                            const url = new URL(raw);
                            const segments = url.pathname.split('/').filter(Boolean);
                            code = segments[segments.length - 1] || raw;
                        }
                    } catch { /* no es URL */ }
                    processCode(code);
                }
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
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

    // ── Agregar al carrito ─────────────────────────────────────────────────────
    const addToCart = () => {
        if (!selectedEntrada) return;
        const qty = parseFloat(currentQty);
        const price = parseFloat(currentPrice);

        if (!qty || qty <= 0) { toast.error('Ingresá una cantidad válida'); return; }
        if (!price || price <= 0) { toast.error('Ingresá un precio válido'); return; }

        setCart(prev => [...prev, {
            producto_titulo: selectedEntrada.producto_titulo || selectedEntrada.codigo,
            codigo: selectedEntrada.codigo,
            propietario: selectedEntrada.propietario || 'Sin propietario',
            cantidad_docenas: qty,
            precio_docena_ars: price,
            total_ars: parseFloat((price * qty).toFixed(2)),
            dolar_blue: currentDolarBlue ?? 0,
        }]);

        setSelectedEntrada(null);
        setCurrentPrice('');
        setCurrentQty('1');
        setCurrentDolarBlue(null);
        setPrecioInfo(null);
        toast.success('Agregado al carrito');
    };

    // ── Confirmar venta ────────────────────────────────────────────────────────
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

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

            {/* ── Título ── */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Registrar Venta</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Escaneá los productos con el lector QR para agregar al carrito
                </p>
            </div>

            {/* ── Zona de escaneo ── */}
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
                {scanStatus === 'idle' && (
                    <p className="text-muted-foreground text-sm">Listo para escanear</p>
                )}
                {scanStatus === 'scanning' && (
                    <p className="text-primary font-medium text-sm animate-pulse">Escaneando...</p>
                )}
                {scanStatus === 'searching' && (
                    <p className="text-yellow-600 text-sm">
                        Buscando <strong>{lastScanned}</strong>...
                    </p>
                )}
            </div>

            {/* ── Modal: seleccionar propietario ── */}
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
                            {foundEntradas.map((entrada, i) => (
                                <button
                                    key={entrada.id ?? i}
                                    onClick={() => selectEntrada(entrada)}
                                    className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-foreground text-sm">
                                                {entrada.propietario || 'Sin propietario'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {entrada.producto_titulo} · {entrada.marca} · {entrada.tanda_nombre}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Formulario del ítem seleccionado ── */}
            {selectedEntrada && (
                <div className="bg-card border border-primary/40 rounded-xl p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Package className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="font-bold text-foreground">
                                    {selectedEntrada.producto_titulo || selectedEntrada.codigo}
                                </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                <span>Código: {selectedEntrada.codigo}</span>
                                <span>Marca: {selectedEntrada.marca}</span>
                                <span>Tanda: {selectedEntrada.tanda_nombre}</span>
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {selectedEntrada.propietario || 'Sin propietario'}
                                </span>
                            </div>

                            {/* Info de precio */}
                            {loadingPrice && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Cargando precio de venta sugerido...
                                </div>
                            )}
                            {!loadingPrice && precioInfo && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                    <Info className="w-3 h-3 flex-shrink-0" />
                                    Precio según tanda · Dólar: ${Number(precioInfo.dolar).toLocaleString('es-AR')} · Índice: {precioInfo.indice}
                                </div>
                            )}
                            {!loadingPrice && !precioInfo && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-600">
                                    <Info className="w-3 h-3 flex-shrink-0" />
                                    No se pudo calcular el precio automáticamente — ingresalo manualmente
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedEntrada(null)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                                Precio por docena (ARS)
                            </label>
                            <input
                                ref={priceInputRef}
                                type="number"
                                value={currentPrice}
                                onChange={e => setCurrentPrice(e.target.value)}
                                placeholder={loadingPrice ? 'Calculando...' : 'Ingresar precio'}
                                disabled={loadingPrice}
                                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); qtyInputRef.current?.focus(); } }}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">
                                Cantidad (docenas)
                            </label>
                            <input
                                ref={qtyInputRef}
                                type="number"
                                value={currentQty}
                                onChange={e => setCurrentQty(e.target.value)}
                                min="0.5"
                                step="0.5"
                                className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground focus:border-primary focus:outline-none"
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToCart(); } }}
                            />
                        </div>
                    </div>

                    {currentPrice && currentQty && (
                        <p className="text-sm text-muted-foreground">
                            Total: <strong className="text-foreground">
                                ${(parseFloat(currentPrice) * parseFloat(currentQty)).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                            </strong>
                        </p>
                    )}

                    <button
                        onClick={addToCart}
                        disabled={loadingPrice}
                        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Agregar al carrito
                    </button>
                </div>
            )}

            {/* ── Carrito ── */}
            {cart.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Carrito ({cart.length})
                        </h3>
                        <span className="text-sm font-bold text-foreground">
                            Total: ${totalCarrito.toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                        </span>
                    </div>

                    <ul className="divide-y divide-border">
                        {cart.map((item, i) => (
                            <li key={i} className="px-5 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {item.producto_titulo}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.propietario} · {item.cantidad_docenas} doc × ${Number(item.precio_docena_ars).toLocaleString('es-AR')} = <strong>${item.total_ars.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setCart(prev => prev.filter((_, j) => j !== i))}
                                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="p-4 border-t border-border">
                        <button
                            onClick={confirmSale}
                            disabled={saving}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {saving ? 'Guardando...' : `Confirmar venta (${cart.length} ítem${cart.length > 1 ? 's' : ''})`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
