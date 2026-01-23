
import React, { useState, useEffect, useRef } from 'react';

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
        <div className="category-select" ref={wrapperRef}>
            <div
                className={`category-select-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedCategory ? selectedCategory.label : 'Todas las Categorías'}</span>
                <span>▼</span>
            </div>

            {isOpen && (
                <div className="category-options">
                    {categorias.map((cat) => (
                        <div
                            key={cat.value}
                            className={`category-option ${value === cat.value ? 'selected' : ''}`}
                            onClick={() => handleSelect(cat.value)}
                        >
                            <span className="category-option-name">{cat.label}</span>
                            {cat.count !== undefined && (
                                <span className="category-option-count">{cat.count}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategorySelect;
