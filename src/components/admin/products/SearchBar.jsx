import React from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ value, onChange }) => {
    return (
        <div className="relative w-full max-w-2xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
                type="text"
                className="w-full pl-12 pr-12 py-3 bg-muted/50 border-2 border-input rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Buscar productos por nombre o código..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => onChange('')}
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
