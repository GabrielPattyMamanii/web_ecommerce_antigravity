import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Copy, Check, X, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function CouponBanner() {
    const location = useLocation();
    const [coupon, setCoupon] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [copied, setCopied] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const intervalRef = useRef(null);
    const refetchRef = useRef(null);

    // Resetear dismissed al cambiar de página
    useEffect(() => {
        setDismissed(false);
    }, [location.pathname]);

    const fetchCoupon = useCallback(async () => {
        const { data } = await supabase
            .from('coupons')
            .select('*')
            .eq('show_in_banner', true)
            .eq('status', 'publicado')
            .maybeSingle();

        if (!data) {
            setCoupon(null);
            return;
        }

        // Solo verificar vencimiento si el cupón tiene contador
        if (data.has_counter) {
            const endTime = data.counter_end_time ? new Date(data.counter_end_time) : null;
            if (!endTime || endTime <= new Date()) {
                // expired
                await supabase
                    .from('coupons')
                    .update({ status: 'borrador', show_in_banner: false })
                    .eq('id', data.id);
                setCoupon(null);
                return;
            }
            setSecondsLeft(Math.floor((endTime - new Date()) / 1000));
        } else {
            setSecondsLeft(0);
        }

        setCoupon(data);
        setDismissed(false);
    }, []);

    useEffect(() => {
        fetchCoupon();

        refetchRef.current = setInterval(fetchCoupon, 30000);
        return () => clearInterval(refetchRef.current);
    }, [fetchCoupon]);

    // Countdown tick
    useEffect(() => {
        if (!coupon) return;

        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    supabase
                        .from('coupons')
                        .update({ status: 'borrador', show_in_banner: false })
                        .eq('id', coupon.id)
                        .then(() => setCoupon(null));
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [coupon]);

    const handleCopy = async () => {
        if (!coupon) return;
        try {
            await navigator.clipboard.writeText(coupon.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    // Si no tiene contador, mostrar igual aunque secondsLeft sea 0
    if (!coupon || dismissed) return null;
    if (coupon.has_counter && secondsLeft <= 0) return null;

    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;

    return (
        <div className="w-full bg-[#ff9432] text-white relative overflow-hidden transition-all duration-500 ease-in-out font-nunito border-b border-public-primary/20">
            {/* Ambient animation background */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-50"></div>
            
            <div className="container mx-auto px-4 py-2 relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 max-w-[1440px] pr-8 md:pr-4">
                
                {/* Close Button - Absolute on mobile to save space, relative on desktop */}
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 md:relative md:top-auto md:right-auto md:translate-y-0 md:order-last hover:bg-white/10 p-1 md:p-1.5 rounded-full transition-colors active:scale-95"
                    aria-label="Cerrar banner"
                >
                    <X className="w-4 h-4 md:w-4 md:h-4 opacity-80" />
                </button>

                {/* Left Side: Message & Code */}
                <div className="flex items-center gap-2 justify-center w-full md:w-auto overflow-hidden flex-wrap md:flex-nowrap text-center md:text-left">
                    <Zap className="text-public-tertiary animate-bounce w-5 h-5 flex-shrink-0 hidden md:block" />

                    {/* Discount badge — always visible when discount_percentage exists */}
                    {coupon.discount_percentage > 0 && (
                        <span className="flex-shrink-0 bg-black/30 text-white text-[12px] md:text-[14px] font-black px-2.5 py-0.5 rounded-full border border-white/20 tracking-wide uppercase shadow-inner whitespace-nowrap">
                            -{coupon.discount_percentage}% OFF
                        </span>
                    )}

                    <div className="text-[13px] md:text-base font-bold tracking-tight inline-flex items-center justify-center gap-1.5 w-full md:w-auto">
                        <div className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                            {coupon.message ? (
                                <span className="opacity-90 leading-snug break-words" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(coupon.message) }} />
                            ) : (
                                <span className="opacity-90 leading-snug">Usa el código y ahorrá</span>
                            )}

                            <button
                                onClick={handleCopy}
                                className="inline-flex items-center gap-2 bg-white text-[#ff9432] hover:bg-gray-100 transition-colors px-3 py-1 rounded-md font-mono font-extrabold shadow-lg border border-white active:scale-95 flex-shrink-0"
                                title="Copiar código"
                            >
                                <span className="text-[14px] md:text-lg">{coupon.code}</span>
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Side: Countdown (solo si has_counter) */}
                <div className="flex items-center w-full md:w-auto justify-center">
                    {coupon.has_counter && (
                        <div className="flex items-center gap-1.5 md:gap-3 font-mono text-[16px] md:text-xl lg:text-2xl font-black tracking-widest bg-black/20 px-3 md:px-5 py-1.5 rounded-lg border border-white/10 shadow-inner">
                            
                            <div className="flex flex-col items-center">
                                <span className="text-center min-w-[1.8rem] md:min-w-[3rem]">{String(h).padStart(2, '0')}</span>
                                <span className="text-[8px] md:text-[11px] font-sans font-bold uppercase tracking-tighter opacity-70 leading-none mt-0.5">Hrs</span>
                            </div>
                            
                            <span className="opacity-60 animate-pulse pb-2 md:pb-3">:</span>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-center min-w-[1.8rem] md:min-w-[3rem]">{String(m).padStart(2, '0')}</span>
                                <span className="text-[8px] md:text-[11px] font-sans font-bold uppercase tracking-tighter opacity-70 leading-none mt-0.5">Min</span>
                            </div>
                            
                            <span className="opacity-60 animate-pulse pb-2 md:pb-3">:</span>
                            
                            <div className="flex flex-col items-center">
                                <span className="text-center min-w-[1.8rem] md:min-w-[3rem] text-public-tertiary">{String(s).padStart(2, '0')}</span>
                                <span className="text-[8px] md:text-[11px] font-sans font-bold uppercase tracking-tighter opacity-70 leading-none text-public-tertiary mt-0.5">Sec</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
