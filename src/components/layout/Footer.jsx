import React from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export function Footer() {
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
    return (
        <footer className="bg-brand-coral mt-20 text-white">
            <div className="container mx-auto px-4 md:px-16 py-12">

                {/* Main Grid: Brand | Navegar | Categorías | Ayuda */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">

                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to="/" className="text-xl font-black tracking-tight text-white mb-3 inline-block font-nunito">
                            MI TIENDA
                        </Link>
                        <p className="text-sm text-white/80 leading-relaxed max-w-xs">
                            Indumentaria deportiva de alto rendimiento.<br/>
                            Calidad, estilo y consistencia en cada prenda.
                        </p>
                    </div>

                    {/* Navegar */}
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-widest text-white/50 mb-5">Navegar</h3>
                        <ul className="space-y-3">
                            <li><Link to="/" className="text-sm text-white/80 hover:text-white transition-colors">Inicio</Link></li>
                            <li><Link to="/catalog" className="text-sm text-white/80 hover:text-white transition-colors">Catálogo</Link></li>
                            <li><Link to="/contact" className="text-sm text-white/80 hover:text-white transition-colors">Contacto</Link></li>
                        </ul>
                    </div>

                    {/* Categorías */}
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-widest text-white/50 mb-5">Categorías</h3>
                        <ul className="space-y-3">
                            <li><Link to="/catalog?category=Remeras" className="text-sm text-white/80 hover:text-white transition-colors">Remeras</Link></li>
                            <li><Link to="/catalog?category=Pantalones" className="text-sm text-white/80 hover:text-white transition-colors">Pantalones</Link></li>
                            <li><Link to="/catalog?category=Accesorios" className="text-sm text-white/80 hover:text-white transition-colors">Accesorios</Link></li>
                        </ul>
                    </div>

                    {/* Ayuda */}
                    <div>
                        <h3 className="font-bold text-xs uppercase tracking-widest text-white/50 mb-5">Ayuda</h3>
                        <ul className="space-y-3">
                            <li><Link to="/contact" className="text-sm text-white/80 hover:text-white transition-colors">Cambios</Link></li>
                            <li><Link to="/contact" className="text-sm text-white/80 hover:text-white transition-colors">Envíos</Link></li>
                            <li><Link to="/contact" className="text-sm text-white/80 hover:text-white transition-colors">Contacto</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-5">
                    {/* Copyright */}
                    <p className="text-xs text-white/60 text-center md:text-left order-3 md:order-1">
                        © 2024 MI TIENDA · Todos los derechos reservados
                    </p>

                    {/* Social icons */}
                    <div className="flex items-center gap-3 order-1 md:order-2">
                        <span className="text-xs text-white/50 uppercase tracking-widest mr-1">Seguinos</span>

                        {/* WhatsApp (Actual - Muestra "Próximamente") */}
                        <a href="#" onClick={handleSocialClick} aria-label="WhatsApp" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.61 4.46 1.68 5.33L3 29l7.9-2.07A13 13 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.67 17.8c-.28.78-1.63 1.5-2.24 1.59-.58.08-1.32.12-2.13-.13-.49-.15-1.12-.36-1.93-.7-3.39-1.46-5.6-4.88-5.77-5.1-.16-.23-1.33-1.77-1.33-3.38 0-1.6.84-2.39 1.14-2.72.3-.32.65-.4.87-.4h.62c.2 0 .47-.08.73.56.28.68.95 2.33.95 2.33a.6.6 0 01-.04.57c-.1.18-.16.3-.31.46-.16.17-.33.37-.47.5-.16.14-.32.3-.14.59.19.3.84 1.38 1.8 2.23 1.23 1.1 2.27 1.44 2.59 1.6.32.17.5.14.69-.08.18-.22.78-.91 1-1.22.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.14.5.22.57.34.08.13.08.73-.2 1.55z"/>
                            </svg>
                        </a>
                        {/* WhatsApp (Para cuando tengas el link, descomenta esto y borra el de arriba)
                        <a href="https://wa.me/TUNUMERO" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.61 4.46 1.68 5.33L3 29l7.9-2.07A13 13 0 0016 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.67 17.8c-.28.78-1.63 1.5-2.24 1.59-.58.08-1.32.12-2.13-.13-.49-.15-1.12-.36-1.93-.7-3.39-1.46-5.6-4.88-5.77-5.1-.16-.23-1.33-1.77-1.33-3.38 0-1.6.84-2.39 1.14-2.72.3-.32.65-.4.87-.4h.62c.2 0 .47-.08.73.56.28.68.95 2.33.95 2.33a.6.6 0 01-.04.57c-.1.18-.16.3-.31.46-.16.17-.33.37-.47.5-.16.14-.32.3-.14.59.19.3.84 1.38 1.8 2.23 1.23 1.1 2.27 1.44 2.59 1.6.32.17.5.14.69-.08.18-.22.78-.91 1-1.22.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.14.5.22.57.34.08.13.08.73-.2 1.55z"/>
                            </svg>
                        </a>
                        */}

                        {/* TikTok (Actual - Muestra "Próximamente") */}
                        <a href="#" onClick={handleSocialClick} aria-label="TikTok" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.5 6a7.2 7.2 0 004.5 1.7v4A11.2 11.2 0 0121 9.8v8.7a8.5 8.5 0 11-8.5-8.5h.5v4h-.5a4.5 4.5 0 104.5 4.5V6h4z"/>
                            </svg>
                        </a>
                        {/* TikTok (Para cuando tengas el link, descomenta esto y borra el de arriba)
                        <a href="https://tiktok.com/@tu_usuario" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.5 6a7.2 7.2 0 004.5 1.7v4A11.2 11.2 0 0121 9.8v8.7a8.5 8.5 0 11-8.5-8.5h.5v4h-.5a4.5 4.5 0 104.5 4.5V6h4z"/>
                            </svg>
                        </a>
                        */}

                        {/* Instagram (Actual - Muestra "Próximamente") */}
                        <a href="#" onClick={handleSocialClick} aria-label="Instagram" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="4" y="4" width="24" height="24" rx="7" stroke="white" strokeWidth="2"/>
                                <circle cx="16" cy="16" r="5.5" stroke="white" strokeWidth="2"/>
                                <circle cx="23" cy="9" r="1.5" fill="white"/>
                            </svg>
                        </a>
                        {/* Instagram (Para cuando tengas el link, descomenta esto y borra el de arriba)
                        <a href="https://instagram.com/tu_usuario" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="4" y="4" width="24" height="24" rx="7" stroke="white" strokeWidth="2"/>
                                <circle cx="16" cy="16" r="5.5" stroke="white" strokeWidth="2"/>
                                <circle cx="23" cy="9" r="1.5" fill="white"/>
                            </svg>
                        </a>
                        */}

                        {/* Facebook (Actual - Muestra "Próximamente") */}
                        <a href="#" onClick={handleSocialClick} aria-label="Facebook" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 10.5h-2.5c-1.5 0-2.5 1-2.5 2.5v3h5l-.5 4h-4.5v10h-4.5v-10h-3v-4h3v-3c0-3.5 2-5 5.5-5h4v3.5z"/>
                            </svg>
                        </a>
                        {/* Facebook (Para cuando tengas el link, descomenta esto y borra el de arriba)
                        <a href="https://facebook.com/tu_pagina" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 10.5h-2.5c-1.5 0-2.5 1-2.5 2.5v3h5l-.5 4h-4.5v10h-4.5v-10h-3v-4h3v-3c0-3.5 2-5 5.5-5h4v3.5z"/>
                            </svg>
                        </a>
                        */}
                    </div>

                    {/* Payment Methods — all inline, no external URLs */}
                    <div className="flex items-center gap-3 order-2 md:order-3">

                        {/* Mercado Pago */}
                        <div className="h-10 bg-white rounded-lg px-3 flex items-center justify-center">
                            <svg viewBox="0 0 110 22" height="16" xmlns="http://www.w3.org/2000/svg">
                                <text y="16" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#009EE3">Mercado</text>
                                <text x="56" y="16" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" fill="#00BCFF">Pago</text>
                            </svg>
                        </div>

                        {/* Mastercard */}
                        <div className="h-10 bg-white rounded-lg px-3 flex items-center justify-center">
                            <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="14" cy="12" r="10" fill="#EB001B"/>
                                <circle cx="24" cy="12" r="10" fill="#F79E1B"/>
                                <path d="M19 4.93a10 10 0 010 14.14A10 10 0 0119 4.93z" fill="#FF5F00"/>
                            </svg>
                        </div>

                        {/* Visa */}
                        <div className="h-10 bg-white rounded-lg px-3 flex items-center justify-center">
                            <svg viewBox="0 0 60 20" width="48" height="16" xmlns="http://www.w3.org/2000/svg">
                                <text y="16" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="-1">VISA</text>
                            </svg>
                        </div>

                    </div>
                </div>

            </div>
        </footer>
    );
}
