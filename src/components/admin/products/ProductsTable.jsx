
import React from 'react';

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
                                <div className="actions-cell">
                                    <button
                                        className="action-btn action-btn-edit"
                                        onClick={() => onEdit(producto.id)}
                                        data-tooltip="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="action-btn action-btn-delete"
                                        onClick={() => onDelete(producto.id)}
                                        data-tooltip="Eliminar"
                                    >
                                        🗑️
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
