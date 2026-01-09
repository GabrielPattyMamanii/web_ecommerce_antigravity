import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export function ProductList() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name)')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching products:', error);
        else setProducts(data || []);
        setLoading(false);
    };

    const deleteProduct = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar');
        } else {
            setProducts(products.filter((p) => p.id !== id));
        }
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Productos</h1>
                <Link to="/admin/products/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                    </Button>
                </Link>
            </div>

            <div className="mb-6">
                <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            {loading ? (
                <div>Cargando...</div>
            ) : (
                <div className="bg-white rounded-md border">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Imagen</th>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3">Precio</th>
                                <th className="px-4 py-3">Stock</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="h-10 w-10 rounded bg-gray-100 overflow-hidden">
                                            {product.images && product.images[0] && (
                                                <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{product.name}</td>
                                    <td className="px-4 py-3">{product.categories?.name || '-'}</td>
                                    <td className="px-4 py-3">${product.price}</td>
                                    <td className="px-4 py-3">{product.stock}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/admin/products/edit/${product.id}`}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => deleteProduct(product.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">
                                        No hay productos encontrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
