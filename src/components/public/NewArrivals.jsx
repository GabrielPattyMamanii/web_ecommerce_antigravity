import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getProductUrl } from '../../lib/urlUtils';

export function NewArrivals() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const scrollContainerRef = useRef(null);
    const [showArrows, setShowArrows] = useState(false);

    useEffect(() => {
        fetchNewArrivals();
    }, []);

    const fetchNewArrivals = async () => {
        try {
            // Calculate date 7 days ago
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            // Fetch products created in the last 7 days OR fallback to latest 10
            let { data, error } = await supabase
                .from('products')
                .select('*, categories(name)')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            // Fallback if not enough new products
            if (!data || data.length < 4) {
                const { data: fallbackData } = await supabase
                    .from('products')
                    .select('*, categories(name)')
                    .order('created_at', { ascending: false })
                    .limit(10);
                data = fallbackData;
            }

            if (data) {
                const mappedProducts = data.map(p => ({
                    ...p,
                    image: p.image || p.images?.[0] || 'https://via.placeholder.com/300'
                }));
                setProducts(mappedProducts);
            }
        } catch (error) {
            console.error('Error fetching new arrivals:', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        const checkScroll = () => {
            if (scrollContainerRef.current) {
                setShowArrows(scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth);
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);

        let interval;
        if (!isHovered && products.length > 0) {
            interval = setInterval(() => {
                if (scrollContainerRef.current) {
                    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                    // If near end, loop back just a bit or smooth scroll? 
                    // Requirement: "Loop infinito (vuelve al inicio al llegar al final)"
                    // Implementing simple forward scroll and reset
                    if (scrollLeft + clientWidth >= scrollWidth - 10) {
                        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        // Scroll one card width roughly
                        scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                    }
                }
            }, 3500);
        }

        return () => {
            window.removeEventListener('resize', checkScroll);
            clearInterval(interval);
        };
    }, [isHovered, products]);


    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) return null;
    if (products.length === 0) return null;

    return (
        <section className="py-20 px-4 md:px-16 bg-gradient-to-b from-public-accent/20 to-white overflow-hidden">
            <div className="container mx-auto">
                <div className="text-center mb-10">
                    <h2 className="font-chango text-4xl md:text-[42px] text-public-primary mb-3">
                        NUEVOS INGRESOS
                    </h2>
                    <p className="text-gray-500 text-base">
                        Descubre las últimas incorporaciones
                    </p>
                </div>

                <div
                    className="relative max-w-[1400px] mx-auto px-4 lg:px-16"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Navigation Buttons */}
                    {showArrows && (
                        <>
                            <button
                                onClick={() => scroll('left')}
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-public-secondary rounded-full flex items-center justify-center text-white shadow-lg opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-300 hover:bg-public-primary hover:scale-110"
                                aria-label="Anterior"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={() => scroll('right')}
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-public-secondary rounded-full flex items-center justify-center text-white shadow-lg opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-300 hover:bg-public-primary hover:scale-110"
                                aria-label="Siguiente"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    {/* Carousel Track */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-6 overflow-x-auto pb-8 hide-scrollbar snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="min-w-[85%] sm:min-w-[45%] md:min-w-[30%] lg:min-w-[22%] snap-start bg-white rounded-xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group/card border border-transparent hover:border-public-tertiary/20"
                            >
                                <Link to={getProductUrl(product.id)} className="block">
                                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg mb-3">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                        />
                                        <span className="absolute top-3 right-3 bg-public-tertiary text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                            NUEVO
                                        </span>
                                    </div>

                                    <h3 className="font-chango text-lg text-public-primary mt-3 line-clamp-2 uppercase">
                                        {product.name}
                                    </h3>

                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-lg font-bold text-public-secondary">
                                            ${product.retail_price}
                                        </p>

                                        <div className="w-8 h-8 rounded-full border border-public-tertiary flex items-center justify-center text-public-secondary opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-public-tertiary hover:text-white">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* Dots */}
                    {showArrows && (
                        <div className="flex justify-center gap-2 mt-4">
                            {products.slice(0, Math.min(products.length, 5)).map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`h-2.5 rounded-full transition-all duration-300 ${idx === 0 ? 'w-6 bg-public-secondary' : 'w-2.5 bg-public-tertiary/40'}`}
                                    aria-label={`Go to slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-center mt-12">
                    <Link
                        to="/catalog"
                        className="inline-block px-10 py-3 bg-transparent border-2 border-public-secondary text-public-secondary font-chango text-base rounded-full hover:bg-public-secondary hover:text-white transition-all duration-300"
                    >
                        VER CATÁLOGO
                    </Link>
                </div>
            </div>
        </section>
    );
}
