import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Layers, Calendar, Package, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/Button';

export function DetalleTanda() {
    const { tanda } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tandaInfo, setTandaInfo] = useState({ date: null, count: 0 });
    const [photos, setPhotos] = useState([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

    const tandaName = decodeURIComponent(tanda);

    useEffect(() => {
        fetchTandaDetails();
    }, [tandaName]);

    const fetchTandaDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', tandaName)
                .order('marca', { ascending: true });

            if (error) throw error;

            setProducts(data || []);

            if (data && data.length > 0) {
                setTandaInfo({
                    date: data[0].tanda_fecha,
                    count: data.length,
                    codigoBoleta: data[0].codigo_boleta,
                    gastos: data[0].gastos
                });

                if (data[0].fotos && Array.isArray(data[0].fotos)) {
                    setPhotos(data[0].fotos);
                }
            }

        } catch (error) {
            console.error('Error fetching tanda details:', error);
            alert('Error al cargar detalle de la tanda.');
        } finally {
            setLoading(false);
        }
    };

    const totalDocenas = products.reduce((sum, p) => sum + (p.cantidad_docenas || 0), 0);
    const totalMoney = products.reduce((sum, p) => sum + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0)), 0);

    const openLightbox = (index) => {
        setCurrentPhotoIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const nextPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = () => {
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/admin/mercancia')}>
                    <ArrowLeft className="w-4 h-4" /> Volver al Listado
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando detalles...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron productos para esta tanda.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary text-primary-foreground rounded-lg">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{tandaName}</h1>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> {tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString() : '-'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" /> {products.length} productos
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Info: Gastos Only */}
                        <div className="flex flex-col md:flex-row gap-6 md:px-12 items-center flex-1 justify-center border-t border-b md:border-t-0 md:border-b-0 md:border-l md:border-r border-border py-4 md:py-0">
                            <div>
                                <p className="text-xs uppercase text-muted-foreground font-semibold mb-1 text-center">Gastos Totales</p>
                                <p className="font-mono font-medium text-foreground text-center text-lg">
                                    ${Number(tandaInfo.gastos || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">${totalMoney.toLocaleString('es-AR')}</p>
                            <p className="text-xs text-muted-foreground">{totalDocenas} docenas en total</p>
                        </div>
                    </div>

                    {/* Photos Section */}
                    {photos.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <div className="flex items-center gap-2 mb-3">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-semibold text-foreground">
                                    Fotos ({photos.length})
                                </span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {photos.map((photoUrl, index) => (
                                    <div
                                        key={index}
                                        onClick={() => openLightbox(index)}
                                        className="flex-shrink-0 cursor-pointer group relative"
                                    >
                                        <img
                                            src={photoUrl}
                                            alt={`Foto ${index + 1}`}
                                            className="h-20 w-20 object-cover rounded-lg border-2 border-border group-hover:border-primary transition-all shadow-sm group-hover:shadow-md"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
                                            <ImageIcon className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lightbox Modal */}
                    {lightboxOpen && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
                            onClick={closeLightbox}
                        >
                            <button
                                onClick={closeLightbox}
                                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>

                            {photos.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            prevPhoto();
                                        }}
                                        className="absolute left-4 text-white hover:text-gray-300 transition-colors"
                                    >
                                        <ChevronLeft className="w-12 h-12" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            nextPhoto();
                                        }}
                                        className="absolute right-4 text-white hover:text-gray-300 transition-colors"
                                    >
                                        <ChevronRight className="w-12 h-12" />
                                    </button>
                                </>
                            )}

                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="max-w-5xl max-h-[90vh] relative"
                            >
                                <img
                                    src={photos[currentPhotoIndex]}
                                    alt={`Foto ${currentPhotoIndex + 1}`}
                                    className="max-w-full max-h-[90vh] object-contain rounded-lg"
                                />
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
                                    {currentPhotoIndex + 1} / {photos.length}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Grouped by Brand */}
                    <div className="space-y-6">
                        {Object.values(
                            products.reduce((acc, prod) => {
                                if (!acc[prod.marca]) {
                                    acc[prod.marca] = {
                                        name: prod.marca,
                                        boleta: prod.codigo_boleta,
                                        items: []
                                    };
                                }
                                acc[prod.marca].items.push(prod);
                                return acc;
                            }, {})
                        ).map((brandGroup, idx) => (
                            <BrandSection key={idx} brandGroup={brandGroup} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Collapsible Subcomponent for Brand Section
function BrandSection({ brandGroup }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Brand Header */}
            <div
                className="bg-muted/30 px-6 py-4 border-b border-border flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-lg font-bold text-foreground uppercase tracking-wide flex items-center gap-3">
                    {brandGroup.name}
                    {!isExpanded && (
                        <span className="text-xs font-normal text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full">
                            {brandGroup.items.length} productos
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Boleta:</span>
                        <span className={`font-mono text-sm font-medium ${brandGroup.boleta ? 'text-foreground' : 'text-destructive italic'}`}>
                            {brandGroup.boleta || 'NO INGRESADA'}
                        </span>
                    </div>
                    <div className="text-muted-foreground">
                        {isExpanded ? (
                            <ChevronLeft className="w-5 h-5 -rotate-90 transition-transform" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 rotate-90 transition-transform" />
                        )}
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/20 border-b border-border text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3 text-center">Docenas</th>
                                <th className="px-6 py-3 text-right">Precio Doc.</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {brandGroup.items.map((prod) => (
                                <tr key={prod.id} className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4 font-medium text-foreground">{prod.producto_titulo}</td>
                                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{prod.codigo}</td>
                                    <td className="px-6 py-4 text-center font-bold text-foreground">{prod.cantidad_docenas}</td>
                                    <td className="px-6 py-4 text-right text-muted-foreground">
                                        ${Number(prod.precio_docena || 0).toLocaleString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                        ${(prod.cantidad_docenas * (Number(prod.precio_docena) || 0)).toLocaleString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground italic">
                                        {prod.observaciones || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
