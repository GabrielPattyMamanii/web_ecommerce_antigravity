import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
    UserCheck, RefreshCw, Search, AlertTriangle, X, Undo2, Package, Loader2, Info
} from 'lucide-react';

// Asignar propietario a productos que se vendieron sin dueño y pasar ese dueño a sus ventas.
// La reasignación real la hace la función de base de datos `asignar_propietario` (una sola transacción,
// con registro para poder deshacerla). Esta pantalla muestra qué se va a mover y pide confirmación.
// Ver supabase/migrations/20261015_asignar_propietario.sql.

const SIN_PROPIETARIO = 'Sin propietario';
const PAGE = 1000;

const norm = (s) => (s || '').trim();
const ownerOf = (e) => norm(e.propietario_producto) || norm(e.propietario);
const fmtMoney = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-AR')}`;
const fmtNum = (n) => {
    const x = Number(n) || 0;
    return x % 1 === 0 ? String(x) : x.toFixed(1);
};
const fmtFecha = (iso) => iso
    ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';

// Trae todas las filas de una consulta paginando (Supabase devuelve como máximo 1000 por pedido)
async function fetchAllPages(buildQuery) {
    let all = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await buildQuery().range(from, from + PAGE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        if (!data || data.length < PAGE) break;
    }
    return all;
}

