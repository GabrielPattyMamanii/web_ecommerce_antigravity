import React, { useMemo, useState } from 'react';
import { X, Search, Radio, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getProductImage, getProductCode } from './productHelpers';

const keyOf = (p) => `${p._source}-${p.id}`;

const VISIBILITY_FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'visible', label: 'Visibles' },
    { value: 'hidden', label: 'Ocultos' },
];

export default function LiveProductsModal({ productos, onClose, onSaved, showToast }) {
    const [search, setSearch] = useState('');
    const [visibilidad, setVisibilidad] = useState('all');
    const [selected, setSelected] = useState(
        () => new Set(productos.filter((p) => p.is_live).map(keyOf))
    );
    const [saving, setSaving] = useState(false);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return productos.filter((p) => {
            const matchVisibilidad =
                visibilidad === 'all' ||
                (visibilidad === 'visible' && p.published) ||
                (visibilidad === 'hidden' && !p.published);

            if (!matchVisibilidad) return false;
            if (!term) return true;

            const nombre = (p.name || '').toLowerCase();
            const codigo = (getProductCode(p) || '').toLowerCase();
            return nombre.includes(term) || codigo.includes(term);
        });
    }, [productos, search, visibilidad]);

    const toggle = (p) => {
        const key = keyOf(p);
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const originallyLive = new Set(productos.filter((p) => p.is_live).map(keyOf));

            const toEnable = productos.filter((p) => selected.has(keyOf(p)) && !originallyLive.has(keyOf(p)));
            const toDisable = productos.filter((p) => !selected.has(keyOf(p)) && originallyLive.has(keyOf(p)));

            const bySource = (list) => ({
                products: list.filter((p) => p._source !== 'catalog_products').map((p) => p.id),
                catalog_products: list.filter((p) => p._source === 'catalog_products').map((p) => p.id),
            });

            const enable = bySource(toEnable);
            const disable = bySource(toDisable);

            const ops = [];
            if (enable.products.length) ops.push(supabase.from('products').update({ is_live: true }).in('id', enable.products));
            if (enable.catalog_products.length) ops.push(supabase.from('catalog_products').update({ is_live: true }).in('id', enable.catalog_products));
            if (disable.products.length) ops.push(supabase.from('products').update({ is_live: false }).in('id', disable.products));
            if (disable.catalog_products.length) ops.push(supabase.from('catalog_products').update({ is_live: false }).in('id', disable.catalog_products));

            const results = await Promise.all(ops);
            const failed = results.find((r) => r.error);
            if (failed) throw failed.error;

            showToast(`Actualizamos qué se ve en vivo: ${selected.size} producto${selected.size === 1 ? '' : 's'}`, 'success');
            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Error al guardar la selección de Live', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] bg-card rounded-2xl overflow-hidden shadow-2xl border border-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="live-picker-dot" aria-hidden="true" />
                        <div>
                            <h2 className="text-lg font-bold text-foreground leading-tight">Elegí qué se ve en vivo</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Se muestran productos visibles y ocultos del catálogo.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search + filtro de visibilidad */}
                <div className="px-6 py-3 border-b border-border shrink-0 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o código..."
                            className="w-full pl-9 pr-3 py-2.5 bg-muted/50 border border-input rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#ff2d55]/40 placeholder:text-muted-foreground/60"
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        {VISIBILITY_FILTERS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setVisibilidad(opt.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                    visibilidad === opt.value
                                        ? 'bg-[#ff2d55] text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-10">
                            No encontramos productos con ese nombre o código.
                        </p>
                    ) : (
                        filtered.map((p) => {
                            const key = keyOf(p);
                            const isChecked = selected.has(key);
                            const codigo = getProductCode(p);
                            const price = p.price_on_request ? 'A consultar' : `$${parseFloat(p.retail_price || p.price || 0).toLocaleString('es-AR')}`;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => toggle(p)}
                                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${isChecked ? 'bg-[#ff2d55]/8' : 'hover:bg-muted/60'}`}
                                >
                                    <span
                                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-[#ff2d55] border-[#ff2d55]' : 'border-input'}`}
                                    >
                                        {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                    </span>
                                    <img
                                        src={getProductImage(p)}
                                        alt={p.name}
                                        className="w-11 h-11 object-cover rounded-lg shrink-0 bg-muted"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {codigo && <span className="text-xs text-muted-foreground font-mono">{codigo}</span>}
                                            <span className="text-xs text-muted-foreground">{price}</span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.published ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                                {p.published ? 'Visible' : 'Oculto'}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border flex items-center justify-between shrink-0 bg-muted/30">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-[#ff2d55]" />
                        {selected.size} producto{selected.size === 1 ? '' : 's'} en vivo
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#ff2d55] hover:bg-[#c4123f] transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {saving ? 'Guardando...' : 'Guardar selección'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
