// Helpers compartidos entre ProductsTable y ProductsGrid — una sola fuente de verdad
// para el estado de stock y la resolución de imagen entre 'products' y 'catalog_products'.

export const getStockBadgeClass = (stock) => {
    if (stock === 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (stock < 10) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (stock < 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
};

export const getStockDotClass = (stock) => {
    if (stock === 0) return 'bg-red-500';
    if (stock < 10) return 'bg-orange-500';
    if (stock < 50) return 'bg-yellow-500';
    return 'bg-green-500';
};

export const getStockLabel = (stock) => {
    if (stock === 0) return 'Agotado';
    if (stock < 10) return `${stock} (Bajo)`;
    if (stock < 50) return `${stock} (Medio)`;
    return `${stock} en stock`;
};

export const getProductImage = (producto) => {
    // catalog_products usan image_url; products usan images[]
    if (producto._source === 'catalog_products') {
        return producto.image_url || '/placeholder.png';
    }
    return (producto.images && producto.images[0]) || '/placeholder.png';
};

export const getProductCode = (producto) =>
    producto._source === 'catalog_products'
        ? (producto.entradas?.codigo || null)
        : (producto.code || null);