export function AsignarPropietario() {
    const [loading, setLoading] = useState(true);
    const [entradas, setEntradas] = useState([]);
    const [ventasPend, setVentasPend] = useState([]);   // ventas 'Sin propietario' con entrada_id
    const [sinVinculo, setSinVinculo] = useState(0);    // ventas 'Sin propietario' sin entrada_id (no se pueden mover)
    const [owners, setOwners] = useState([]);           // [{ username, color }]
    const [history, setHistory] = useState([]);
    const [historyError, setHistoryError] = useState(false);

    const [filterTanda, setFilterTanda] = useState('');
    const [filterMarca, setFilterMarca] = useState('');
    const [filterEstado, setFilterEstado] = useState('todos');
    const [search, setSearch] = useState('');

    const [selected, setSelected] = useState(() => new Set());
    const [ownerSel, setOwnerSel] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [working, setWorking] = useState(false);
    const [undoing, setUndoing] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [entradasData, ventasData, sinVincRes, ownersRes, histRes] = await Promise.all([
                fetchAllPages(() => supabase
                    .from('entradas')
                    .select('id, tanda_nombre, tanda_fecha, marca, codigo, producto_titulo, propietario, propietario_producto, cantidad_docenas, cant_docenas_copy')
                    .order('tanda_fecha', { ascending: false })
                    .order('id', { ascending: true })),
                fetchAllPages(() => supabase
                    .from('ventas')
                    .select('id, entrada_id, total_ars, monto_transferencia, cuenta_nombre, cantidad_docenas')
                    .eq('propietario', SIN_PROPIETARIO)
                    .not('entrada_id', 'is', null)
                    .order('id', { ascending: true })),
                supabase.from('ventas').select('id', { count: 'exact', head: true })
                    .eq('propietario', SIN_PROPIETARIO).is('entrada_id', null),
                supabase.rpc('get_app_user_colors'),
                supabase.from('reasignaciones_propietario').select('*').order('created_at', { ascending: false }).limit(50),
            ]);
            setEntradas(entradasData);
            setVentasPend(ventasData);
            setSinVinculo(sinVincRes.count || 0);
            setOwners((ownersRes.data || []).filter(u => u.username));
            if (histRes.error) {
                setHistoryError(true);
                setHistory([]);
            } else {
                setHistoryError(false);
                setHistory(histRes.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Ventas pendientes agrupadas por producto
    const pendPorEntrada = useMemo(() => {
        const map = {};
        for (const v of ventasPend) {
            const m = map[v.entrada_id] || (map[v.entrada_id] = { count: 0, docenas: 0, total: 0, transf: 0, cuentas: {} });
            const total = Number(v.total_ars) || 0;
            const transf = Number(v.monto_transferencia) || 0;
            m.count += 1;
            m.docenas += Number(v.cantidad_docenas) || 0;
            m.total += total;
            m.transf += transf;
            if (transf > 0) {
                const c = v.cuenta_nombre || 'Sin cuenta';
                m.cuentas[c] = (m.cuentas[c] || 0) + transf;
            }
        }
        return map;
    }, [ventasPend]);

    // Productos que necesitan acción: sin dueño, o con dueño pero con ventas todavía como 'Sin propietario'
    const rows = useMemo(() => entradas
        .map(e => {
            const owner = ownerOf(e);
            const pend = pendPorEntrada[e.id] || null;
            return { ...e, owner, pend };
        })
        .filter(r => !r.owner || r.pend), [entradas, pendPorEntrada]);

    const tandas = useMemo(() => [...new Set(rows.map(r => r.tanda_nombre).filter(Boolean))], [rows]);
    const marcas = useMemo(() => [...new Set(rows
        .filter(r => !filterTanda || r.tanda_nombre === filterTanda)
        .map(r => r.marca).filter(Boolean))].sort(), [rows, filterTanda]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(r => {
            if (filterTanda && r.tanda_nombre !== filterTanda) return false;
            if (filterMarca && r.marca !== filterMarca) return false;
            if (filterEstado === 'sin-dueno' && r.owner) return false;
            if (filterEstado === 'con-ventas' && !(r.pend && !r.owner)) return false;
            if (filterEstado === 'pendientes' && !(r.pend && r.owner)) return false;
            if (q && !`${r.codigo || ''} ${r.producto_titulo || ''}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, filterTanda, filterMarca, filterEstado, search]);

    const ownerColor = (name) => owners.find(u => u.username === name)?.color || '#9ca3af';

    const toggle = (id) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
    const toggleAllVisible = () => setSelected(prev => {
        const next = new Set(prev);
        if (allVisibleSelected) filtered.forEach(r => next.delete(r.id));
        else filtered.forEach(r => next.add(r.id));
        return next;
    });

    // Productos seleccionados, separados según el dueño elegido
    const seleccion = useMemo(() => {
        const sel = rows.filter(r => selected.has(r.id));
        const ok = sel.filter(r => !r.owner || r.owner === ownerSel);
        const omitidos = sel.filter(r => r.owner && r.owner !== ownerSel);
        const sum = (f) => ok.reduce((s, r) => s + (r.pend ? f(r.pend) : 0), 0);
        const cuentas = {};
        ok.forEach(r => {
            if (!r.pend) return;
            Object.entries(r.pend.cuentas).forEach(([c, m]) => { cuentas[c] = (cuentas[c] || 0) + m; });
        });
        const total = sum(p => p.total);
        const transf = sum(p => p.transf);
        return {
            sel, ok, omitidos, cuentas,
            ventas: sum(p => p.count),
            docenas: sum(p => p.docenas),
            total, transf, efectivo: total - transf,
        };
    }, [rows, selected, ownerSel]);

    const confirmar = async () => {
        if (!ownerSel || seleccion.ok.length === 0) return;
        setWorking(true);
        try {
            const { data, error } = await supabase.rpc('asignar_propietario', {
                p_entrada_ids: seleccion.ok.map(r => r.id),
                p_propietario: ownerSel,
            });
            if (error) throw error;
            toast.success(`✓ ${data?.productos ?? 0} producto(s) asignados a ${ownerSel} · ${data?.ventas ?? 0} venta(s) pasadas (${fmtMoney(data?.total_ars)})`, { duration: 7000 });
            if (data?.omitidos?.length) toast(`Se omitieron ${data.omitidos.length} producto(s) que ya tenían otro dueño.`, { icon: '⚠️' });
            setShowPreview(false);
            setSelected(new Set());
            await fetchAll();
        } catch (err) {
            const msg = String(err?.message || '');
            if (msg.includes('Could not find the function') || err?.code === 'PGRST202') {
                toast.error('Falta ejecutar la migración 20261015_asignar_propietario.sql en Supabase.', { duration: 8000 });
            } else if (msg.includes('No autorizado')) {
                toast.error('No tenés permiso para asignar propietarios.');
            } else {
                toast.error(`No se pudo asignar: ${msg || 'error desconocido'}`);
            }
        } finally {
            setWorking(false);
        }
    };

    const deshacer = async (h) => {
        if (!window.confirm(`¿Deshacer la asignación de ${h.codigo || h.producto_titulo} a ${h.propietario_nuevo}?\nSus ${h.ventas_count} venta(s) vuelven a "Sin propietario".`)) return;
        setUndoing(h.id);
        try {
            const { data, error } = await supabase.rpc('deshacer_reasignacion', { p_id: h.id });
            if (error) throw error;
            toast.success(`Deshecho: ${data?.ventas ?? 0} venta(s) volvieron a "Sin propietario"${data?.producto_restaurado ? ' y el producto quedó sin dueño' : ''}.`, { duration: 6000 });
            await fetchAll();
        } catch (err) {
            toast.error(`No se pudo deshacer: ${err?.message || 'error desconocido'}`);
        } finally {
            setUndoing(null);
        }
    };

    const inputCls = 'rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20';

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Encabezado */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Asignar propietario</h1>
                        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
                            Elegí el dueño de los productos que se vendieron sin propietario. Se le asigna el producto y se pasan a ese dueño sus ventas anteriores.
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                </button>
            </div>

            {/* Avisos */}
            {sinVinculo > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        Hay <strong>{sinVinculo}</strong> venta(s) como "Sin propietario" que <strong>no están vinculadas a un producto</strong> (ventas viejas): esta pantalla no puede moverlas.
                    </span>
                </div>
            )}
            {historyError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        No se encontró el registro de reasignaciones. Ejecutá la migración <code className="font-mono">supabase/migrations/20261015_asignar_propietario.sql</code> en Supabase antes de usar esta pantalla.
                    </span>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tanda</label>
                    <select className={inputCls} value={filterTanda} onChange={e => { setFilterTanda(e.target.value); setFilterMarca(''); }}>
                        <option value="">Todas ({tandas.length})</option>
                        {tandas.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Marca</label>
                    <select className={inputCls} value={filterMarca} onChange={e => setFilterMarca(e.target.value)}>
                        <option value="">Todas ({marcas.length})</option>
                        {marcas.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Estado</label>
                    <select className={inputCls} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                        <option value="todos">Todos</option>
                        <option value="con-ventas">Sin dueño, con ventas</option>
                        <option value="sin-dueno">Sin dueño (todos)</option>
                        <option value="pendientes">Con dueño, ventas pendientes</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Buscar</label>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            className={`${inputCls} w-full pl-9`}
                            placeholder="Código o título"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Barra de acción */}
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{selected.size}</strong> producto(s) seleccionado(s)
                </span>
                <select
                    className={`${inputCls} ml-auto`}
                    value={ownerSel}
                    onChange={e => setOwnerSel(e.target.value)}
                >
                    <option value="">Elegí el propietario…</option>
                    {owners.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                </select>
                <button
                    onClick={() => setShowPreview(true)}
                    disabled={!ownerSel || selected.size === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <UserCheck className="w-4 h-4" /> Revisar y asignar
                </button>
            </div>

            {/* Tabla */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="py-16 flex items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" /> Cargando…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground text-sm">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No hay productos para asignar con estos filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} />
                                    </th>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3">Tanda / Marca</th>
                                    <th className="px-4 py-3">Dueño actual</th>
                                    <th className="px-4 py-3 text-right">Ventas "Sin propietario"</th>
                                    <th className="px-4 py-3 text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map(r => (
                                    <tr
                                        key={r.id}
                                        className={`hover:bg-muted/30 cursor-pointer ${selected.has(r.id) ? 'bg-primary/5' : ''}`}
                                        onClick={() => toggle(r.id)}
                                    >
                                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-foreground">{r.producto_titulo || '—'}</p>
                                            <p className="text-xs font-mono text-muted-foreground">{r.codigo}</p>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <p>{r.tanda_nombre}</p>
                                            <p className="text-xs">{r.marca}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.owner ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ownerColor(r.owner) }} />
                                                    {r.owner}
                                                </span>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground">Sin dueño</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {r.pend ? (
                                                <span>{r.pend.count} <span className="text-muted-foreground text-xs">({fmtNum(r.pend.docenas)} doc.)</span></span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                            {r.pend ? fmtMoney(r.pend.total) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Historial de reasignaciones */}
            {!historyError && (
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                        <h2 className="font-bold text-foreground">Reasignaciones recientes</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Cada una se puede deshacer: las ventas vuelven a "Sin propietario".</p>
                    </div>
                    {history.length === 0 ? (
                        <p className="px-5 py-8 text-sm text-center text-muted-foreground">Todavía no hay reasignaciones.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Usuario</th>
                                        <th className="px-4 py-3">Producto</th>
                                        <th className="px-4 py-3">Nuevo dueño</th>
                                        <th className="px-4 py-3 text-right">Ventas</th>
                                        <th className="px-4 py-3 text-right">Monto</th>
                                        <th className="px-4 py-3 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {history.map(h => (
                                        <tr key={h.id} className={h.deshecho_at ? 'opacity-60' : ''}>
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtFecha(h.created_at)}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{h.usuario_email || '—'}</td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-foreground">{h.producto_titulo || h.codigo}</p>
                                                <p className="text-xs text-muted-foreground">{h.codigo} · {h.tanda_nombre}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ownerColor(h.propietario_nuevo) }} />
                                                    {h.propietario_nuevo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{h.ventas_count}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(h.total_ars)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {h.deshecho_at ? (
                                                    <span className="text-xs text-muted-foreground">Deshecha {fmtFecha(h.deshecho_at)}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => deshacer(h)}
                                                        disabled={undoing === h.id}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
                                                    >
                                                        {undoing === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                                                        Deshacer
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Vista previa y confirmación */}
            {showPreview && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !working && setShowPreview(false)}>
                    <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <div>
                                <p className="text-xs uppercase font-bold tracking-wide text-muted-foreground">Vista previa</p>
                                <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                                    Asignar a
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ownerColor(ownerSel) }} />
                                        {ownerSel}
                                    </span>
                                </h3>
                            </div>
                            <button onClick={() => setShowPreview(false)} disabled={working} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                {[
                                    ['Productos', seleccion.ok.length],
                                    ['Ventas a pasar', seleccion.ventas],
                                    ['Docenas', fmtNum(seleccion.docenas)],
                                    ['Monto total', fmtMoney(seleccion.total)],
                                ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-muted/40 border border-border py-3">
                                        <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
                                        <p className="text-lg font-black text-foreground tabular-nums">{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-xl border border-border p-4 text-sm space-y-1.5">
                                <div className="flex justify-between"><span className="text-muted-foreground">Cobrado en efectivo</span><strong className="tabular-nums">{fmtMoney(seleccion.efectivo)}</strong></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Cobrado por transferencia</span><strong className="tabular-nums">{fmtMoney(seleccion.transf)}</strong></div>
                                {Object.keys(seleccion.cuentas).length > 0 && (
                                    <div className="pt-2 border-t border-border space-y-1">
                                        {Object.entries(seleccion.cuentas).map(([cuenta, monto]) => (
                                            <div key={cuenta} className="flex justify-between text-xs text-muted-foreground">
                                                <span>↳ entró a la cuenta "{cuenta}"</span><span className="tabular-nums">{fmtMoney(monto)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>
                                    Las transferencias <strong>no cambian de cuenta</strong>: sigue registrado en qué cuenta entró cada una. En Entrega de dinero, cada transferencia se marcará como propia o ajena según el dueño de esa cuenta. Pasar las ventas al nuevo dueño no modifica el stock.
                                </span>
                            </div>

                            {seleccion.ok.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">Productos</p>
                                    <ul className="divide-y divide-border rounded-xl border border-border max-h-52 overflow-y-auto">
                                        {seleccion.ok.map(r => (
                                            <li key={r.id} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                                                <span className="min-w-0">
                                                    <span className="font-medium text-foreground">{r.producto_titulo || r.codigo}</span>
                                                    <span className="block text-xs text-muted-foreground font-mono truncate">{r.codigo} · {r.tanda_nombre}</span>
                                                </span>
                                                <span className="text-xs text-muted-foreground text-right shrink-0">
                                                    {r.pend ? `${r.pend.count} venta(s) · ${fmtMoney(r.pend.total)}` : 'sin ventas'}
                                                    {r.owner ? '' : ' · se le asigna el dueño'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {seleccion.omitidos.length > 0 && (
                                <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                                    <p className="font-bold mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Se omitirán {seleccion.omitidos.length} producto(s) que ya tienen otro dueño:</p>
                                    <ul className="list-disc pl-5 space-y-0.5">
                                        {seleccion.omitidos.map(r => <li key={r.id}>{r.codigo} ({r.owner})</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 px-5 py-4 border-t border-border">
                            <button
                                onClick={() => setShowPreview(false)}
                                disabled={working}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmar}
                                disabled={working || seleccion.ok.length === 0}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                            >
                                {working && <Loader2 className="w-4 h-4 animate-spin" />}
                                Confirmar asignación
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
