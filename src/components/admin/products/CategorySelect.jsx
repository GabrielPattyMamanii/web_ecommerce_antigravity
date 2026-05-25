
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CategorySelect = ({ value, onChange, categorias }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const selectedCategory = categorias.find(c => c.value === value) || categorias[0];

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                className={`w-full px-4 py-2.5 bg-background border rounded-lg text-left flex items-center justify-between transition-all ${isOpen
                        ? 'border-primary ring-2 ring-ring'
                        : 'border-input hover:border-primary/50'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-foreground font-medium">
                    {selectedCategory ? selectedCategory.label : 'Todas las Categorías'}
                </span>
                <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {categorias.map((cat) => (
                        <div
                            key={cat.value}
                            className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between ${value === cat.value
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-foreground hover:bg-muted'
                                }`}
                            onClick={() => handleSelect(cat.value)}
                        >
                            <span className="font-medium">{cat.label}</span>
                            <div className="flex items-center gap-2">
                                {cat.count !== undefined && (
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                        {cat.count}
                                    </span>
                                )}
                                {value === cat.value && (
                                    <Check className="w-4 h-4 text-primary" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategorySelect;
