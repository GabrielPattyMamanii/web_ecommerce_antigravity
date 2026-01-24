
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
        if (stock === 0) return 'out';
        if (stock < 10) return 'low';
        if (stock < 50) return 'medium';
        return 'high';
    };

    const getStockLabel = (stock) => {
        if (stock === 0) return 'Agotado';
        if (stock < 10) return `${stock} (Bajo)`;
        if (stock < 50) return `${stock} (Medio)`;
        return `${stock}`;
    };

    const verProductoEnTienda = (producto) => {
        // Opción 1: Por ID
        const url = `/catalog/${producto.id}`;

        // Abrir en nueva pestaña
        window.open(url, '_blank', 'noopener,noreferrer');

        // Mostrar toast de confirmación
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
        <div className="products-table-container">
            <table className="products-table">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th className="sortable">Nombre</th>
                        <th>Categoría</th>
                        <th className="sortable">Precio</th>
                        <th className="sortable">Stock</th>
                        <th>Visible</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.map((producto) => (
                        <tr key={producto.id}>
                            <td className="product-image-cell">
                                <img
                                    src={(producto.images && producto.images[0]) || '/placeholder.png'}
                                    alt={producto.name}
                                    className="product-image"
                                />
                            </td>
                            <td className="product-name-cell">{producto.name}</td>
                            <td>
                                <span className="product-category">
                                    {producto.categories?.name || 'Sin Categoría'}
                                </span>
                            </td>
                            <td className="product-price-cell">
                                ${parseFloat(producto.price || 0).toLocaleString('es-AR')}
                            </td>
                            <td className="product-stock-cell">
                                <span className={`stock-badge ${getStockBadgeClass(producto.stock)}`}>
                                    {getStockLabel(producto.stock)}
                                </span>
                            </td>
                            <td className="visibility-toggle-cell">
                                <label className="visibility-toggle">
                                    <input
                                        type="checkbox"
                                        checked={producto.published || false}
                                        onChange={(e) => onToggleVisibilidad(producto.id, e.target.checked)}
                                    />
                                    <span className="visibility-slider">
                                        <span className="eye-off-icon">👁️‍🗨️</span>
                                    </span>
                                </label>
                                <span className="visibility-label">
                                    {producto.published ? 'Visible' : 'Oculto'}
                                </span>
                            </td>
                            <td>
                                <div className="flex items-center gap-2">
                                    {/* Botón Ver */}
                                    <button
                                        onClick={() => verProductoEnTienda(producto)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group relative"
                                        title="Ver producto en tienda"
                                    >
                                        <Eye className="h-5 w-5" />
                                        <ExternalLink className="h-3 w-3 absolute -top-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>

                                    {/* Botón Editar */}
                                    <button
                                        onClick={() => onEdit(producto.id)}
                                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                        title="Editar producto"
                                    >
                                        <Edit className="h-5 w-5" />
                                    </button>

                                    {/* Botón Eliminar */}
                                    <button
                                        onClick={() => onDelete(producto.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar producto"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {productos.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                                No se encontraron productos
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ProductsTable;
