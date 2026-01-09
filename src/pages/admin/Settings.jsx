import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function Settings() {
    const { register, handleSubmit, setValue } = useForm();
    const [loading, setLoading] = useState(false);
    const [configId, setConfigId] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        const { data, error } = await supabase.from('site_config').select('*').single();
        if (data) {
            setConfigId(data.id);
            setValue('contact_email', data.contact_email);
            setValue('contact_phone', data.contact_phone);
            setValue('whatsapp_number', data.whatsapp_number);
            setValue('address', data.address);
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);
        let error;

        if (configId) {
            ({ error } = await supabase.from('site_config').update(data).eq('id', configId));
        } else {
            ({ error } = await supabase.from('site_config').insert([data]));
        }

        if (error) {
            alert('Error al guardar: ' + error.message);
        } else {
            alert('Configuración guardada correctamente');
            fetchConfig();
        }
        setLoading(false);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Configuración del Sitio</h1>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email de Contacto</label>
                            <Input {...register('contact_email')} placeholder="info@eshop.com" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Teléfono</label>
                            <Input {...register('contact_phone')} placeholder="+1 234 567 890" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Número de WhatsApp (para pedidos)</label>
                            <Input {...register('whatsapp_number')} placeholder="1234567890" />
                            <p className="text-xs text-muted-foreground mt-1">Sin símbolos ni espacios (ej: 5491122334455)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Dirección</label>
                            <Input {...register('address')} placeholder="Calle Principal 123" />
                        </div>

                        <Button type="submit" disabled={loading}>
                            <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
