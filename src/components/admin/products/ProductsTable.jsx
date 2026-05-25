
import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductsTable = ({
    productos,
    onToggleVisibilidad,
    onEdit,
    onDelete
}) => {
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        if (selectedImage) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [selectedImage]);
    const getStockBadgeClass = (stock) => {
        if (stock === 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        if (stock < 10) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        if (stock < 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    };

    const getStockLabel = (stock) => {
        if (stock === 0) return 'Agotado';
        if (stock < 10) return `${stock} (Bajo)`;
        if (stock < 50) return `${stock} (Medio)`;
        return `${stock}`;
    };

    const verProductoEnTienda = (producto) => {
        const url = `/catalog/${producto.id}`;
        window.open(url, '_blank', 'noopener,noreferrer');

        toast.success(
            <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <span>Abriendo producto en nueva pestaña</span>
            </div>,
            { duration: 2000, position: 'bottom-right' }
        );
    };

    const getImage = (producto) => {
        // catalog_products use image_url; products use images[]
        if (producto._source === 'catalog_products') {
            return producto.image_url || '/placeholder.png';
        }
        return (producto.images && producto.images[0]) || '/placeholder.png';
    };

    return (
        <div className="w-full">
            {/* Image Preview Popup */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]">
                        <img
                            src={selectedImage.src}
                            alt={selectedImage.alt}
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
                            onClick={e => e.stopPropagation()}
                        />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-3 -right-3 bg-white text-black rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        {selectedImage.name && (
                            <p className="text-center text-white/70 text-sm mt-3 truncate max-w-full px-2">
                                {selectedImage.name}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto bg-card border border-border rounded-lg shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground">
                        <tr>
                            <th className="px-6 py-3">Imagen</th>
                            <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors">Nombre</th>
                            <th className="px-6 py-3">Código</th>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors">Precio</th>
                            <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors">Stock</th>
                            <th className="px-6 py-3">Visible</th>
                            <th className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {productos.map((producto) => (
                            <tr key={`${producto._source}-${producto.id}`} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="relative">
                                        <img
                                            src={getImage(producto)}
                                            alt={producto.name}
                                            className="w-12 h-12 object-cover rounded-lg border border-border cursor-zoom-in hover:opacity-80 transition-opacity"
                                            onClick={() => setSelectedImage({ src: getImage(producto), alt: producto.name, name: producto.name })}
                                            title="Ver imagen"
                                        />
                                        {producto._source === 'catalog_products' && (
                                            <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[9px] font-bold px-1 rounded-full leading-4">
                                                MB
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground">
                                    <div>
                                        {producto.name}
                                        {producto.brand && (
                                            <span className="block text-xs text-muted-foreground">{producto.brand}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {producto._source === 'catalog_products'
                                            ? (producto.entradas?.codigo || '—')
                                            : (producto.code || '—')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                                        {producto.categories?.name || 'Sin Categoría'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-semibold text-foreground">
                                    {producto.price_on_request ? (
                                        <span className="text-xs font-bold uppercase tracking-widest text-[#B02865] bg-[#B02865]/10 px-2.5 py-1 rounded-full">
                                            A Consultar
                                        </span>
                                    ) : (
                                        `$${parseFloat(producto.retail_price || producto.price || 0).toLocaleString('es-AR')}`
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockBadgeClass(producto.stock)}`}>
                                        {getStockLabel(producto.stock)}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => onToggleVisibilidad(producto.id, !producto.published, producto._source)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${producto.published ? 'bg-primary' : 'bg-muted'}`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${producto.published ? 'translate-x-6' : 'translate-x-1'}`}
                                        />
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => verProductoEnTienda(producto)}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title="Ver en tienda"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onEdit(producto.id, producto._source)}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(producto.id, producto._source)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {productos.map((producto) => (
                    <div key={`${producto._source}-${producto.id}`} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-4">
                        {/* Card Header: Image & Info */}
                        <div className="flex gap-4">
                            <div className="relative shrink-0">
                                <img
                                    src={getImage(producto)}
                                    alt={producto.name}
                                    className="w-20 h-20 object-cover rounded-lg shadow-sm border border-border cursor-zoom-in hover:opacity-80 transition-opacity"
                                    onClick={() => setSelectedImage({ src: getImage(producto), alt: producto.name, name: producto.name })}
                                    title="Ver imagen"
                                />
                                {producto._source === 'catalog_products' && (
                                    <span className="absolute -top-2 -right-2 bg-violet-600 border border-border text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                        MB
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <h3 className="font-bold text-foreground text-sm line-clamp-2 leading-snug">
                                    {producto.name}
                                </h3>
                                <div className="flex items-center flex-wrap gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded border border-primary/20">
                                        {producto.categories?.name || 'Sin Categoría'}
                                    </span>
                                    {producto.brand && (
                                        <span className="text-xs text-muted-foreground hidden sm:block">{producto.brand}</span>
                                    )}
                                </div>
                                <span className="font-mono text-xs text-muted-foreground mt-1 truncate">
                                    Cód: {producto._source === 'catalog_products' ? (producto.entradas?.codigo || '—') : (producto.code || '—')}
                                </span>
                            </div>
                        </div>

                        {/* Card Meta: Price & Stock */}
                        <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border">
                            <div className="font-black text-lg text-primary">
                                {producto.price_on_request ? (
                                    <span className="text-xs font-bold uppercase tracking-widest text-[#B02865] bg-[#B02865]/10 px-2.5 py-1 rounded-full">
                                        A Consultar
                                    </span>
                                ) : (
                                    `$${parseFloat(producto.retail_price || producto.price || 0).toLocaleString('es-AR')}`
                                )}
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${getStockBadgeClass(producto.stock)}`}>
                                {getStockLabel(producto.stock)}
                            </span>
                        </div>

                        {/* Card Actions: Visibility & Buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                            {/* Toggle visibility */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onToggleVisibilidad(producto.id, !producto.published, producto._source)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${producto.published ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${producto.published ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                                <span className="text-xs font-semibold text-muted-foreground">
                                    {producto.published ? 'Visible' : 'Oculto'}
                                </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => verProductoEnTienda(producto)}
                                    className="p-2.5 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                                    title="Ver en tienda"
                                >
                                    <Eye className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onEdit(producto.id, producto._source)}
                                    className="p-2.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
                                    title="Editar"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(producto.id, producto._source)}
                                    className="p-2.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors bg-red-500/5 border border-red-500/20"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProductsTable;
