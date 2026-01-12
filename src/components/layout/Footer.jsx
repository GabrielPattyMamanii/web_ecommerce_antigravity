import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Github } from 'lucide-react';

export function Footer() {
    return (
        <footer className="bg-gray-100 mt-20">
            <div className="container mx-auto px-4 md:px-16 py-16">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
                    {/* Logo and Description */}
                    <div className="md:col-span-1 text-center md:text-left">
                        <Link to="/" className="text-2xl font-bold mb-4 inline-block">
                            SHOP.CO
                        </Link>
                        <p className="text-sm text-gray-600 mb-6">
                            Tenemos ropa que se adapta a tu estilo y de la que estás orgulloso de usar. Desde mujeres hasta hombres.
                        </p>
                        <div className="flex gap-3 justify-center md:justify-start">
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">Compañía</h3>
                        <ul className="space-y-3">
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Acerca de</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Características</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Trabajos</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Carrera</Link></li>
                        </ul>
                    </div>

                    {/* Help */}
                    <div>
                        <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">Ayuda</h3>
                        <ul className="space-y-3">
                            <li><Link to="/contact" className="text-sm text-gray-600 hover:text-black transition-colors">Soporte al Cliente</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Detalles de Envío</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Términos y Condiciones</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Política de Privacidad</Link></li>
                        </ul>
                    </div>

                    {/* FAQ */}
                    <div>
                        <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">Preguntas</h3>
                        <ul className="space-y-3">
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Cuenta</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Gestionar Envíos</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Pedidos</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Pagos</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider">Recursos</h3>
                        <ul className="space-y-3">
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">eBooks Gratuitos</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Tutorial de Desarrollo</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Cómo - Blog</Link></li>
                            <li><Link to="#" className="text-sm text-gray-600 hover:text-black transition-colors">Lista de YouTube</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-300 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-600 text-center md:text-left">
                        Shop.co © 2000-2023, All Rights Reserved
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="Visa" className="h-8" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-8" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-8" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple Pay" className="h-8" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="Google Pay" className="h-8" />
                    </div>
                </div>
            </div>
        </footer>
    );
}
