import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Layers, Calendar, Package } from 'lucide-react';
import { Button } from '../ui/Button';

export function DetalleTanda() {
    const { tanda } = useParams(); // tanda is the name (encoded)
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tandaInfo, setTandaInfo] = useState({ date: null, count: 0 });

    const tandaName = decodeURIComponent(tanda);

    useEffect(() => {
        fetchTandaDetails();
    }, [tandaName]);

    const fetchTandaDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('entradas')
                .select('*')
                .eq('tanda_nombre', tandaName)
                .order('marca', { ascending: true }); // Group by Brand visually via sort

            if (error) throw error;

            setProducts(data || []);

            if (data && data.length > 0) {
                // Assuming all rows in a Tanda have the same date
                setTandaInfo({
                    date: data[0].tanda_fecha,
                    count: data.length,
                    codigoBoleta: data[0].codigo_boleta,
                    gastos: data[0].gastos
                });
            }

        } catch (error) {
            console.error('Error fetching tanda details:', error);
            alert('Error al cargar detalle de la tanda.');
        } finally {
            setLoading(false);
        }
    };

    // Derived Logic for Totals
    const totalDocenas = products.reduce((sum, p) => sum + (p.cantidad_docenas || 0), 0);
    const totalMoney = products.reduce((sum, p) => sum + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0)), 0);

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" className="pl-0 gap-2" onClick={() => navigate('/admin/mercancia')}>
                    <ArrowLeft className="w-4 h-4" /> Volver al Listado
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando detalles...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                    No se encontraron productos para esta tanda.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-black text-white rounded-lg">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{tandaName}</h1>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> {tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString() : '-'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" /> {products.length} productos
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Info: Gastos Only (Boleta is per brand now) */}
                        <div className="flex flex-col md:flex-row gap-6 md:px-12 items-center flex-1 justify-center border-l border-r border-gray-100 mx-6 my-4 md:my-0">
                            <div>
                                <p className="text-xs uppercase text-gray-400 font-semibold mb-1">Gastos Totales</p>
                                <p className="font-mono font-medium text-gray-900">
                                    ${Number(tandaInfo.gastos || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-sm text-gray-500">Valor Total Estimado</p>
                            <p className="text-3xl font-bold text-green-600">${totalMoney.toLocaleString('es-AR')}</p>
                            <p className="text-xs text-gray-400">{totalDocenas} docenas en total</p>
                        </div>
                    </div>

                    {/* Products Grouped by Brand */}
                    <div className="space-y-6">
                        {Object.values(
                            products.reduce((acc, prod) => {
                                if (!acc[prod.marca]) {
                                    acc[prod.marca] = {
                                        name: prod.marca,
                                        boleta: prod.codigo_boleta,
                                        items: []
                                    };
                                }
                                acc[prod.marca].items.push(prod);
                                return acc;
                            }, {})
                        ).map((brandGroup, idx) => (
                            <BrandSection key={idx} brandGroup={brandGroup} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Collapsible Subcomponent for Brand Section
function BrandSection({ brandGroup }) {
    const [isExpanded, setIsExpanded] = useState(false); // Default collapsed as per "dropdown" request? Or expanded?
    // "cuando el usuario hace click sobre ella, se despliega" -> Sounds like default collapsed.

    return (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Brand Header */}
            <div
                className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide flex items-center gap-3">
                    {brandGroup.name}
                    {!isExpanded && (
                        <span className="text-xs font-normal text-gray-500 bg-white border px-2 py-0.5 rounded-full">
                            {brandGroup.items.length} productos
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Boleta:</span>
                        <span className={`font-mono text-sm font-medium ${brandGroup.boleta ? 'text-gray-900' : 'text-red-500 italic'}`}>
                            {brandGroup.boleta || 'NO INGRESADA'}
                        </span>
                    </div>
                    {/* Chevron Indicator */}
                    <div className="text-gray-400">
                        {isExpanded ? (
                            <ArrowLeft className="w-5 h-5 -rotate-90 transition-transform" />
                            // Using ArrowLeft rotated or Chevron? Lucide 'ChevronDown' is better but I need to import it.
                            // I only imported ArrowLeft, Layers, Calendar, Package.
                            // I should add ChevronDown to imports or reuse ArrowLeft rotated.
                            // Let's rely on adding ChevronDown to top import first.
                        ) : (
                            <ArrowLeft className="w-5 h-5 rotate-90 transition-transform" />
                        )}
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3 text-center">Docenas</th>
                                <th className="px-6 py-3 text-right">Precio Doc.</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {brandGroup.items.map((prod) => (
                                <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium">{prod.producto_titulo}</td>
                                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{prod.codigo}</td>
                                    <td className="px-6 py-4 text-center font-bold">{prod.cantidad_docenas}</td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        ${Number(prod.precio_docena || 0).toLocaleString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-700">
                                        ${(prod.cantidad_docenas * (Number(prod.precio_docena) || 0)).toLocaleString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 italic">
                                        {prod.observaciones || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
