
import React from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ value, onChange }) => {
    return (
        <div className="search-container">
            <Search className="search-icon" />
            <input
                type="text"
                className="search-input"
                placeholder="Buscar productos por nombre o código..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button
                    className="search-clear"
                    onClick={() => onChange('')}
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
