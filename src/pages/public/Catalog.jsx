import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FilterDrawer } from '../../components/ui/FilterDrawer';
import { supabase } from '../../lib/supabase';
import { getWhatsAppLink } from '../../utils/whatsapp';
import { useCartStore } from '../../context/cartStore';
import Toast from '../../components/ui/Toast';

export function Catalog() {
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [toast, setToast] = useState(null);
    const { addItem } = useCartStore();

    // Filter states
    const [maxPrice, setMaxPrice] = useState(500);
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [sortBy, setSortBy] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const [expandedSections, setExpandedSections] = useState({
        categories: true, price: true, colors: false, size: false
    });

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        const search = searchParams.get('search');
        if (search !== null) setSearchTerm(search);

        const category = searchParams.get('category');
        if (category) {
            setSelectedCategory(category);
        }
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: catsData } = await supabase.from('categories').select('*');
            if (catsData) setCategories(catsData);

            const [prodsRes, catalogProdsRes] = await Promise.all([
                supabase.from('products').select('*, categories(name)').eq('published', true),
                supabase.from('catalog_products').select('*, categories(name)').eq('published', true)
            ]);

            let combined = [];
            if (prodsRes.data) {
                combined = [...combined, ...prodsRes.data.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Sin categoría',
                    image: p.images?.[0] || ''
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

            // Compute max price for slider
            const top = Math.max(...combined.map(p => p.retail_price || 0), 500);
            setMaxPrice(top);
            setPriceRange([0, top]);
            setProducts(combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (s) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));
    const handleColorToggle = (c) => setSelectedColors(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
    const handleSizeToggle = (s) => setSelectedSizes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
    const clearFilters = () => {
        setSelectedCategory('All');
        setPriceRange([0, maxPrice]);
        setSelectedColors([]);
        setSelectedSizes([]);
        setSearchTerm('');
    };

    const filteredProducts = products.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
        
        let matchCat = selectedCategory === 'All';
        if (!matchCat) {
            const selectedCatObj = categories.find(c => c.name === selectedCategory);
            if (selectedCatObj && !selectedCatObj.parent_id) {
                // Is a parent category, so include its subcategories as well
                const subCatsNames = categories.filter(c => c.parent_id === selectedCatObj.id).map(c => c.name);
                matchCat = p.category === selectedCategory || subCatsNames.includes(p.category);
            } else {
                matchCat = p.category === selectedCategory;
            }
        }

        const price = p.retail_price || 0;
        const matchPrice = price >= priceRange[0] && price <= priceRange[1];
        const matchColor = selectedColors.length === 0 || (p.colors && p.colors.some(c => selectedColors.includes(c)));
        const matchSize = selectedSizes.length === 0 || (p.sizes && p.sizes.some(s => selectedSizes.includes(s)));
        return matchSearch && matchCat && matchPrice && matchColor && matchSize;
    });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
        if (sortBy === 'price-asc') return (a.retail_price || 0) - (b.retail_price || 0);
        if (sortBy === 'price-desc') return (b.retail_price || 0) - (a.retail_price || 0);
        return new Date(b.created_at) - new Date(a.created_at); // newest
    });

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
    const paginatedProducts = sortedProducts.slice(0, currentPage * itemsPerPage);

    const availableColors = [
        { value: 'Green', name: 'Verde', hex: '#4F7942' },
        { value: 'Red', name: 'Rojo', hex: '#DC143C' },
        { value: 'Yellow', name: 'Amarillo', hex: '#FFD700' },
        { value: 'Orange', name: 'Naranja', hex: '#FF8C00' },
        { value: 'Blue', name: 'Azul', hex: '#1E90FF' },
        { value: 'Purple', name: 'Morado', hex: '#9370DB' },
        { value: 'Pink', name: 'Rosa', hex: '#FF69B4' },
        { value: 'White', name: 'Blanco', hex: '#FFFFFF' },
        { value: 'Black', name: 'Negro', hex: '#000000' },
    ];
    const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    const activeFilterCount = (selectedCategory !== 'All' ? 1 : 0) + selectedColors.length + selectedSizes.length + (priceRange[1] < maxPrice ? 1 : 0);

    return (
        <>
        <div className="bg-[#fcfcf9] text-public-secondary font-body min-h-screen">
            {/* Mobile Filter Drawer */}
            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                selectedColors={selectedColors}
                handleColorToggle={handleColorToggle}
                selectedSizes={selectedSizes}
                handleSizeToggle={handleSizeToggle}
                availableColors={availableColors}
                availableSizes={availableSizes}
                applyFilters={() => setIsFilterOpen(false)}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
            />

            <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-8 lg:py-12">
            
                {/* Brand Header */}
                <div className="mb-10 lg:mb-16 border-b border-black/5 pb-8 relative overflow-hidden rounded-[2rem] bg-[#ffffec]/50 p-8 sm:p-12 shadow-sm">
                    <div className="relative z-10">
                        <span className="text-xs font-black text-public-primary uppercase tracking-[0.3em] block mb-3">Boutique</span>
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black font-headline tracking-tighter text-public-secondary mb-4">
                            NUESTRA <span className="italic text-public-primary">COLECCIÓN</span>
                        </h1>
                        <p className="text-public-secondary/70 font-medium max-w-xl text-lg lg:text-xl">Encuentra las piezas perfectas de esta temporada, desde prendas urbanas funcionales hasta seleccionados premium.</p>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-public-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                </div>

                {/* Top bar: search + sort + mobile filter trigger */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8 items-center">
                    {/* Search */}
                    <div className="relative flex-1 w-full">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: '20px' }}>search</span>
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                        className="py-3 px-4 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none text-on-surface shrink-0"
                    >
                        <option value="newest">Más nuevo</option>
                        <option value="price-asc">Precio: menor a mayor</option>
                        <option value="price-desc">Precio: mayor a menor</option>
                    </select>
                    {/* Mobile filter button */}
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="md:hidden flex items-center gap-2 py-3 px-5 bg-primary text-on-primary rounded-xl font-bold text-sm shrink-0"
                    >
                        <span className="material-symbols-outlined text-sm">tune</span>
                        Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                </div>

                <div className="flex gap-8">
                    {/* ── SIDEBAR ── */}
                    <aside className="hidden md:flex flex-col w-60 shrink-0 space-y-8 sticky top-28 self-start">

                        {/* Active filters count + clear */}
                        {activeFilterCount > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary uppercase tracking-widest">{activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''} activo{activeFilterCount > 1 ? 's' : ''}</span>
                                <button onClick={clearFilters} className="text-xs text-on-surface-variant hover:text-primary transition-colors underline">Limpiar</button>
                            </div>
                        )}

                        {/* CATEGORÍAS */}
                        <div>
                            <button
                                onClick={() => toggleSection('categories')}
                                className="w-full flex items-center justify-between text-xs font-black tracking-widest uppercase text-on-surface mb-4"
                            >
                                Categorías
                                <span className="material-symbols-outlined text-base transition-transform" style={{ transform: expandedSections.categories ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                            </button>
                            {expandedSections.categories && (
                                <div className="space-y-2">
                                    {[{ id: 'all', name: 'Todos' }, ...categories].map(cat => {
                                        const isActive = (cat.name === 'Todos' ? selectedCategory === 'All' : selectedCategory === cat.name);
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => { setSelectedCategory(cat.name === 'Todos' ? 'All' : cat.name); setCurrentPage(1); }}
                                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden group ${
                                                    isActive
                                                        ? 'bg-public-primary/10 text-public-primary'
                                                        : 'text-public-secondary hover:bg-black/5'
                                                }`}
                                            >
                                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-public-primary rounded-l-xl"></div>}
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-surface-container-highest" />

                        {/* PRECIO */}
                        <div>
                            <button
                                onClick={() => toggleSection('price')}
                                className="w-full flex items-center justify-between text-xs font-black tracking-widest uppercase text-on-surface mb-4"
                            >
                                Precio
                                <span className="material-symbols-outlined text-base transition-transform" style={{ transform: expandedSections.price ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                            </button>
                            {expandedSections.price && (
                                <div className="space-y-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={maxPrice}
                                        value={priceRange[1]}
                                        onChange={e => { setPriceRange([0, Number(e.target.value)]); setCurrentPage(1); }}
                                        className="w-full accent-primary h-1.5 rounded-lg"
                                    />
                                    <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                                        <span>$0</span>
                                        <span className="text-primary">${priceRange[1].toFixed(0)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-surface-container-highest" />

                        {/* TALLAS */}
                        <div>
                            <button
                                onClick={() => toggleSection('size')}
                                className="w-full flex items-center justify-between text-xs font-black tracking-widest uppercase text-on-surface mb-4"
                            >
                                Talla
                                <span className="material-symbols-outlined text-base transition-transform" style={{ transform: expandedSections.size ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                            </button>
                            {expandedSections.size && (
                                <div className="grid grid-cols-3 gap-2">
                                    {availableSizes.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => { handleSizeToggle(size); setCurrentPage(1); }}
                                            className={`h-10 border-2 rounded-lg text-xs font-bold transition-all ${
                                                selectedSizes.includes(size)
                                                    ? 'border-primary bg-primary text-on-primary'
                                                    : 'border-surface-container-highest text-on-surface hover:border-primary'
                                            }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-surface-container-highest" />

                        {/* COLORES */}
                        <div>
                            <button
                                onClick={() => toggleSection('colors')}
                                className="w-full flex items-center justify-between text-xs font-black tracking-widest uppercase text-on-surface mb-4"
                            >
                                Color
                                <span className="material-symbols-outlined text-base transition-transform" style={{ transform: expandedSections.colors ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                            </button>
                            {expandedSections.colors && (
                                <div className="flex flex-wrap gap-2">
                                    {availableColors.map(color => (
                                        <button
                                            key={color.value}
                                            onClick={() => { handleColorToggle(color.value); setCurrentPage(1); }}
                                            title={color.name}
                                            className={`w-8 h-8 rounded-full transition-all ${
                                                selectedColors.includes(color.value)
                                                    ? 'ring-2 ring-primary ring-offset-2 scale-110'
                                                    : 'hover:ring-2 hover:ring-primary/40 ring-offset-1 ring-1 ring-outline-variant/30'
                                            }`}
                                            style={{ backgroundColor: color.hex }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* ── PRODUCT GRID ── */}
                    <div className="flex-1 min-w-0">
                        {/* Results count */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-on-surface-variant">
                                <span className="font-bold text-on-surface">{filteredProducts.length}</span> productos
                                {selectedCategory !== 'All' && <span> en <span className="font-semibold text-primary">{selectedCategory}</span></span>}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-24">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-outline-variant border-t-primary"></div>
                            </div>
                        ) : paginatedProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10 md:gap-x-8 md:gap-y-16">
                                    {paginatedProducts.map((product, index) => {
                                        return (
                                            <Link
                                                key={product.id}
                                                to={`/catalog/${product.id}`}
                                                className="group cursor-pointer bg-white rounded-3xl p-3 shadow-sm hover:shadow-2xl transition-all duration-500 border border-black/5 flex flex-col h-full transform hover:-translate-y-2"
                                            >
                                                <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-50 mb-5 relative">
                                                    {product.image ? (
                                                        <img
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                            src={product.image}
                                                            alt={product.name}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-black/5 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-5xl text-black/20">image</span>
                                                        </div>
                                                    )}
                                                    {index % 4 === 0 && (
                                                        <div className="absolute top-3 left-3 bg-public-primary text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Nuevo</div>
                                                    )}
                                                    {index % 4 === 2 && (
                                                        <div className="absolute top-3 right-3 bg-public-tertiary text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">Top</div>
                                                    )}
                                                    {/* Hover pill */}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 duration-500"></div>
                                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 z-20 transition-all duration-500 translate-y-4 group-hover:-translate-y-1/2">
                                                        <span className="bg-white/95 backdrop-blur-sm text-black text-xs font-bold px-5 py-2.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">Ver Detalle</span>
                                                    </div>
                                                </div>
                                                <div className="px-3 pb-3 flex-grow flex flex-col justify-between">
                                                    <div>
                                                        <span className="text-[10px] font-black text-public-primary uppercase tracking-[0.25em] block mb-1.5 opacity-90 truncate">{product.category}</span>
                                                        <h3 className="text-xl font-bold text-public-secondary leading-tight group-hover:text-public-primary transition-colors line-clamp-2">{product.name}</h3>
                                                    </div>
                                                    <div className="mt-4 flex items-center justify-between gap-2">
                                                        {product.price_on_request ? (
                                                            <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                                                                <a
                                                                    href={getWhatsAppLink(product.name, product.id)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-sm font-black text-white bg-[#25D366] hover:bg-[#128C7E] px-3 py-1 rounded-full transition-colors"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
                                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                                    </svg>
                                                                    Consultar
                                                                </a>
                                                                <button
                                                                    onClick={() => {
                                                                        const result = addItem({
                                                                            id: product.id,
                                                                            name: product.name,
                                                                            price: 0,
                                                                            image: product.image,
                                                                            price_on_request: true,
                                                                        });
                                                                        if (result?.conflict) {
                                                                            setToast({ mensaje: 'No podés mezclar productos con precio y productos a consultar', tipo: 'error' });
                                                                        } else {
                                                                            setToast({ mensaje: `"${product.name}" agregado a tu cotización`, tipo: 'success' });
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-1 text-sm font-black text-public-primary border-2 border-public-primary hover:bg-public-primary hover:text-white px-3 py-1 rounded-full transition-colors"
                                                                >
                                                                    + Agregar
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-lg font-black text-public-secondary">${product.retail_price?.toFixed(2) || '0.00'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Load more */}
                                {currentPage < totalPages && (
                                    <div className="mt-16 flex flex-col items-center gap-4">
                                        <button
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            className="px-10 py-3 bg-gradient-to-r from-primary to-primary-dim text-on-primary font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
                                        >
                                            Cargar más
                                        </button>
                                        <p className="text-on-surface-variant text-xs">Viendo {paginatedProducts.length} de {filteredProducts.length} productos</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-24 flex flex-col items-center gap-4">
                                <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">search_off</span>
                                <p className="text-lg font-bold text-on-surface">Sin resultados</p>
                                <p className="text-sm text-on-surface-variant">Intenta ajustar tus filtros</p>
                                <button onClick={clearFilters} className="mt-2 text-primary font-bold text-sm underline underline-offset-4">Limpiar filtros</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
        {toast && (
            <div className="fixed bottom-6 right-6 z-50">
                <Toast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />
            </div>
        )}
        </>
    );
}
