
import React from 'react';
import { Eye, Edit, Trash2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductsTable = ({
    productos,
    onToggleVisibilidad,
    onEdit,
    onDelete
}) => {
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
            {
                duration: 2000,
                position: 'bottom-right'
            }
        );
    };

    return (
        <div className="overflow-x-auto bg-card border border-border rounded-lg shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                        <th className="px-6 py-3">Imagen</th>
                        <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors">Nombre</th>
                        <th className="px-6 py-3">Categoría</th>
                        <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors">Precio</th>
                        <th className="px-6 py-3 cursor-pointer hover:text-foreground transition-colors">Stock</th>
                        <th className="px-6 py-3">Visible</th>
                        <th className="px-6 py-3">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                    {productos.map((producto) => (
                        <tr key={producto.id} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4">
                                <img
                                    src={(producto.images && producto.images[0]) || '/placeholder.png'}
                                    alt={producto.name}
                                    className="w-12 h-12 object-cover rounded-lg border border-border"
                                />
                            </td>
                            <td className="px-6 py-4 font-medium text-foreground">{producto.name}</td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                                    {producto.categories?.name || 'Sin Categoría'}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-foreground">
                                ${parseFloat(producto.price || 0).toLocaleString('es-AR')}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockBadgeClass(producto.stock)}`}>
                                    {getStockLabel(producto.stock)}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button
                                    onClick={() => onToggleVisibilidad(producto.id, !producto.published)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${producto.published ? 'bg-primary' : 'bg-muted'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${producto.published ? 'translate-x-6' : 'translate-x-1'
                                            }`}
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
                                        onClick={() => onEdit(producto.id)}
                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(producto.id)}
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
    );
};

export default ProductsTable;
