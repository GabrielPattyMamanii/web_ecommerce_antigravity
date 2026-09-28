import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const EXIT_DURATION = 300;

export function Drawer({
    isOpen,
    onClose,
    title,
    headerContent,
    icon,
    widthClassName = 'max-w-md',
    children,
    footer,
    closeOnOverlayClick = true,
    ariaLabel,
}) {
    const [mounted, setMounted] = useState(isOpen);
    const [entered, setEntered] = useState(false);
    const exitTimeoutRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current);
                exitTimeoutRef.current = null;
            }
            setMounted(true);
            const raf = requestAnimationFrame(() => setEntered(true));
            return () => cancelAnimationFrame(raf);
        }

        setEntered(false);
        exitTimeoutRef.current = setTimeout(() => {
            setMounted(false);
        }, EXIT_DURATION);
        return () => {
            if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!mounted) return undefined;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return undefined;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mounted, onClose]);

    if (!mounted) return null;

    const enterClass = entered ? 'drawer-enter' : '';

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={ariaLabel}>
            <div
                className={`absolute inset-0 drawer-overlay ${enterClass}`}
                onClick={closeOnOverlayClick ? onClose : undefined}
            />

            <div className={`relative w-full ${widthClassName} drawer-panel ${enterClass}`}>
                {headerContent ?? (
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            {icon}
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>

                {footer && (
                    <div className="border-t border-gray-100 bg-white flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
