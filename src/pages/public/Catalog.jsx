import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronRight, ChevronDown } from 'lucide-react';
import { ProductCard } from '../../components/products/ProductCard';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Button } from '../../components/ui/Button';
import { ColorPicker } from '../../components/ui/ColorPicker';
import { FilterDrawer } from '../../components/ui/FilterDrawer';
import { supabase } from '../../lib/supabase';

export function Catalog() {
    const [searchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter states
    const [priceRange, setPriceRange] = useState([0, 500]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [sortBy, setSortBy] = useState('popular');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Expandable sections
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        price: true,
        colors: true,
        size: true,
        style: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Update search term when URL changes
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

            const { data: prodsData } = await supabase
                .from('products')
                .select('*, categories(name)')
                .eq('published', true)
                .order('created_at', { ascending: false });
            if (prodsData) {
                const mappedProducts = prodsData.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Sin categoría',
                    image: p.images?.[0] || 'https://via.placeholder.com/300'
                }));
                setProducts(mappedProducts);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleColorToggle = (color) => {
        setSelectedColors(prev =>
            prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
        );
    };

    const handleSizeToggle = (size) => {
        setSelectedSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
        );
    };

    const applyFilters = () => {
        // Filters are applied in real-time through filteredProducts
        console.log('Filters applied');
    };

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;

        // Price filter (using retail_price)
        const price = product.retail_price || 0;
        const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

        // Color filter
        const matchesColor = selectedColors.length === 0 ||
            (product.colors && product.colors.some(c => selectedColors.includes(c)));

        // Size filter
        const matchesSize = selectedSizes.length === 0 ||
            (product.sizes && product.sizes.some(s => selectedSizes.includes(s)));

        return matchesSearch && matchesCategory && matchesPrice && matchesColor && matchesSize;
    });

    // Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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

    const availableSizes = ['XX-Small', 'X-Small', 'Small', 'Medium', 'Large', 'X-Large', 'XX-Large', '3X-Large', '4X-Large'];

    return (
        <div className="min-h-screen bg-white">
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
                applyFilters={applyFilters}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
            />

            <div className="container mx-auto px-4 md:px-16 py-8">
                {/* Breadcrumb */}
                <Breadcrumb items={[
                    { label: 'Inicio', href: '/' },
                    { label: selectedCategory === 'All' ? 'Catálogo' : selectedCategory }
                ]} />

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Desktop Sidebar Filters */}
                    <aside className="hidden lg:block lg:w-72 flex-shrink-0">
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-lg">Filtros</h3>
                                <SlidersHorizontal className="w-5 h-5 text-gray-400" />
                            </div>

                            {/* Categories */}
                            <div className="mb-6">
                                <button
                                    onClick={() => toggleSection('categories')}
                                    className="flex items-center justify-between w-full mb-3"
                                >
                                    <h4 className="font-semibold text-sm">Categorías</h4>
                                    {expandedSections.categories ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {expandedSections.categories && (
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setSelectedCategory('All')}
                                            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === 'All' ? 'bg-black text-white' : 'hover:bg-gray-100'
                                                }`}
                                        >
                                            Todos
                                        </button>
                                        {categories.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.name)}
                                                className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.name ? 'bg-black text-white' : 'hover:bg-gray-100'
                                                    }`}
                                            >
                                                {cat.name}
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <hr className="my-6" />

                            {/* Price Range */}
                            <div className="mb-6">
                                <button
                                    onClick={() => toggleSection('price')}
                                    className="flex items-center justify-between w-full mb-3"
                                >
                                    <h4 className="font-semibold text-sm">Precio</h4>
                                    {expandedSections.price ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {expandedSections.price && (
                                    <div className="space-y-4">
                                        <input
                                            type="range"
                                            min="0"
                                            max="500"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                            className="w-full accent-black"
                                        />
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">${priceRange[0]}</span>
                                            <span className="font-medium">${priceRange[1]}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <hr className="my-6" />

                            {/* Colors */}
                            <div className="mb-6">
                                <button
                                    onClick={() => toggleSection('colors')}
                                    className="flex items-center justify-between w-full mb-3"
                                >
                                    <h4 className="font-semibold text-sm">Colores</h4>
                                    {expandedSections.colors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {expandedSections.colors && (
                                    <div className="grid grid-cols-5 gap-3">
                                        {availableColors.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => handleColorToggle(color.value)}
                                                className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColors.includes(color.value) ? 'border-black scale-110' : 'border-gray-200'
                                                    }`}
                                                style={{ backgroundColor: color.hex }}
                                                title={color.name}
                                            >
                                                {selectedColors.includes(color.value) && (
                                                    <svg className="w-5 h-5 text-white mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <hr className="my-6" />

                            {/* Sizes */}
                            <div className="mb-6">
                                <button
                                    onClick={() => toggleSection('size')}
                                    className="flex items-center justify-between w-full mb-3"
                                >
                                    <h4 className="font-semibold text-sm">Tallas</h4>
                                    {expandedSections.size ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                {expandedSections.size && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableSizes.map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => handleSizeToggle(size)}
                                                className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${selectedSizes.includes(size)
                                                    ? 'bg-black text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Apply Filter Button */}
                            <Button className="w-full" onClick={applyFilters}>
                                Aplicar Filtros
                            </Button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h1 className="text-2xl md:text-3xl font-bold">{selectedCategory === 'All' ? 'Todos los Productos' : selectedCategory}</h1>

                            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                {/* Mobile Filter Button */}
                                <button
                                    onClick={() => setIsFilterOpen(true)}
                                    className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full font-medium"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    Filtros
                                </button>

                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-600 hidden sm:inline">
                                        {paginatedProducts.length} de {filteredProducts.length}
                                    </span>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                    >
                                        <option value="popular">Más Popular</option>
                                        <option value="newest">Más Nuevo</option>
                                        <option value="price-low">Precio: Menor a Mayor</option>
                                        <option value="price-high">Precio: Mayor a Menor</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Buscar productos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>

                        {/* Products Grid */}
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black"></div>
                                <p className="mt-4 text-gray-600">Cargando productos...</p>
                            </div>
                        ) : paginatedProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                    {paginatedProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-12">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            ← Anterior
                                        </button>
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1
                                                    ? 'bg-black text-white'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Siguiente →
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-xl text-gray-600 mb-4">No se encontraron productos</p>
                                <p className="text-sm text-gray-500">Intenta ajustar tus filtros o término de búsqueda</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
