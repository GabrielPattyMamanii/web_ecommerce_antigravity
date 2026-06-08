import { useEffect, useRef } from 'react';

export function useGlobalScanner(onCode) {
    const onCodeRef = useRef(onCode);
    useEffect(() => { onCodeRef.current = onCode; });

    useEffect(() => {
        const scanBuffer = { current: '' };
        const lastKeyTime = { current: 0 };

        const onKeyDown = (e) => {
            const active = document.activeElement;
            const isUserInput =
                active &&
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) &&
                !active.dataset.scanner;

            const now = Date.now();
            const timeSinceLastKey = now - lastKeyTime.current;

            if (e.key === 'Enter') {
                const raw = scanBuffer.current.trim();
                scanBuffer.current = '';

                if (raw.length >= 2) {
                    e.preventDefault();
                    let code = raw;
                    let codigoFallback = null;
                    if (raw.startsWith('http')) {
                        try {
                            const url = new URL(raw);
                            const segments = url.pathname.split('/').filter(Boolean);
                            code = segments[segments.length - 1] || raw;
                            codigoFallback = url.searchParams.get('c') || null;
                        } catch {
                            const normalized = raw.replace(/'/g, '-');
                            const uuidMatch = normalized.match(
                                /-scan-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
                            );
                            const codeMatch = normalized.match(/_c.(.+)$/);
                            if (uuidMatch) code = uuidMatch[1];
                            if (codeMatch) codigoFallback = codeMatch[1];
                        }
                    }
                    onCodeRef.current(code, codigoFallback);
                }
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (isUserInput) {
                    const isScanContinuation = scanBuffer.current.length > 0 && timeSinceLastKey < 80;
                    if (isScanContinuation) {
                        e.preventDefault();
                    } else if (timeSinceLastKey > 800) {
                        scanBuffer.current = '';
                    }
                } else {
                    e.preventDefault();
                }

                if (now - lastKeyTime.current > 800) {
                    scanBuffer.current = '';
                }
                scanBuffer.current += e.key;
                lastKeyTime.current = now;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);
}
