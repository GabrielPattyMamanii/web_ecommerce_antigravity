import { useEffect, useState } from 'react';

/**
 * Hook for managing dark mode state
 * Persists preference to localStorage and applies 'dark' class to document element
 */
export function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage on initial load
        const saved = localStorage.getItem('theme');
        return saved === 'dark';
    });

    useEffect(() => {
        // Apply or remove dark class
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Save to localStorage
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleDarkMode = () => {
        setIsDark(prev => !prev);
    };

    return { isDark, toggleDarkMode };
}
