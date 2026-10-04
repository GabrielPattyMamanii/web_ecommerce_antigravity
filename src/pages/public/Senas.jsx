import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SenaModal } from '../../components/senas/SenaModal';
import { getProductUrl } from '../../lib/urlUtils';

export function Senas() {
    const [products, setProducts]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [senaConfig, setSenaConfig]   = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [{ data: prods }, { data: catProds }, { data: config }] = await Promise.all([
                supabase.from('products').select('*, categories(name)').eq('published', true),
                supabase.from('catalog_products').select('*, categories(name)').eq('published', true),
                supabase.from('site_config').select('sena_enabled, sena_type, sena_amount, sena_percentage').single(),
            ]);

            setSenaConfig(config);

            let all = [];
            if (prods) {
                all = [...all, ...prods.map(p => ({
                    ...p,
                    image: p.images?.[0] || '',
                    source: 'products',
                }))];
            }
            if (catProds) {
                all = [...all, ...catProds.map(p => ({
                    ...p,
                    retail_price: p.price || 0,
                    image: p.image_url || '',
                    source: 'catalog_products',
                }))];
            }
            setProducts(all);
        } finally {
            setLoading(false);
        }
    };

    const calcularMontoSena = (product) => {
        if (!senaConfig) return 0;
        if (senaConfig.sena_type === 'ranges') return null; // depende de la cantidad total del carrito
        const precio = product.retail_price || product.price || 0;
        if (senaConfig.sena_type === 'percentage') {
            return Math.round((precio * senaConfig.sena_percentage) / 100);
        }
        return senaConfig.sena_amount || 0;
    };

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.categories?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f5f7fa]">

            {/* Hero */}
            <div className="bg-gradient-to-br from-[#009EE3] to-[#0073BD] text-white py-14 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
                        <HandCoins className="w-7 h-7" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">Reservá con una Seña</h1>
                    <p className="text-white/80 text-base md:text-lg max-w-xl mx-auto">
                        Elegí el producto que te gusta, pagá la seña con Mercado Pago y asegurá tu reserva.
                    </p>
                    {senaConfig?.sena_enabled && (
                        <div className="inline-block mt-5 bg-white/20 border border-white/30 rounded-full px-5 py-2 text-sm font-semibold">
                            {senaConfig.sena_type === 'percentage'
                                ? `Seña del ${senaConfig.sena_percentage}% sobre el precio del producto`
                                : senaConfig.sena_type === 'ranges'
                                    ? 'El monto de la seña depende de la cantidad total que reserves'
                                    : `Seña fija de $${Number(senaConfig.sena_amount).toLocaleString('es-AR')} por unidad`}
                        </div>
                    )}
                </div>
            </div>

            {/* Buscador */}
            <div className="max-w-4xl mx-auto px-4 -mt-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-gray-200 shadow-sm text-sm outline-none focus:ring-2 focus:ring-[#009EE3]/30 focus:border-[#009EE3]"
                    />
                </div>
            </div>

            {/* Listado */}
            <div className="max-w-6xl mx-auto px-4 py-10">
                {!senaConfig?.sena_enabled ? (
                    <div className="text-center py-20 text-gray-500">
                        <HandCoins className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-lg">Las señas no están disponibles en este momento.</p>
                    </div>
                ) : loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                                <div className="aspect-[3/4] bg-gray-200" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No se encontraron productos</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {filtered.map(product => {
                            const montoSena = calcularMontoSena(product);
                            return (
                                <div key={`${product.source}-${product.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group border border-gray-100">
                                    <Link to={getProductUrl(product.id)} className="block relative aspect-[3/4] overflow-hidden bg-gray-50">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <span className="material-symbols-outlined text-5xl">image</span>
                                            </div>
                                        )}
                                        {product.categories?.name && (
                                            <span className="absolute top-2 left-2 bg-white/90 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full text-gray-700 shadow-sm">
                                                {product.categories.name}
                                            </span>
                                        )}
                                    </Link>

                                    <div className="p-3.5">
                                        <Link to={getProductUrl(product.id)}>
                                            <h3 className="font-bold text-sm text-gray-900 line-clamp-2 mb-1 hover:text-[#009EE3] transition-colors">
                                                {product.name}
                                            </h3>
                                        </Link>

                                        {(product.retail_price || product.price) > 0 && (
                                            <p className="text-xs text-gray-500 mb-2">
                                                Precio: <span className="font-semibold text-gray-700">${(product.retail_price || product.price).toLocaleString('es-AR')}</span>
                                            </p>
                                        )}

                                        <div className="mb-3 bg-[#009EE3]/10 rounded-lg px-3 py-2 text-center">
                                            <p className="text-[10px] text-[#0073BD] font-semibold uppercase tracking-wide">Seña</p>
                                            <p className="text-lg font-black text-[#0073BD]">
                                                {montoSena == null ? 'Según cantidad' : `$${montoSena.toLocaleString('es-AR')}`}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => setSelectedProduct(product)}
                                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#009EE3] hover:bg-[#0073BD] text-white text-xs font-bold transition-colors shadow-sm shadow-[#009EE3]/20"
                                        >
                                            <HandCoins className="w-3.5 h-3.5" />
                                            Hacer Seña
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedProduct && (
                <SenaModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </div>
    );
}
