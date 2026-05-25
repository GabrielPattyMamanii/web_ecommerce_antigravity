import React from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, Phone, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function Contact() {
    const { register, handleSubmit, formState: { errors } } = useForm();

    const handleSocialClick = (e) => {
        e.preventDefault();
        toast('Próximamente', {
            icon: '🚧',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    const onSubmit = (data) => {
        const phoneNumber = '1234567890'; // Replace with config number
        const message = `Hola, mi nombre es ${data.name}.%0A%0A${data.message}%0A%0AEmail: ${data.email}%0ATeléfono: ${data.phone}`;
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    return (
        <div className="bg-surface font-body text-on-surface min-h-screen">
            <main className="max-w-[1440px] mx-auto px-8 pt-12 pb-24">
                {/* Hero Section: Editorial Style */}
                <section className="relative mb-32">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        <div className="md:col-span-7 z-10">
                            <h1 className="text-6xl md:text-8xl font-black text-primary leading-[0.9] tracking-tighter mb-8 font-headline">
                                ANIMATE<br /> <span className="text-on-surface">CONTACTANOS!</span>
                            </h1>
                            <p className="text-xl text-on-surface-variant max-w-md mb-12 font-medium leading-relaxed">
                                Si tienes alguna pregunta sobre nuestros productos, ¡hablanos, vamos a escucharte!
                            </p>
                            {/* Quick Contact Pills */}
                            <div className="flex flex-wrap gap-4">
                                <div className="bg-secondary-container px-6 py-3 rounded-full flex items-center space-x-3 shadow-[0_20px_40px_rgba(0,73,230,0.06)]">
                                    <span className="material-symbols-outlined text-on-secondary-container">call</span>
                                    <span className="text-on-secondary-container font-bold">+54 1134656584</span>
                                </div>
                                <div className="bg-tertiary-container px-6 py-3 rounded-full flex items-center space-x-3 shadow-[0_20px_40px_rgba(0,73,230,0.06)]">
                                    <span className="material-symbols-outlined text-on-tertiary-container">mail</span>
                                    <span className="text-on-tertiary-container font-bold">lurielcontact@gmail.com</span>
                                </div>
                            </div>
                        </div>
                        <div className="md:col-span-5 relative mt-12 md:mt-0">
                            <div className="bg-primary aspect-[4/5] rounded-[32px] overflow-hidden rotate-3 hover:rotate-0 transition-transform duration-500 shadow-[0_20px_40px_rgba(0,73,230,0.06)]">
                                <img alt="Editorial Fashion" className="w-full h-full object-cover mix-blend-multiply opacity-80" src="/tyson.jpeg" />
                            </div>
                            {/* Overlapping Glass Card */}
                            <div className="absolute -bottom-8 -left-12 bg-white/70 backdrop-blur-md p-8 rounded-[24px] shadow-[0_20px_40px_rgba(0,73,230,0.06)] max-w-[280px] hidden md:block">
                                <p className="text-primary font-black italic tracking-tighter text-xl mb-2 font-headline">VARIEDADES</p>
                                <p className="text-sm text-on-surface-variant leading-relaxed">Ropa importada y mucho mas!</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Content: Bento Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Contact Form Section 
                    <div className="md:col-span-2 bg-surface-container-lowest p-12 rounded-[32px] shadow-[0_20px_40px_rgba(0,73,230,0.06)] border border-outline-variant/10">
                        <div className="mb-12">
                            <h2 className="text-4xl font-black tracking-tight text-on-surface mb-2 font-headline">Send a Message</h2>
                            <p className="text-on-surface-variant">We usually respond within 24 hours.</p>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        {...register('name', { required: 'Este campo es requerido' })}
                                        className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-xl p-4 text-on-surface placeholder:text-outline-variant outline-none"
                                        placeholder="Alex Rivera"
                                        type="text"
                                    />
                                    {errors.name && <span className="text-error text-xs ml-1">{errors.name.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        {...register('email', { required: 'Este campo es requerido' })}
                                        className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-xl p-4 text-on-surface placeholder:text-outline-variant outline-none"
                                        placeholder="alex@kinetic.com"
                                        type="email"
                                    />
                                    {errors.email && <span className="text-error text-xs ml-1">{errors.email.message}</span>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-8 mt-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1">Phone (Optional)</label>
                                    <input
                                        {...register('phone')}
                                        className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-xl p-4 text-on-surface placeholder:text-outline-variant outline-none"
                                        placeholder="+1 234 567 8900"
                                        type="tel"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 mt-8">
                                <label className="text-sm font-bold text-on-surface-variant uppercase tracking-widest ml-1">Message</label>
                                <textarea
                                    {...register('message', { required: 'Este campo es requerido' })}
                                    className="w-full bg-surface-container-low border-none focus:ring-2 focus:ring-primary-container rounded-xl p-4 text-on-surface placeholder:text-outline-variant outline-none"
                                    placeholder="Tell us what's on your mind..."
                                    rows="5"
                                ></textarea>
                                {errors.message && <span className="text-error text-xs ml-1">{errors.message.message}</span>}
                            </div>
                            <button type="submit" className="bg-gradient-to-r from-primary to-primary-dim text-on-primary px-12 py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,73,230,0.06)] flex items-center justify-center space-x-3">
                                <span>Send Message</span>
                                <span className="material-symbols-outlined">send</span>
                            </button>
                        </form>
                    </div>*/}

                    {/* Sidebar Info: Social & Location */}
                    <div className="space-y-8 md:col-span-3">
                        {/* Social Links Card */}
                        <div className="bg-surface-container-low p-8 rounded-[32px] space-y-6">
                            <h3 className="flex text-5xl font-black tracking-tight font-headline justify-center">Nuestras redes!</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Instagram (Actual) */}
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="#" onClick={handleSocialClick}>
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs><radialGradient id="ig-grad" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497" /><stop offset="5%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" /><stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" /></radialGradient></defs>
                                        <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
                                        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
                                        <circle cx="17.5" cy="6.5" r="1" fill="white" />
                                        <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>Instagram</span>
                                </a>
                                {/* Instagram (Para cuando tengas el link, descomenta esto y borra el de arriba)
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="https://instagram.com/tu_usuario" target="_blank" rel="noopener noreferrer">
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs><radialGradient id="ig-grad" cx="30%" cy="107%" r="150%"><stop offset="0%" stopColor="#fdf497" /><stop offset="5%" stopColor="#fdf497" /><stop offset="45%" stopColor="#fd5949" /><stop offset="60%" stopColor="#d6249f" /><stop offset="90%" stopColor="#285AEB" /></radialGradient></defs>
                                        <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
                                        <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.5" fill="none" />
                                        <circle cx="17.5" cy="6.5" r="1" fill="white" />
                                        <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>Instagram</span>
                                </a>
                                */}

                                {/* TikTok (Actual) */}
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="#" onClick={handleSocialClick}>
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="24" height="24" rx="6" fill="#010101" />
                                        <path d="M16.6 5C16.7 6.5 17.6 7.8 19 8.2V10.8C17.9 10.9 16.9 10.5 16 9.9V14.5C16 17 14 19 11.5 19C9 19 7 17 7 14.5C7 12 9 10 11.5 10C11.7 10 11.9 10 12.1 10.1V12.7C11.9 12.6 11.7 12.6 11.5 12.6C10.4 12.6 9.5 13.5 9.5 14.6C9.5 15.7 10.4 16.6 11.5 16.6C12.6 16.6 13.6 15.7 13.6 14.6V5H16.6Z" fill="white" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>TikTok</span>
                                </a>
                                {/* TikTok (Para cuando tengas el link, descomenta esto y borra el de arriba)
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="https://tiktok.com/@tu_usuario" target="_blank" rel="noopener noreferrer">
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="24" height="24" rx="6" fill="#010101" />
                                        <path d="M16.6 5C16.7 6.5 17.6 7.8 19 8.2V10.8C17.9 10.9 16.9 10.5 16 9.9V14.5C16 17 14 19 11.5 19C9 19 7 17 7 14.5C7 12 9 10 11.5 10C11.7 10 11.9 10 12.1 10.1V12.7C11.9 12.6 11.7 12.6 11.5 12.6C10.4 12.6 9.5 13.5 9.5 14.6C9.5 15.7 10.4 16.6 11.5 16.6C12.6 16.6 13.6 15.7 13.6 14.6V5H16.6Z" fill="white" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>TikTok</span>
                                </a>
                                */}

                                {/* WhatsApp (Este ya tiene número, lo dejamos normal) */}
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="https://wa.me/1134656584" target="_blank" rel="noopener noreferrer">
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="24" height="24" rx="6" fill="#25D366" />
                                        <path d="M12 4C7.6 4 4 7.6 4 12C4 13.5 4.4 14.9 5.2 16.1L4 20L8 18.8C9.2 19.5 10.6 19.9 12 19.9C16.4 19.9 20 16.3 20 11.9C20 7.5 16.4 4 12 4ZM16.2 15.3C16 15.8 15.1 16.3 14.6 16.4C14.1 16.5 13.5 16.5 12.9 16.3C12.4 16.1 11.7 15.9 10.9 15.5C8.9 14.5 7.6 12.5 7.5 12.3C7.4 12.1 6.8 11.3 6.8 10.4C6.8 9.5 7.3 9.1 7.5 8.9C7.7 8.7 7.9 8.7 8.1 8.7C8.3 8.7 8.4 8.7 8.6 8.7C8.8 8.7 9 8.6 9.2 9.1C9.4 9.6 9.9 10.5 9.9 10.6C10 10.7 10 10.9 9.9 11C9.8 11.1 9.8 11.2 9.7 11.3C9.6 11.4 9.5 11.6 9.4 11.7C9.3 11.8 9.2 12 9.3 12.2C9.4 12.4 9.9 13.2 10.7 13.9C11.7 14.8 12.5 15.1 12.7 15.2C12.9 15.3 13.1 15.3 13.2 15.1C13.3 15 13.8 14.4 14 14.2C14.2 14 14.3 14 14.5 14.1C14.7 14.2 15.7 14.7 15.9 14.8C16.1 14.9 16.2 15 16.3 15C16.4 15.1 16.4 15.2 16.2 15.3Z" fill="white" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>WhatsApp</span>
                                </a>

                                {/* Facebook (Actual) */}
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="#" onClick={handleSocialClick}>
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="24" height="24" rx="6" fill="#1877F2" />
                                        <path d="M15 8H13C12.4 8 12 8.4 12 9V11H15L14.5 14H12V20H9V14H7V11H9V9C9 7.3 10.3 6 12 6H15V8Z" fill="white" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>Facebook</span>
                                </a>
                                {/* Facebook (Para cuando tengas el link, descomenta esto y borra el de arriba)
                                <a className="flex flex-col items-center justify-center p-6 bg-surface-container-lowest rounded-2xl hover:translate-y-[-4px] hover:shadow-lg transition-all duration-300" href="https://facebook.com/tu_pagina" target="_blank" rel="noopener noreferrer">
                                    <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="24" height="24" rx="6" fill="#1877F2" />
                                        <path d="M15 8H13C12.4 8 12 8.4 12 9V11H15L14.5 14H12V20H9V14H7V11H9V9C9 7.3 10.3 6 12 6H15V8Z" fill="white" />
                                    </svg>
                                    <span className="font-bold text-xs uppercase tracking-widest" style={{ color: '#2c2f32' }}>Facebook</span>
                                </a>
                                */}
                            </div>
                        </div>

                        {/* Store Info Card */}
                        <div className="w-full max-w-[500px] mx-auto bg-primary text-on-primary p-8 rounded-[32px] shadow-[0_20px_40px_rgba(0,73,230,0.06)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-20">
                                <span className="material-symbols-outlined text-8xl">store</span>
                            </div>
                            <h3 className="text-2xl font-black mb-4 relative z-10 font-headline">Visita nuestra tienda!</h3>
                            <p className="mb-6 opacity-90 relative z-10 leading-relaxed">
                                Feria la salada,<br />
                                Galeria los chinos,<br />
                                <span className="font-black animate-[rainbow_2s_linear_infinite]">local 28 planta baja.</span>
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center space-x-2 text-sm font-bold bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                                    <span className="material-symbols-outlined text-xs">schedule</span>
                                    <span>Lunes: 7:00AM - 12:30AM</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm font-bold bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                                    <span className="material-symbols-outlined text-xs">schedule</span>
                                    <span>Miercoles: 7:00AM - 12:30AM</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm font-bold bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                                    <span className="material-symbols-outlined text-xs">schedule</span>
                                    <span>Sábados: 7:00AM - 12:30AM</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Section: Asymmetric */}
                <section className="mt-24">
                    {/* The entire map container is now an 'a' tag. We use group to trigger hover animations on children */}
                    <a href="https://maps.app.goo.gl/mYY9HVG3GHyXKH3o9" target="_blank" rel="noopener noreferrer" className="block focus:outline-none group">
                        <div className="rounded-[40px] overflow-hidden h-[500px] relative shadow-[0_20px_40px_rgba(0,73,230,0.06)] cursor-pointer">
                            {/* We added transition to the background image scale when hovered */}
                            <div className="absolute inset-0 bg-surface-container-high flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                                {/* Real Google Maps Embed. pointer-events-none ensures it acts exactly like an image so clicks open the link */}
                                <iframe
                                    src="https://maps.google.com/maps?q=Feria%20La%20Salada,%20Galeria%20los%20chinos&t=&z=16&ie=UTF8&iwloc=&output=embed"
                                    className="w-full h-full border-0 pointer-events-none grayscale contrast-125 transition-all duration-700 group-hover:grayscale-0 group-hover:contrast-100"
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                    <div className="bg-primary w-12 h-12 rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(0,73,230,0.06)] animate-bounce group-hover:bg-primary-dim transition-colors">
                                        <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                    </div>
                                    <div className="mt-4 bg-white px-6 py-2 rounded-full shadow-xl transition-all group-hover:shadow-2xl group-hover:-translate-y-1">
                                        <span className="font-black text-sm tracking-tight text-primary uppercase">ABRIR EN GOOGLE MAPS</span>
                                    </div>
                                </div>
                            </div>

                            {/* Interactive Overlay - Updated with actual address. Added hover translation. */}
                            <div className="absolute top-8 right-8 bg-surface-container-lowest/95 backdrop-blur-sm p-6 rounded-3xl max-w-xs shadow-[0_20px_40px_rgba(0,73,230,0.06)] hidden md:block border border-outline-variant/10 transition-transform group-hover:translate-x-2 group-hover:-translate-y-2">
                                <h4 className="font-bold mb-2">Feria La Salada</h4>
                                <p className="text-sm text-on-surface-variant mb-4">Galeria los chinos, local 28 planta baja.</p>
                                {/* Changed button to a div looking like a button since it's already inside an 'a' tag */}
                                <div className="text-primary font-bold flex items-center space-x-2">
                                    <span>Ir con Maps</span>
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                </div>
                            </div>
                        </div>
                    </a>

                    {/* Store Photos Gallery Container */}
                    <div className="mt-12 mb-8">
                        <h3 className="text-2xl font-black mb-6 font-headline tracking-tight text-on-surface">Conocé nuestro local</h3>
                        {/* Grid layout: 1 column on mobile, 3 columns on sm/tablets and up */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Photo 1 Placeholder */}
                            {/* Remove the dashed border and icon when you place the actual image */}
                            <div className="aspect-square bg-surface-container-high rounded-[24px] overflow-hidden shadow-sm relative group">
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/50">
                                    <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                                </div>
                                <div className="absolute inset-0 border-2 border-dashed border-outline-variant/30 rounded-[24px] pointer-events-none group-hover:border-primary/50 transition-colors"></div>
                                {/* TODO: Place this inside when you have your image: */}
                                {/* <img src="/ruta/a/tu/foto1.jpg" alt="Fachada local" className="w-full h-full object-cover" /> */}
                            </div>

                            {/* Photo 2 Placeholder */}
                            <div className="aspect-square bg-surface-container-high rounded-[24px] overflow-hidden shadow-sm relative group">
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/50">
                                    <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                                </div>
                                <div className="absolute inset-0 border-2 border-dashed border-outline-variant/30 rounded-[24px] pointer-events-none group-hover:border-primary/50 transition-colors"></div>
                            </div>

                            {/* Photo 3 Placeholder */}
                            <div className="aspect-square bg-surface-container-high rounded-[24px] overflow-hidden shadow-sm relative group">
                                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/50">
                                    <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                                </div>
                                <div className="absolute inset-0 border-2 border-dashed border-outline-variant/30 rounded-[24px] pointer-events-none group-hover:border-primary/50 transition-colors"></div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
