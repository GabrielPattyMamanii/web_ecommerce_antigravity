import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Package, Layers, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function TandaCard({ tanda }) {
    // Format date
    const formattedDate = new Date(tanda.tanda_fecha).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return (
        <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 border-stone-200">
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Package className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
                                {tanda.tanda_nombre}
                            </h3>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formattedDate}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="text-center">
                        <div className="text-xs font-medium text-gray-500 mb-1 flex items-center justify-center gap-1">
                            <Layers className="h-3 w-3" /> Marcas
                        </div>
                        <div className="text-xl font-bold text-gray-800">{tanda.marcas_count}</div>
                    </div>
                    <div className="text-center border-l border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-1 flex items-center justify-center gap-1">
                            <ShoppingBag className="h-3 w-3" /> Prods
                        </div>
                        <div className="text-xl font-bold text-gray-800">{tanda.productos}</div>
                    </div>
                    <div className="text-center border-l border-gray-200">
                        <div className="text-xs font-medium text-gray-500 mb-1">Docenas</div>
                        <div className="text-xl font-bold text-green-600">{tanda.total_docenas}</div>
                    </div>
                </div>

                {/* Action Button */}
                <Link to={`/admin/precio-venta-sugerido/${encodeURIComponent(tanda.tanda_nombre)}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all">
                        Ver Precios
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
