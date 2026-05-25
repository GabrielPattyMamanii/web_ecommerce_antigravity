import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getWhatsAppLink } from '../../utils/whatsapp';

export function Home() {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeatured = async () => {
            try {
                const [prodsRes, catalogProdsRes] = await Promise.all([
                    supabase.from('products').select('*, categories(name)').eq('published', true).order('created_at', { ascending: false }).limit(4),
                    supabase.from('catalog_products').select('*, categories(name)').eq('published', true).order('created_at', { ascending: false }).limit(4)
                ]);

                let combined = [];
                if (prodsRes.data) {
                    combined = [...combined, ...prodsRes.data.map(p => ({
                        ...p,
                        category: p.categories?.name || 'Sin categoría',
                        image: p.images?.[0] || '',
                        retail_price: p.retail_price || 0
                    }))];
                }
                if (catalogProdsRes.data) {
                    combined = [...combined, ...catalogProdsRes.data.map(p => ({
                        ...p,
                        category: p.categories?.name || 'Sin categoría',
                        image: p.image_url || '',
                        retail_price: p.price || 0,
                        is_from_catalog: true
                    }))];
                }

                combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setFeaturedProducts(combined.slice(0, 4));
            } catch (err) {
                console.error('Error fetching featured products:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFeatured();
    }, []);

    return (
        <div className="text-on-surface bg-[#f5f7fa] font-body flex flex-col min-h-screen">
            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full overflow-hidden min-h-[100dvh] lg:min-h-[850px] flex items-center py-12 lg:py-0">

                    {/* Background Image */}
                    <div className="absolute inset-0 z-0">
                        <img src="/hero-bg.png" alt="Fondo Luriel" className="w-full h-full object-cover object-center" />
                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]"></div> {/* Light dark overlay to help readability if needed */}
                    </div>

                    <div className="container mx-auto px-4 sm:px-8 relative z-10 flex flex-col lg:flex-row gap-8 items-center max-w-[1440px] justify-between">

                        {/* Left Side: Text Box Container */}
                        <div className="w-full lg:w-[48%] xl:w-[45%] bg-[#ffffec]/95 backdrop-blur-md p-6 lg:p-12 xl:p-20 rounded-3xl lg:rounded-[2rem] shadow-2xl border border-white/50 min-h-[350px] lg:min-h-[550px] flex flex-col justify-center z-20 self-stretch my-8 lg:my-16">
                            <h1 className="text-[3.5rem] sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.9] lg:leading-[0.85] mb-4 lg:mb-6 font-headline text-public-secondary">
                                Explora<br /> <span className="text-public-primary italic">Nuestros Productos</span>
                            </h1>
                            <p className="text-lg md:text-xl max-w-lg mb-8 text-public-secondary/80 font-medium">
                                Moda importada, seleccionada para quienes no se conforman con lo común
                            </p>
                            <div className="flex flex-wrap gap-4 mt-6">
                                <Link to="/catalog">
                                    <button className="w-full sm:w-auto bg-public-primary text-white px-8 md:px-14 py-4 md:py-5 rounded-2xl font-black text-base sm:text-lg md:text-xl active:scale-95 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-public-primary/30 uppercase tracking-[0.2em]">
                                        Explorar Catálogo
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* Right Side: Overlapping Image Grid */}
                        <div className="w-full lg:w-[50%] relative h-[300px] sm:h-[500px] lg:h-[600px] flex items-end mt-4 lg:mt-0 xl:translate-x-4">
                            {/* Main Background Image - Woman Sweater */}
                            <div className="absolute top-0 right-0 w-2/3 h-[90%] lg:h-4/5 rounded-2xl overflow-hidden shadow-2xl z-20 border-[6px] border-white/90 bg-white">
                                <img alt="Sweater Nuevo Ingreso" className="w-full h-full object-cover" src="/grid-1.jpeg" />
                            </div>
                            {/* Overlapping small tilted image - Men Jacket */}
                            <div className="absolute bottom-4 lg:bottom-0 left-0 w-3/5 lg:w-1/2 h-[65%] lg:h-3/5 rounded-2xl overflow-hidden shadow-2xl z-30 transform -rotate-[4deg] hover:rotate-0 hover:-translate-y-2 transition-all duration-500 border-[6px] border-white/90 bg-white">
                                <img alt="Campera Hombre" className="w-full h-full object-cover" src="/grid-2.jpeg" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Novedades Section: Editorial Grid */}
                <section className="py-12 lg:py-24 px-4 sm:px-8 max-w-[1440px] mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-16 gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-1 bg-public-primary rounded-full"></div>
                                <span className="text-sm font-black text-public-primary uppercase tracking-[0.3em]">Trending</span>
                            </div>
                            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-headline text-public-secondary">Destacados</h2>
                            <p className="text-public-secondary/70 mt-2 sm:mt-3 font-medium text-base sm:text-lg">Los favoritos de esta semana seleccionados para ti.</p>
                        </div>
                        <Link to="/catalog" className="text-public-primary font-bold flex items-center gap-2 hover:opacity-80 group border-b-2 border-transparent hover:border-public-primary pb-1 transition-all">
                            Ver toda la tienda <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-8">
                        {loading ? (
                             <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-outline-variant border-t-primary"></div>
                             </div>
                        ) : featuredProducts.length > 0 ? (
                            featuredProducts.map(product => (
                                <Link to={`/catalog/${product.id}`} key={product.id} className="group cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-md hover:shadow-2xl transition-all duration-500 border border-black/5 flex flex-col h-full transform hover:-translate-y-1 sm:hover:-translate-y-2">
                                    <div className="aspect-[4/5] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-50 mb-3 sm:mb-5 relative">
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 duration-500"></div>
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 z-20 transition-all duration-500 translate-y-4 group-hover:-translate-y-1/2">
                                            <span className="bg-white/95 backdrop-blur-sm text-black text-xs font-bold px-5 py-2.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">Ver Detalle</span>
                                        </div>
                                        {product.image ? (
                                            <img alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={product.image} />
                                        ) : (
                                            <div className="w-full h-full bg-black/5 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-5xl text-black/20">image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-3 pb-3 flex-grow flex flex-col justify-between">
                                        <div>
                                            <span className="text-[9px] sm:text-[10px] font-black text-public-primary uppercase tracking-[0.2em] sm:tracking-[0.25em] block mb-1 lg:mb-1.5 opacity-90 truncate">{product.category}</span>
                                            <h3 className="text-sm sm:text-base lg:text-xl font-bold text-public-secondary leading-tight group-hover:text-public-primary transition-colors line-clamp-2">{product.name}</h3>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            {product.price_on_request ? (
                                                <a
                                                    href={getWhatsAppLink(product.name, product.id)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-white bg-[#25D366] hover:bg-[#128C7E] px-3 py-1 rounded-full transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                    </svg>
                                                    A consultar
                                                </a>
                                            ) : (
                                                <span className="text-base sm:text-lg lg:text-xl font-black text-public-secondary">${product.retail_price?.toFixed(2) || '0.00'}</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="col-span-1 sm:col-span-2 lg:col-span-4 text-center py-12 text-public-secondary/60 font-medium">
                                No hay productos destacados por el momento.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
