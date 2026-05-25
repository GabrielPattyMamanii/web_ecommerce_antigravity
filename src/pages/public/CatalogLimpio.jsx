import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getWhatsAppLink } from '../../utils/whatsapp';

export function CatalogLimpio() {
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [priceRange, setPriceRange] = useState([0, 2500]);
    const [sortBy, setSortBy] = useState('popular');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const search = searchParams.get('search');
        if (search) {
            setSearchTerm(search);
        }
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: catsData } = await supabase.from('categories').select('*');
            if (catsData) {
                setCategories(catsData);
            }

            const [prodsRes, catalogProdsRes] = await Promise.all([
                supabase
                    .from('products')
                    .select('*, categories(name)')
                    .eq('published', true),
                supabase
                    .from('catalog_products')
                    .select('*, categories(name)')
                    .eq('published', true)
            ]);

            const { data: prodsData } = prodsRes;
            const { data: catalogData } = catalogProdsRes;

            let combinedProducts = [];

            if (prodsData) {
                combinedProducts = [...combinedProducts, ...prodsData.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Sin categoría',
                    image: p.images?.[0] || 'https://via.placeholder.com/300'
                }))];
            }

            if (catalogData) {
                combinedProducts = [...combinedProducts, ...catalogData.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Sin categoría',
                    image: p.image_url || 'https://via.placeholder.com/300',
                    retail_price: p.price || 0,
                    is_from_catalog: true
                }))];
            }

            setProducts(combinedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        const price = product.retail_price || 0;
        const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

        return matchesSearch && matchesCategory && matchesPrice;
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="bg-[#f9f9f9] text-on-surface font-body min-h-screen">
            <main className="pt-12 md:pt-24 pb-12 w-full max-w-[1440px] mx-auto">
                <section className="px-6 md:px-10 mb-12">
                    <div className="flex flex-col md:flex-row items-end justify-between gap-6">
                        <div>
                            <span className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-primary mb-2 block">Primavera / Verano 2024</span>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-4">EL ARCHIVO</h1>
                            <p className="max-w-md text-zinc-500 font-sans leading-relaxed">Una colección curada de siluetas minimalistas diseñadas para un estilo de vida cinético moderno.</p>
                        </div>
                        <div className="text-sm font-medium text-zinc-400">
                            Mostrando <span className="text-on-surface">{filteredProducts.length}</span> Productos
                        </div>
                    </div>
                </section>
                <div className="flex flex-col lg:flex-row px-6 md:px-10 gap-10">
                    {/* Sidebar Filter */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <div className="sticky top-28 space-y-8">
                            {/* Categories */}
                            <div>
                                <h3 className="text-xs font-black tracking-widest uppercase text-zinc-900 mb-6">Categorías</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center group cursor-pointer" onClick={() => setSelectedCategory('All')}>
                                        <input type="radio" checked={selectedCategory === 'All'} readOnly className="rounded-sm border-outline-variant text-primary focus:ring-primary w-4 h-4"/>
                                        <span className={`ml-3 text-sm transition-colors ${selectedCategory === 'All' ? 'text-zinc-900 font-medium' : 'text-zinc-600 group-hover:text-zinc-900'}`}>Todos</span>
                                    </label>
                                    {categories.map((cat) => (
                                        <label key={cat.id} className="flex items-center group cursor-pointer" onClick={() => setSelectedCategory(cat.name)}>
                                            <input type="radio" checked={selectedCategory === cat.name} readOnly className="rounded-sm border-outline-variant text-primary focus:ring-primary w-4 h-4"/>
                                            <span className={`ml-3 text-sm transition-colors ${selectedCategory === cat.name ? 'text-zinc-900 font-medium' : 'text-zinc-600 group-hover:text-zinc-900'}`}>{cat.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            {/* Separator */}
                            <div className="h-[1px] bg-surface-container-highest w-full"></div>
                            {/* Size Filter */}
                            <div>
                                <h3 className="text-xs font-black tracking-widest uppercase text-zinc-900 mb-6">Talla</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                                        <button key={size} className="aspect-square flex items-center justify-center border border-outline-variant/30 text-xs font-bold hover:bg-zinc-900 hover:text-white transition-all rounded-sm">{size}</button>
                                    ))}
                                </div>
                            </div>
                            {/* Price Range */}
                            <div>
                                <h3 className="text-xs font-black tracking-widest uppercase text-zinc-900 mb-6">Rango de Precio</h3>
                                <div className="px-2">
                                    <input 
                                        type="range" 
                                        min="0"
                                        max="2500"
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                        className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer" 
                                    />
                                    <div className="flex justify-between mt-4 text-[10px] font-bold text-zinc-400 uppercase">
                                        <span>${priceRange[0]}</span>
                                        <span>${priceRange[1]}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative mb-8 bg-surface-container-high rounded-full flex items-center w-full focus-within:ring-2 focus-within:ring-primary transition-all">
                                <span className="material-symbols-outlined absolute left-4 w-5 h-5 text-on-surface-variant flex items-center justify-center pt-1" style={{ fontSize: '20px' }}>search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-transparent border-none text-sm focus:ring-0 placeholder-on-surface-variant text-on-surface outline-none"
                                />
                            </div>
                        </div>
                    </aside>
                    {/* Product Grid */}
                    <div className="flex-1">
                        {/* Sorting & View Controls */}
                        <div className="flex justify-between items-center mb-8 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/10">
                            <div className="flex space-x-2">
                                <button className="p-2 bg-zinc-100 rounded text-zinc-900">
                                    <span className="material-symbols-outlined text-lg">grid_view</span>
                                </button>
                                <button className="p-2 text-zinc-400 hover:text-zinc-600">
                                    <span className="material-symbols-outlined text-lg">view_list</span>
                                </button>
                            </div>
                            <select 
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="border-none bg-transparent text-sm font-medium focus:ring-0 text-zinc-600"
                            >
                                <option value="popular">Ordenar: Más Popular</option>
                                <option value="newest">Más Nuevo</option>
                                <option value="price-low">Precio: Menor a Mayor</option>
                                <option value="price-high">Precio: Mayor a Menor</option>
                            </select>
                        </div>
                        {/* 4-Column Grid */}
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-outline-variant border-t-primary"></div>
                            </div>
                        ) : paginatedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
                                {paginatedProducts.map((product, index) => (
                                    <div key={product.id} className="group">
                                        <div className="relative aspect-[3/4] bg-surface-container-lowest overflow-hidden mb-4 border border-outline-variant/10 rounded-lg">
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                                            {index === 0 && (
                                                <div className="absolute top-3 left-3">
                                                    <span className="bg-white/90 backdrop-blur px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-900 rounded-sm">New Arrival</span>
                                                </div>
                                            )}
                                            <button className="absolute bottom-4 right-4 bg-white text-zinc-900 p-3 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                                            </button>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-semibold tracking-tight text-zinc-900">{product.name}</h3>
                                            <p className="text-xs text-zinc-500 uppercase tracking-wider">{product.category}</p>
                                            <div className="flex items-center justify-between pt-2">
                                                {product.price_on_request ? (
                                                    <a
                                                        href={getWhatsAppLink(product.name, product.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-[#25D366] hover:bg-[#128C7E] px-2 py-1 rounded-full uppercase tracking-widest transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 shrink-0">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                        </svg>
                                                        A consultar
                                                    </a>
                                                ) : (
                                                    <span className="text-sm font-bold">${product.retail_price?.toFixed(2)}</span>
                                                )}
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Available</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-xl text-zinc-500 mb-4">No se encontraron productos</p>
                            </div>
                        )}
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-20 flex justify-center items-center space-x-6">
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="group flex items-center text-xs font-black tracking-widest uppercase text-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined mr-2">arrow_back</span> Anterior
                                </button>
                                <div className="flex items-center space-x-4">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <span 
                                            key={i} 
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`text-xs font-black cursor-pointer ${currentPage === i + 1 ? 'text-zinc-900' : 'text-zinc-300'}`}
                                        >
                                            {(i + 1).toString().padStart(2, '0')}
                                        </span>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="group flex items-center text-xs font-black tracking-widest uppercase text-zinc-900 transition-colors disabled:opacity-50"
                                >
                                    Siguiente <span className="material-symbols-outlined ml-2">arrow_forward</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
