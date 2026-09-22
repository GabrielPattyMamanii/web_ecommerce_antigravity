import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { getStockBadgeClass, getStockDotClass, getStockLabel, getProductImage, getProductCode } from './productHelpers';

const ProductGridCard = ({ producto, onToggleVisibilidad, onEdit, onDelete, onViewStore, onImageClick }) => {
    const codigo = getProductCode(producto);
    const price = parseFloat(producto.retail_price || producto.price || 0);
    // wholesale_price solo existe en la tabla 'products' — se muestra únicamente si el dato es real
    const wholesale = producto.wholesale_price ? parseFloat(producto.wholesale_price) : null;

    return (
        <article className="flex flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden group hover:shadow-lg hover:border-primary/25 transition-all duration-200">
            {/* Imagen + badges flotantes */}
            <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                <img
                    src={getProductImage(producto)}
                    alt={producto.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                    onClick={() => onImageClick({ src: getProductImage(producto), alt: producto.name, name: producto.name })}
                />

                {/* Badges superior-izquierda: categoría + estado de stock (dato real) */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    <span className="px-2.5 py-1 rounded-full bg-white text-slate-900 text-[11px] font-bold shadow-sm">
                        {producto.categories?.name || 'Sin Categoría'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${getStockBadgeClass(producto.stock)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStockDotClass(producto.stock)}`} />
                        {getStockLabel(producto.stock)}
                    </span>
                    {producto._source === 'catalog_products' && (
                        <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold shadow-sm">
                            Mercadería
                        </span>
                    )}
                </div>

                {/* Toggle de visibilidad flotante */}
                <button
                    onClick={() => onToggleVisibilidad(producto.id, !producto.published, producto._source)}
                    title={producto.published ? 'Visible en catálogo — click para ocultar' : 'Oculto del catálogo — click para mostrar'}
                    className="absolute top-3 right-3 flex items-center bg-card/85 backdrop-blur-sm p-1.5 rounded-full shadow-sm hover:bg-card transition-colors"
                >
                    <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${producto.published ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${producto.published ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </span>
                </button>
            </div>

            {/* Cuerpo de la tarjeta */}
            <div className="p-4 flex flex-col flex-1 gap-2.5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider truncate">
                            {codigo ? `SKU: ${codigo}` : 'Sin código'}
                        </span>
                        {producto.brand && (
                            <span className="text-[10px] font-semibold text-muted-foreground truncate shrink-0">{producto.brand}</span>
                        )}
                    </div>
                    <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {producto.name}
                    </h3>
                    {producto.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{producto.description}</p>
                    )}
                </div>

                {/* Precios — solo datos reales del producto */}
                <div className="pt-2 mt-auto border-t border-border/60 flex items-baseline justify-between gap-2">
                    {producto.price_on_request ? (
                        <span className="text-xs font-bold uppercase tracking-widest text-[#B02865] bg-[#B02865]/10 px-2.5 py-1 rounded-full">
                            A Consultar
                        </span>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Precio de venta</span>
                            <span className="text-lg font-black text-foreground tracking-tight">
                                ${price.toLocaleString('es-AR')}
                            </span>
                        </div>
                    )}
                    {wholesale > 0 && (
                        <div className="text-right shrink-0">
                            <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Mayorista</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                ${wholesale.toLocaleString('es-AR')}
                            </span>
                        </div>
                    )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={() => onEdit(producto.id, producto._source)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-colors"
                    >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                    </button>
                    <button
                        onClick={() => onViewStore(producto)}
                        title="Ver en tienda"
                        className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(producto.id, producto._source)}
                        title="Eliminar"
                        className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ProductGridCard;
