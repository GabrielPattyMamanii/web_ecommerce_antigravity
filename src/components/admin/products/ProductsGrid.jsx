import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ExternalLink } from 'lucide-react';
import ProductGridCard from './ProductGridCard';

const ProductsGrid = ({ productos, onToggleVisibilidad, onEdit, onDelete }) => {
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        document.body.style.overflow = selectedImage ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [selectedImage]);

    const verProductoEnTienda = (producto) => {
        window.open(`/catalog/${producto.id}`, '_blank', 'noopener,noreferrer');
        toast.success(
            <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <span>Abriendo producto en nueva pestaña</span>
            </div>,
            { duration: 2000, position: 'bottom-right' }
        );
    };

    return (
        <div className="w-full">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {productos.map((producto) => (
                    <ProductGridCard
                        key={`${producto._source}-${producto.id}`}
                        producto={producto}
                        onToggleVisibilidad={onToggleVisibilidad}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onViewStore={verProductoEnTienda}
                        onImageClick={setSelectedImage}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProductsGrid;
