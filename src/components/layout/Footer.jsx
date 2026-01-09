import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';

export function Footer() {
    return (
        <footer className="border-t bg-background">
            <div className="container mx-auto px-4 py-8 md:px-6">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    <div>
                        <h3 className="text-lg font-bold">E-Shop</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Tu tienda de confianza para los mejores productos.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">Enlaces Rápidos</h4>
                        <ul className="mt-4 space-y-2 text-sm">
                            <li>
                                <Link to="/" className="text-muted-foreground hover:text-primary">
                                    Inicio
                                </Link>
                            </li>
                            <li>
                                <Link to="/catalog" className="text-muted-foreground hover:text-primary">
                                    Catálogo
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact" className="text-muted-foreground hover:text-primary">
                                    Contacto
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">Contacto</h4>
                        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <li>Calle Principal 123</li>
                            <li>Ciudad, País</li>
                            <li>info@eshop.com</li>
                            <li>+1 234 567 890</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold">Síguenos</h4>
                        <div className="mt-4 flex space-x-4">
                            <a href="#" className="text-muted-foreground hover:text-primary">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-muted-foreground hover:text-primary">
                                <Instagram className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-muted-foreground hover:text-primary">
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                </div>
                <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} E-Shop. Todos los derechos reservados.
                </div>
            </div>
        </footer>
    );
}
