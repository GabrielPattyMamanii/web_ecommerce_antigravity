import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { ProductCard } from '../../components/products/ProductCard';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';

export function Catalog() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Categories
            const { data: catsData } = await supabase.from('categories').select('*');
            if (catsData) {
                setCategories(['All', ...catsData.map(c => c.name)]);
            }

            // Fetch Products
            const { data: prodsData } = await supabase.from('products').select('*, categories(name)');
            if (prodsData) {
                // Map category name to product for filtering
                const mappedProducts = prodsData.map(p => ({
                    ...p,
                    category: p.categories?.name || 'Uncategorized',
                    image: p.images?.[0] || 'https://via.placeholder.com/300' // Fallback image
                }));
                setProducts(mappedProducts);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <h1 className="text-3xl font-bold mb-8">Catálogo de Productos</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Filters */}
                <aside className="w-full md:w-64 space-y-6">
                    <div>
                        <h3 className="font-semibold mb-4 flex items-center">
                            <Filter className="mr-2 h-4 w-4" /> Filtros
                        </h3>
                        <div className="space-y-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === category
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    {/* Search Bar */}
                    <div className="mb-6 relative">
                        <Input
                            type="search"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Product Grid */}
                    {loading ? (
                        <div className="text-center py-12">Cargando productos...</div>
                    ) : filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            No se encontraron productos que coincidan con tu búsqueda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
