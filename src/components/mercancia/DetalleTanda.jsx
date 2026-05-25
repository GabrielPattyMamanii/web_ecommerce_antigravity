import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Layers, Calendar, Package, X, ChevronLeft, ChevronRight, Image as ImageIcon, Download, QrCode, ClipboardList, ShoppingCart, BarChart, Settings, ChevronDown, Filter } from 'lucide-react';
import { Button } from '../ui/Button';

import { useMobile } from '../../hooks/useMobile';
export function DetalleTanda() {
    const isMobile = useMobile();
    const { tanda } = useParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tandaInfo, setTandaInfo] = useState({ date: null, count: 0 });
    const [photos, setPhotos] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    const tandaName = decodeURIComponent(tanda);

    const [users, setUsers] = useState([]);

    // Filter State
    const [filterBrand, setFilterBrand] = useState('');
    const [filterOwner, setFilterOwner] = useState('');
    const [filterCode, setFilterCode] = useState('');


    useEffect(() => {
        fetchTandaDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tandaName]);

    const fetchTandaDetails = async () => {
        setLoading(true);
        try {
            const [entradasResponse, usersResponse, tandaResponse] = await Promise.all([
                supabase
                    .from('entradas')
                    .select('*')
                    .eq('tanda_nombre', tandaName)
                    .order('marca', { ascending: true }),
                supabase
                    .from('app_users')
                    .select('username, color'),
                supabase
                    .from('tandas')
                    .select('id, parametros')
                    .eq('nombre', tandaName)
                    .maybeSingle()
            ]);

            const { data, error } = entradasResponse;
            const { data: usersData } = usersResponse;
            const { data: tandaData } = tandaResponse;

            if (error) throw error;

            setProducts(data || []);
            setUsers(usersData || []);

            if (data && data.length > 0) {
                setTandaInfo({
                    date: data[0].tanda_fecha,
                    count: data.length,
                    codigoBoleta: data[0].codigo_boleta,
                    gastos: data[0].gastos,
                    id: tandaData?.id,
                    parametros: tandaData?.parametros || {}
                });

                if (data[0].fotos && Array.isArray(data[0].fotos)) {
                    setPhotos(data[0].fotos);
                }
            }

        } catch (error) {
            console.error('Error fetching tanda details:', error);
            alert('Error al cargar detalle de la tanda.');
        } finally {
            setLoading(false);
        }
    };

    // --- Filter Logic ---
    const uniqueBrands = [...new Set(products.map(p => p.marca))].sort();
    const uniqueOwners = [...new Set(products.map(p => p.propietario).filter(Boolean))].sort();
    const uniqueCodes = [...new Set(products.map(p => p.codigo_boleta).filter(Boolean))].sort();

    const filteredProducts = products.filter(p => {
        const matchBrand = filterBrand ? p.marca === filterBrand : true;
        const matchOwner = filterOwner ? p.propietario === filterOwner : true;
        const matchCode = filterCode ? p.codigo_boleta === filterCode : true;
        return matchBrand && matchOwner && matchCode;
    });

    const totalDocenas = filteredProducts.reduce((sum, p) => sum + (p.cantidad_docenas || 0), 0); // Recalculate based on filtered
    const totalMoney = filteredProducts.reduce((sum, p) => sum + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0)), 0);


    const openBrandPhoto = (photoUrl) => {
        setSelectedPhoto(photoUrl);
        setPhotoModalOpen(true);
    };

    const closeLightbox = () => {
        setPhotoModalOpen(false);
        setSelectedPhoto(null);
    };

    const downloadImage = async (imageUrl) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `marca-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error descargando imagen:', error);
            alert('Error al descargar la imagen');
        }
    };

    if (isMobile) {
        const activeFilterCount = (filterBrand ? 1 : 0) + (filterOwner ? 1 : 0) + (filterCode ? 1 : 0);
        
        return (
            <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
                {/* Mobile Header - Stitch Design */}
                <div className="bg-white px-4 pt-4 pb-3 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <button
                        onClick={() => navigate('/admin/mercancia')}
                        className="flex items-center gap-1.5 text-sm text-[#1A1A1A] hover:opacity-80 mb-2 transition-opacity inline-block"
                    >
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-[18px] font-black text-[#1A1A1A] leading-tight uppercase tracking-tight">{tandaName}</h1>
                            <p className="text-[12px] text-[#8E8E93] uppercase mt-[2px] font-bold tracking-widest">
                                {loading ? 'CARGANDO...' : `${filteredProducts.length} PRODUCTOS`}
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowMobileFilters(true)}
                            className="relative bg-gray-50 p-2.5 rounded-full text-[#1A1A1A] active:scale-95 transition-transform border border-gray-100 shadow-sm"
                        >
                            <Filter className="w-5 h-5" strokeWidth={2.5} />
                            {activeFilterCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-[#FF5C39] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {activeFilterCount > 0 && (
                    <div className="flex gap-2 px-4 pt-3 overflow-x-auto hide-scrollbar">
                        {filterBrand && (
                            <span className="bg-[#FEF1EC] text-[#FF5C39] border border-orange-100 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                Marca: {filterBrand}
                                <button onClick={() => setFilterBrand('')} className="bg-white/50 rounded-full p-0.5"><X className="w-3 h-3" strokeWidth={3} /></button>
                            </span>
                        )}
                        {filterOwner && (
                            <span className="bg-[#EEF2FF] text-[#4B6BFB] border border-blue-100 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                Prop: {filterOwner}
                                <button onClick={() => setFilterOwner('')} className="bg-white/50 rounded-full p-0.5"><X className="w-3 h-3" strokeWidth={3} /></button>
                            </span>
                        )}
                        {filterCode && (
                            <span className="bg-[#F5F3FF] text-[#7C3AED] border border-purple-100 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                                Bol: {filterCode}
                                <button onClick={() => setFilterCode('')} className="bg-white/50 rounded-full p-0.5"><X className="w-3 h-3" strokeWidth={3} /></button>
                            </span>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                         <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                         <span className="text-sm font-medium">Cargando detalles...</span>
                    </div>
                ) : products.length === 0 ? (
                    <div className="mx-4 mt-6 text-center py-16 bg-white rounded-[32px] border border-dashed border-gray-200">
                        <Package className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium">No hay productos en esta tanda</p>
                    </div>
                ) : (
                    <div className="px-4 py-4 space-y-4">
                        {/* Summary Card - Peach Stitch Design */}
                        <div className="bg-[#FEF1EC] rounded-[28px] p-6 shadow-[0_4px_15px_rgba(255,92,57,0.05)] space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="bg-[#FF5C39] p-2 rounded-xl text-white shadow-md shadow-orange-100">
                                    <ClipboardList className="w-5 h-5" />
                                </span>
                                <span className="text-[#1A1A1A] font-black text-[15px] uppercase tracking-tight">
                                    Gastos Totales: <span className="font-medium ml-1">${Number(tandaInfo.gastos || 0).toLocaleString()}</span>
                                </span>
                            </div>
                            <div className="flex items-start gap-3">
                                <span className="bg-[#FF5C39] p-2 rounded-xl text-white shadow-md shadow-orange-100 mt-0.5">
                                    <Layers className="w-5 h-5" />
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[#1A1A1A] font-black text-[15px] uppercase tracking-tight">
                                        Valor Total Estimado:
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[#FF5C39] text-2xl font-black">${totalMoney.toLocaleString('es-AR')}</span>
                                        <span className="text-[#8E8E93] text-[13px] font-bold">({totalDocenas} docenas)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Brand Accordions */}
                        <div className="space-y-4">
                            {Object.values(
                                filteredProducts.reduce((acc, prod) => {
                                    const key = prod.marca_id ? prod.marca_id : `${prod.marca}_${prod.codigo_boleta || 'sin_boleta'}_${prod.propietario || 'sin_prop'}`;
                                    if (!acc[key]) {
                                        acc[key] = {
                                            key: key,
                                            name: prod.marca,
                                            boleta: prod.codigo_boleta,
                                            propietario: prod.propietario || '',
                                            items: [],
                                            photos: [],
                                            bultosSum: 0
                                        };
                                    }
                                    acc[key].items.push(prod);
                                    acc[key].bultosSum += (parseFloat(prod.bultos) || 0);
                                    
                                    if (prod.fotos && Array.isArray(prod.fotos)) {
                                        prod.fotos.forEach(photo => { if (!acc[key].photos.includes(photo)) acc[key].photos.push(photo); });
                                    }

                                    // Extract custom bultos metadata
                                    if (!acc[key].bultos_personalizados && tandaInfo.parametros?.marcasMetadata) {
                                        const metaById = prod.marca_id ? tandaInfo.parametros.marcasMetadata[prod.marca_id] : null;
                                        const metaByName = tandaInfo.parametros.marcasMetadata[prod.marca];
                                        const meta = metaById || metaByName;
                                        if (meta && meta.bultos_personalizados !== undefined) {
                                            acc[key].bultos_personalizados = meta.bultos_personalizados;
                                        }
                                    }
                                    return acc;
                                }, {})
                            ).map((brandGroup, idx) => {
                                // Compute per-product owners
                                const ownerTotals = {};
                                let hasExplicitOwner = false;
                                brandGroup.items.forEach(prod => {
                                    const ownerName = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                    const amount = (prod.cantidad_docenas || 0) * (Number(prod.precio_docena) || 0);
                                    const bucket = ownerName || '—';
                                    if (ownerName) hasExplicitOwner = true;
                                    if (!ownerTotals[bucket]) ownerTotals[bucket] = 0;
                                    ownerTotals[bucket] += amount;
                                });
                                // If no product has an explicit owner, clear totals (no color shown)
                                if (!hasExplicitOwner) Object.keys(ownerTotals).forEach(k => delete ownerTotals[k]);
                                const isMultiOwner = Object.keys(ownerTotals).length > 1;
                                const owner = users.find(u => u.username === brandGroup.propietario);
                                // Effective single owner color: from global propietario OR from ownerTotals if exactly 1 person
                                const singleOwnerKey = !isMultiOwner && Object.keys(ownerTotals).length === 1 && Object.keys(ownerTotals)[0] !== '—' ? Object.keys(ownerTotals)[0] : null;
                                const ownerColor = owner?.color || (singleOwnerKey ? users.find(u => u.username === singleOwnerKey)?.color : null);
                                return (
                                    <BrandSectionMobile 
                                        key={idx} 
                                        brandGroup={brandGroup} 
                                        ownerColor={ownerColor}
                                        ownerTotals={ownerTotals}
                                        isMultiOwner={isMultiOwner}
                                        users={users}
                                        onPhotoClick={openBrandPhoto} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Photo Modal remains same logic */}
                {photoModalOpen && selectedPhoto && (
                    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={closeLightbox}>
                         <div className="absolute top-6 right-6 flex gap-3">
                            <button onClick={(e) => { e.stopPropagation(); downloadImage(selectedPhoto); }} className="bg-green-500 p-3 rounded-full text-white shadow-xl active:scale-90 transition-transform">
                                <Download className="w-5 h-5" />
                            </button>
                            <button onClick={closeLightbox} className="bg-red-500 p-3 rounded-full text-white shadow-xl active:scale-90 transition-transform">
                                <X className="w-5 h-5" />
                            </button>
                         </div>
                         <img src={selectedPhoto} alt="Vista" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()} />
                    </div>
                )}

                {/* Mobile Filters Bottom Sheet Modal */}
                {showMobileFilters && (
                    <div className="fixed inset-0 z-[100] flex items-end bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMobileFilters(false)}>
                        <div 
                            className="w-full bg-white rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 border-t border-gray-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[22px] font-black text-[#1A1A1A] tracking-tight uppercase">Filtros</h3>
                                <button onClick={() => setShowMobileFilters(false)} className="bg-gray-100 p-2.5 rounded-full active:scale-95 transition-transform">
                                    <X className="w-5 h-5 text-[#8E8E93]" strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-1.5 block ml-1">Marca</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-100 rounded-[20px] py-4 px-4 text-[15px] font-bold text-[#1A1A1A] appearance-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                                        value={filterBrand}
                                        onChange={(e) => setFilterBrand(e.target.value)}
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238E8E93%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}
                                    >
                                        <option value="">Todas las Marcas</option>
                                        {uniqueBrands.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                     <label className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-1.5 block ml-1">Propietario</label>
                                     <select
                                        className="w-full bg-gray-50 border border-gray-100 rounded-[20px] py-4 px-4 text-[15px] font-bold text-[#1A1A1A] appearance-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                                        value={filterOwner}
                                        onChange={(e) => setFilterOwner(e.target.value)}
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238E8E93%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}
                                    >
                                        <option value="">Todos los Propietarios</option>
                                        {uniqueOwners.map(o => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-[#8E8E93] uppercase tracking-widest mb-1.5 block ml-1">N° Boleta</label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-100 rounded-[20px] py-4 px-4 text-[15px] font-bold text-[#1A1A1A] appearance-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                                        value={filterCode}
                                        onChange={(e) => setFilterCode(e.target.value)}
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238E8E93%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '12px auto' }}
                                    >
                                        <option value="">Todas las Boletas</option>
                                        {uniqueCodes.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode(''); setShowMobileFilters(false); }}
                                    className="flex-1 py-4 bg-gray-100 text-[#8E8E93] font-black rounded-[20px] uppercase tracking-widest text-[13px] active:scale-95 transition-transform"
                                >
                                    Limpiar
                                </button>
                                <button 
                                    onClick={() => setShowMobileFilters(false)}
                                    className="flex-[2] py-4 bg-[#FF5C39] text-white font-black rounded-[20px] uppercase tracking-widest text-[13px] active:scale-95 transition-transform shadow-lg shadow-orange-200"
                                >
                                    Filtros: {activeFilterCount}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <Button variant="ghost" className="pl-0 gap-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/admin/mercancia')}>
                    <ArrowLeft className="w-4 h-4" /> Volver al Listado
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando detalles...</div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border text-muted-foreground">
                    No se encontraron productos para esta tanda.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Card */}
                    <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary text-primary-foreground rounded-lg">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">{tandaName}</h1>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> {tandaInfo.date ? new Date(tandaInfo.date).toLocaleDateString() : '-'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-4 h-4" /> {products.length} productos
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Info: Gastos Only */}
                        <div className="flex flex-col md:flex-row gap-6 md:px-12 items-center flex-1 justify-center border-t border-b md:border-t-0 md:border-b-0 md:border-l md:border-r border-border py-4 md:py-0">
                            <div>
                                <p className="text-xs uppercase text-muted-foreground font-semibold mb-1 text-center">Gastos Totales</p>
                                <p className="font-mono font-medium text-foreground text-center text-lg">
                                    ${Number(tandaInfo.gastos || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">${totalMoney.toLocaleString('es-AR')}</p>
                            <p className="text-xs text-muted-foreground">{totalDocenas} docenas en total</p>
                        </div>
                    </div>


                    {/* Photo Modal */}
                    {photoModalOpen && selectedPhoto && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
                            onClick={closeLightbox}
                        >
                            {/* Floating Buttons - Fixed Position Top Right */}
                            <div className="fixed top-5 right-5 flex flex-col gap-3 z-[9999]">
                                {/* Close Button */}
                                <button
                                    onClick={closeLightbox}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium shadow-md transition-colors"
                                    style={{
                                        backgroundColor: '#dc3545',
                                        fontSize: '15px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc3545'}
                                >
                                    <X className="w-4 h-4" />
                                    <span>Salir</span>
                                </button>

                                {/* Download Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        downloadImage(selectedPhoto);
                                    }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-md text-white font-medium shadow-md transition-colors"
                                    style={{
                                        backgroundColor: '#28a745',
                                        fontSize: '15px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Descargar</span>
                                </button>
                            </div>

                            {/* Document Viewer */}
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="relative max-w-[90vw] max-h-[90vh]"
                            >
                                <img
                                    src={selectedPhoto}
                                    alt="Vista previa"
                                    className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                                />
                            </div>
                        </div>
                    )}


                    {/* Filters Section */}
                    <div className="flex gap-4 mb-4 bg-muted/20 p-4 rounded-xl border border-border flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Marca</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterBrand}
                                onChange={(e) => setFilterBrand(e.target.value)}
                            >
                                <option value="">Todas las Marcas</option>
                                {uniqueBrands.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Propietario</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterOwner}
                                onChange={(e) => setFilterOwner(e.target.value)}
                            >
                                <option value="">Todos los Propietarios</option>
                                {uniqueOwners.map(o => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">N° Boleta</label>
                            <select
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                            >
                                <option value="">Todas las Boletas</option>
                                {uniqueCodes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        {(filterBrand || filterOwner || filterCode) && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => { setFilterBrand(''); setFilterOwner(''); setFilterCode(''); }}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-md text-sm font-medium transition-colors"
                                >
                                    Limpiar Filtros
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Products Grouped by Brand */}
                    <div className="space-y-6">
                        {Object.values(
                            filteredProducts.reduce((acc, prod) => {
                                // Group by marca_id if available, otherwise fallback to composite key including propietario
                                const key = prod.marca_id ? prod.marca_id : `${prod.marca}_${prod.codigo_boleta || 'sin_boleta'}_${prod.propietario || 'sin_prop'}`;
                                if (!acc[key]) {
                                    acc[key] = {
                                        key: key, // Store key for identification
                                        name: prod.marca,
                                        boleta: prod.codigo_boleta,
                                        propietario: prod.propietario || '',
                                        items: [],
                                        photos: [],
                                        bultosSum: 0 // Sum of product bultos
                                    };
                                }
                                acc[key].items.push(prod);
                                acc[key].bultosSum += (parseFloat(prod.bultos) || 0);

                                // Agregar fotos únicas de este producto
                                if (prod.fotos && Array.isArray(prod.fotos)) {
                                    prod.fotos.forEach(photo => {
                                        if (!acc[key].photos.includes(photo)) {
                                            acc[key].photos.push(photo);
                                        }
                                    });
                                }

                                // Try to retrieve metadata (bultos) from tandaInfo
                                // We do this inside reduce, but efficient taking latest (it's per brand anyway)
                                if (!acc[key].bultos_personalizados && tandaInfo.parametros?.marcasMetadata) {
                                    const metaById = prod.marca_id ? tandaInfo.parametros.marcasMetadata[prod.marca_id] : null;
                                    const metaByName = tandaInfo.parametros.marcasMetadata[prod.marca];
                                    const meta = metaById || metaByName;
                                    if (meta && meta.bultos_personalizados !== undefined) {
                                        acc[key].bultos_personalizados = meta.bultos_personalizados;
                                    }
                                }

                                return acc;
                            }, {})
                        ).map((brandGroup, idx) => {
                            // Compute per-product owners for this brand group
                            const ownerTotals = {};
                            let hasExplicitOwner = false;
                            brandGroup.items.forEach(prod => {
                                const ownerName = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                const amount = (prod.cantidad_docenas || 0) * (Number(prod.precio_docena) || 0);
                                const bucket = ownerName || '—';
                                if (ownerName) hasExplicitOwner = true;
                                if (!ownerTotals[bucket]) ownerTotals[bucket] = 0;
                                ownerTotals[bucket] += amount;
                            });
                            // If no product has an explicit owner, clear totals (no color shown)
                            if (!hasExplicitOwner) Object.keys(ownerTotals).forEach(k => delete ownerTotals[k]);
                            const isMultiOwner = Object.keys(ownerTotals).length > 1;

                            // Single owner (global propietario OR single person in ownerTotals)
                            const owner = users.find(u => u.username === brandGroup.propietario);
                            const singleOwnerKey = !isMultiOwner && Object.keys(ownerTotals).length === 1 && Object.keys(ownerTotals)[0] !== '—' ? Object.keys(ownerTotals)[0] : null;
                            const ownerColor = owner?.color || (singleOwnerKey ? users.find(u => u.username === singleOwnerKey)?.color : null);

                            return (
                                <BrandSection
                                    key={idx}
                                    brandGroup={brandGroup}
                                    onPhotoClick={openBrandPhoto}
                                    ownerColor={ownerColor}
                                    ownerTotals={ownerTotals}
                                    isMultiOwner={isMultiOwner}
                                    users={users}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─────────────────── Mobile Brand Section Component ─────────────────── */
function BrandSectionMobile({ brandGroup, ownerColor, ownerTotals = {}, isMultiOwner = false, users = [], onPhotoClick }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getColor = (name) => users.find(u => u.username === name)?.color || '#9ca3af';

    // Build left border style (same logic as desktop)
    const borderStyle = (() => {
        if (!isMultiOwner) {
            return ownerColor ? { borderLeft: `4px solid ${ownerColor}` } : {};
        }
        const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
        let pct = 0;
        const stops = Object.entries(ownerTotals).flatMap(([name, amt]) => {
            const color = getColor(name);
            const start = pct;
            pct += (amt / total) * 100;
            return [`${color} ${start.toFixed(1)}%`, `${color} ${pct.toFixed(1)}%`];
        });
        return { borderLeft: '4px solid transparent', borderImage: `linear-gradient(to bottom, ${stops.join(', ')}) 1` };
    })();

    const totalMoney = brandGroup.items.reduce((sum, p) => {
        return sum + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0));
    }, 0);

    return (
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden"
             style={borderStyle}>
            {/* Brand Header */}
            <button
                className="w-full px-5 py-4 flex items-center justify-between text-left active:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-[#1A1A1A] text-[15px] uppercase truncate tracking-tight">
                            {brandGroup.name}
                        </span>
                        {isMultiOwner ? (
                            // Multi-owner chips
                            <div className="flex flex-wrap gap-1 mt-0.5">
                                {Object.entries(ownerTotals).map(([name, amt]) => {
                                    const color = getColor(name);
                                    const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                                    const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                                    return (
                                        <span key={name} className="text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest" style={{ backgroundColor: color }}>
                                            {name} {pct}%
                                        </span>
                                    );
                                })}
                            </div>
                        ) : brandGroup.propietario ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white uppercase tracking-widest shadow-sm shadow-orange-100" style={{ backgroundColor: ownerColor || '#FF5C39' }}>
                                {brandGroup.propietario}
                            </span>
                        ) : null}
                    </div>
                    <div className="text-[13px] text-[#8E8E93] font-bold flex items-center flex-wrap gap-x-1.5 gap-y-1">
                        <span>{brandGroup.items.length} PROD.</span>
                        <span className="text-gray-300">•</span>
                        <span className="font-extrabold text-[#FF5C39]">${totalMoney.toLocaleString('es-AR')}</span>
                        {/* Bultos Mobile Display */}
                        {(() => {
                            const customBultos = brandGroup.bultos_personalizados && parseFloat(brandGroup.bultos_personalizados) > 0
                                ? parseFloat(brandGroup.bultos_personalizados)
                                : null;
                            const sumBultos = brandGroup.bultosSum || 0;

                            if (customBultos !== null) {
                                return (
                                    <span className="ml-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-black tracking-tight self-center">
                                        <Package className="w-3 h-3" />
                                        {customBultos} Bultos
                                    </span>
                                );
                            } else if (sumBultos > 0) {
                                return (
                                    <span className="ml-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black tracking-tight self-center">
                                        <Package className="w-3 h-3" />
                                        {sumBultos} Bultos
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
                <ChevronDown className={`w-6 h-6 text-[#8E8E93] flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200">
                    {/* Brand Photos Placeholder matching Stitch */}
                    <div className="mb-6 pt-2">
                        <p className="text-[11px] font-black text-[#8E8E93] uppercase mb-3 tracking-widest">Fotos de la marca</p>
                        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                            <div className="w-[85px] h-[85px] border-2 border-dashed border-[#C7C7CC] rounded-[18px] flex items-center justify-center bg-gray-50 flex-shrink-0 text-[#C7C7CC]">
                                <ImageIcon className="w-7 h-7" strokeWidth={1.5} />
                            </div>
                            {brandGroup.photos.length > 0 ? (
                                brandGroup.photos.map((url, i) => (
                                    <div key={i} className="w-[85px] h-[85px] flex-shrink-0 rounded-[18px] overflow-hidden border border-gray-100 shadow-sm" onClick={() => onPhotoClick(url)}>
                                        <img src={url} alt="Brand" className="w-full h-full object-cover" />
                                    </div>
                                ))
                            ) : (
                                <div className="w-[85px] h-[85px] bg-[#F9F9F9] rounded-[18px] flex-shrink-0 flex items-center justify-center text-[#C7C7CC] border border-gray-100">
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Sin subir</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Products List (Table format) */}
                    <div className="space-y-4 pt-4 border-t border-gray-50">
                        <div className="flex text-[10px] font-black text-[#C7C7CC] uppercase tracking-widest border-b border-gray-50 pb-2 mb-1">
                            <div className="flex-[2.5]">Producto</div>
                            <div className="flex-1 text-center">Doc.</div>
                            <div className="flex-1 text-right">Precio</div>
                            <div className="flex-1 text-right">Total</div>
                        </div>
                        
                        {brandGroup.items.map((prod) => {
                            const precio = Number(prod.precio_docena) || 0;
                            const docs = prod.cantidad_docenas || 0;
                            const total = docs * precio;
                            
                            return (
                                <div key={prod.id} className="flex items-start text-[13px] group">
                                    <div className="flex-[2.5] pr-2">
                                        <p className="font-black text-[#1A1A1A] leading-tight mb-0.5 tracking-tight">
                                            {prod.producto_titulo || 'Sin nombre'}
                                        </p>
                                        <p className="text-[11px] text-[#8E8E93] font-bold">Ref: {prod.codigo || '—'}</p>
                                    </div>
                                    <div className="flex-1 text-center text-[#1A1A1A] font-black pt-0.5">
                                        {docs}
                                    </div>
                                    <div className="flex-1 text-right text-[#1A1A1A] font-medium pt-0.5">
                                        ${precio.toLocaleString('es-AR')}
                                    </div>
                                    <div className="flex-1 text-right font-black text-[#1A1A1A] pt-0.5">
                                        ${total.toLocaleString('es-AR')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Collapsible Subcomponent for Brand Section (Desktop)
function BrandSection({ brandGroup, onPhotoClick, ownerColor, ownerTotals = {}, isMultiOwner = false, users = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getColor = (name) => users.find(u => u.username === name)?.color || '#9ca3af';

    // Build left border style
    const borderStyle = (() => {
        if (!isMultiOwner) {
            return ownerColor ? { borderLeft: `4px solid ${ownerColor}` } : {};
        }
        // Multi-owner: gradient based on amounts
        const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
        let pct = 0;
        const stops = Object.entries(ownerTotals).flatMap(([name, amt]) => {
            const color = getColor(name);
            const start = pct;
            pct += (amt / total) * 100;
            return [`${color} ${start.toFixed(1)}%`, `${color} ${pct.toFixed(1)}%`];
        });
        return { borderLeft: '4px solid transparent', borderImage: `linear-gradient(to bottom, ${stops.join(', ')}) 1` };
    })();

    // Calculate total money for this brand group
    const brandTotal = brandGroup.items.reduce((sum, p) => {
        return sum + ((p.cantidad_docenas || 0) * (Number(p.precio_docena) || 0));
    }, 0);

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
            style={borderStyle}>
            {/* Brand Header */}
            <div
                className="bg-muted/30 px-6 py-4 border-b border-border flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-wide flex items-center gap-3">
                        {brandGroup.name}
                        {!isExpanded && (
                            <span className="text-xs font-normal text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full">
                                {brandGroup.items.length} productos
                            </span>
                        )}
                    </h3>

                    {/* Propietario Badge(s) */}
                    {isMultiOwner ? (
                        // Multi-owner: show chips for each owner
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(ownerTotals).map(([name, amt]) => {
                                const color = getColor(name);
                                const total = Object.values(ownerTotals).reduce((s, v) => s + v, 0);
                                const pct = total > 0 ? ((amt / total) * 100).toFixed(0) : 0;
                                return (
                                    <div key={name} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border text-xs font-bold" style={{ borderColor: color }}>
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                        <span className="text-foreground">{name}</span>
                                        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : brandGroup.propietario ? (
                        // Single owner
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border shadow-sm">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: ownerColor || '#9ca3af' }}
                            />
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                                {brandGroup.propietario}
                            </span>
                        </div>
                    ) : null}

                    {/* Bultos Display */}
                    {(() => {
                        const customBultos = brandGroup.bultos_personalizados && parseFloat(brandGroup.bultos_personalizados) > 0
                            ? parseFloat(brandGroup.bultos_personalizados)
                            : null;
                        const sumBultos = brandGroup.bultosSum || 0;

                        if (customBultos !== null) {
                            return (
                                <div className="text-sm font-medium px-3 py-1 rounded-md border bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800">
                                    <span className="flex items-center gap-1.5">
                                        <Package className="w-4 h-4" />
                                        {customBultos} Bultos
                                    </span>
                                </div>
                            );
                        } else if (sumBultos > 0) {
                            return (
                                <div className="text-sm font-medium px-3 py-1 rounded-md border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                    <span className="flex items-center gap-1.5">
                                        <Package className="w-4 h-4" />
                                        {sumBultos} Bultos
                                    </span>
                                </div>
                            );
                        } else {
                            return (
                                <div className="text-sm font-medium px-3 py-1 rounded-md border bg-muted/50 text-muted-foreground border-transparent italic">
                                    <span>Sin bultos agregados</span>
                                </div>
                            );
                        }
                    })()}

                    {/* Brand Total Amount */}
                    <div className="text-sm font-bold px-3 py-1 rounded-md border bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                        ${brandTotal.toLocaleString('es-AR')}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Boleta:</span>
                        <span className={`font-mono text-sm font-medium ${brandGroup.boleta ? 'text-foreground' : 'text-destructive italic'}`}>
                            {brandGroup.boleta || 'NO INGRESADA'}
                        </span>
                    </div>
                    <div className="text-muted-foreground">
                        {isExpanded ? (
                            <ChevronLeft className="w-5 h-5 -rotate-90 transition-transform" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 rotate-90 transition-transform" />
                        )}
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div>
                    {/* Brand Photos Gallery */}
                    {brandGroup.photos && brandGroup.photos.length > 0 && (
                        <div className="px-6 py-4 bg-muted/10 border-b border-border">
                            <div className="flex items-center gap-2 mb-3">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-semibold text-foreground">
                                    Fotos de la marca ({brandGroup.photos.length})
                                </span>
                            </div>
                            <div className="flex gap-3 flex-wrap">
                                {brandGroup.photos.map((photoUrl, index) => (
                                    <div
                                        key={index}
                                        onClick={() => onPhotoClick(photoUrl)}
                                        className="cursor-pointer group relative"
                                    >
                                        <img
                                            src={photoUrl}
                                            alt={`${brandGroup.name} - Foto ${index + 1}`}
                                            className="h-24 w-24 object-cover rounded-lg border-2 border-border group-hover:border-primary transition-all shadow-sm group-hover:shadow-md"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 border-b border-border text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-3">Producto</th>
                                    <th className="px-6 py-3">Código</th>
                                    <th className="px-6 py-3 text-center">Docenas</th>
                                    <th className="px-6 py-3 text-right">Precio Doc.</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3">Observaciones</th>
                                    {isMultiOwner && <th className="px-6 py-3">Propietario</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {brandGroup.items.map((prod) => {
                                        const prodOwner = prod.propietario_producto?.trim() || prod.propietario?.trim() || '';
                                        const prodOwnerColor = prodOwner ? getColor(prodOwner) : null;
                                        return (
                                        <tr key={prod.id}
                                            className="hover:bg-muted/10 transition-colors"
                                            style={isMultiOwner && prodOwnerColor ? { borderLeft: `3px solid ${prodOwnerColor}` } : {}}
                                        >
                                            <td className="px-6 py-4 font-medium text-foreground">{prod.producto_titulo}</td>
                                            <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{prod.codigo}</td>
                                            <td className="px-6 py-4 text-center font-bold text-foreground">{prod.cantidad_docenas}</td>
                                            <td className="px-6 py-4 text-right text-muted-foreground">
                                                ${Number(prod.precio_docena || 0).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                                ${(prod.cantidad_docenas * (Number(prod.precio_docena) || 0)).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground italic">
                                                {prod.observaciones || '-'}
                                            </td>
                                            {isMultiOwner && (
                                                <td className="px-6 py-4">
                                                    {prodOwner ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-semibold">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: prodOwnerColor || '#9ca3af' }} />
                                                            {prodOwner}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">—</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
