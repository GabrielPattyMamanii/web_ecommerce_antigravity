import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        fetchCategories();
        if (isEdit) fetchProduct();
    }, [id]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*');
        setCategories(data || []);
    };

    const fetchProduct = async () => {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) {
            console.error('Error fetching product:', error);
            navigate('/admin/products');
        } else {
            setValue('name', data.name);
            setValue('description', data.description);
            setValue('retail_price', data.retail_price);
            setValue('wholesale_price', data.wholesale_price);
            setValue('stock', data.stock);
            setValue('category_id', data.category_id);
            setValue('sizes', data.sizes ? data.sizes.join(', ') : '');
            setValue('colors', data.colors ? data.colors.join(', ') : '');
            if (data.images && data.images.length > 0) {
                setImagePreview(data.images[0]);
                setValue('image_url', data.images[0]);
            }
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('products')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const onSubmit = async (data) => {
        setLoading(true);
        try {
            let imageUrl = data.image_url;

            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            const productData = {
                name: data.name,
                description: data.description,
                retail_price: parseFloat(data.retail_price),
                wholesale_price: data.wholesale_price ? parseFloat(data.wholesale_price) : null,
                stock: parseInt(data.stock),
                category_id: data.category_id,
                images: imageUrl ? [imageUrl] : [],
                sizes: data.sizes ? data.sizes.split(',').map(s => s.trim()).filter(Boolean) : [],
                colors: data.colors ? data.colors.split(',').map(c => c.trim()).filter(Boolean) : [],
            };

            let error;
            if (isEdit) {
                ({ error } = await supabase.from('products').update(productData).eq('id', id));
            } else {
                ({ error } = await supabase.from('products').insert([productData]));
            }

            if (error) throw error;

            navigate('/admin/products');
        } catch (error) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="ghost" onClick={() => navigate('/admin/products')} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>

            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nombre del Producto</label>
                                    <Input {...register('name', { required: 'Requerido' })} placeholder="Ej: Remera Básica" />
                                    {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Categoría</label>
                                    <select
                                        {...register('category_id')}
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Seleccionar Categoría</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Imagen del Producto</label>
                                <div className="border-2 border-dashed border-input rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="mx-auto h-40 object-contain rounded-md" />
                                    ) : (
                                        <div className="py-8 text-muted-foreground">
                                            <p>Haz clic para subir una imagen</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Descripción</label>
                            <textarea
                                {...register('description')}
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Detalles del producto..."
                            />
                        </div>

                        {/* Pricing */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Precio Minorista ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('retail_price', { required: 'Requerido' })}
                                    placeholder="0.00"
                                />
                                {errors.retail_price && <span className="text-red-500 text-xs">{errors.retail_price.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Precio Mayorista ($)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('wholesale_price')}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Stock</label>
                                <Input
                                    type="number"
                                    {...register('stock')}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Variants */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Talles (separados por coma)</label>
                                <Input
                                    {...register('sizes')}
                                    placeholder="S, M, L, XL"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Colores (separados por coma)</label>
                                <Input
                                    {...register('colors')}
                                    placeholder="Rojo, Azul, Negro"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? 'Guardando...' : 'Guardar Producto'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
