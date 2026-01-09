import React from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, Phone, Mail, Send } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function Contact() {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const onSubmit = (data) => {
        const phoneNumber = '1234567890'; // Replace with config number
        const message = `Hola, mi nombre es ${data.name}.%0A%0A${data.message}%0A%0AEmail: ${data.email}%0ATeléfono: ${data.phone}`;
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <h1 className="text-3xl font-bold mb-8 text-center">Contáctanos</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Contact Form */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Envíanos un mensaje</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nombre</label>
                                    <Input
                                        {...register('name', { required: 'Este campo es requerido' })}
                                        placeholder="Tu nombre"
                                    />
                                    {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <Input
                                        type="email"
                                        {...register('email', { required: 'Este campo es requerido' })}
                                        placeholder="tu@email.com"
                                    />
                                    {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Teléfono</label>
                                    <Input
                                        type="tel"
                                        {...register('phone')}
                                        placeholder="+1 234 567 890"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Mensaje</label>
                                    <textarea
                                        {...register('message', { required: 'Este campo es requerido' })}
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="¿En qué podemos ayudarte?"
                                    />
                                    {errors.message && <span className="text-red-500 text-xs">{errors.message.message}</span>}
                                </div>

                                <Button type="submit" className="w-full">
                                    <Send className="mr-2 h-4 w-4" /> Enviar a WhatsApp
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Info & Map */}
                <div className="space-y-8">
                    {/* Contact Info */}
                    <div className="grid gap-6">
                        <div className="flex items-start space-x-4">
                            <MapPin className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Ubicación</h3>
                                <p className="text-muted-foreground">Calle Principal 123, Ciudad, País</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <Phone className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Teléfono</h3>
                                <p className="text-muted-foreground">+1 234 567 890</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-4">
                            <Mail className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">Email</h3>
                                <p className="text-muted-foreground">info@eshop.com</p>
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="aspect-video w-full rounded-lg overflow-hidden border bg-gray-100">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.835434509374!2d144.9537353153169!3d-37.81362797975171!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6ad642af0f11fd81%3A0xf577d6a32f7f1f84!2sFederation%20Square!5e0!3m2!1sen!2sau!4v1620000000000!5m2!1sen!2sau"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            title="Google Maps"
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
    );
}
