import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function CategoryList() {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) console.error(error);
        else setCategories(data || []);
        setLoading(false);
    };

    const addCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        const slug = newCategory.toLowerCase().replace(/\s+/g, '-');
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name: newCategory, slug }])
            .select();

        if (error) {
            alert('Error al crear categoría: ' + error.message);
        } else {
            setCategories([...categories, data[0]]);
            setNewCategory('');
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('¿Estás seguro? Esto podría afectar a productos asociados.')) return;

        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar');
        } else {
            setCategories(categories.filter((c) => c.id !== id));
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Categorías</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Listado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div>Cargando...</div>
                        ) : (
                            <ul className="space-y-2">
                                {categories.map((category) => (
                                    <li key={category.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                                        <span>{category.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => deleteCategory(category.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </li>
                                ))}
                                {categories.length === 0 && <li className="text-muted-foreground">No hay categorías.</li>}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Create Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Nueva Categoría</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={addCategory} className="flex gap-2">
                            <Input
                                placeholder="Nombre de la categoría"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <Button type="submit">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
