import React from 'react';
import { X, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from './Button';

export function FilterDrawer({
    isOpen,
    onClose,
    categories,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    selectedColors,
    handleColorToggle,
    selectedSizes,
    handleSizeToggle,
    availableColors,
    availableSizes,
    applyFilters,
    expandedSections,
    toggleSection
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-[320px] h-full bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5" />
                        Filtros
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Categories */}
                    <div>
                        <button
                            onClick={() => toggleSection('categories')}
                            className="flex items-center justify-between w-full mb-3"
                        >
                            <h4 className="font-semibold text-sm">Categorías</h4>
                            {expandedSections.categories ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {expandedSections.categories && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => setSelectedCategory('All')}
                                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === 'All' ? 'bg-black text-white' : 'hover:bg-gray-100'
                                        }`}
                                >
                                    Todos
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.name ? 'bg-black text-white' : 'hover:bg-gray-100'
                                            }`}
                                    >
                                        {cat.name}
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-100" />

                    {/* Price Range */}
                    <div>
                        <button
                            onClick={() => toggleSection('price')}
                            className="flex items-center justify-between w-full mb-3"
                        >
                            <h4 className="font-semibold text-sm">Precio</h4>
                            {expandedSections.price ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {expandedSections.price && (
                            <div className="space-y-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    value={priceRange[1]}
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full accent-black h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium px-3 py-1 bg-gray-100 rounded-full">${priceRange[0]}</span>
                                    <span className="font-medium px-3 py-1 bg-gray-100 rounded-full">${priceRange[1]}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-100" />

                    {/* Colors */}
                    <div>
                        <button
                            onClick={() => toggleSection('colors')}
                            className="flex items-center justify-between w-full mb-3"
                        >
                            <h4 className="font-semibold text-sm">Colores</h4>
                            {expandedSections.colors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {expandedSections.colors && (
                            <div className="grid grid-cols-5 gap-3">
                                {availableColors.map((color) => (
                                    <button
                                        key={color.value}
                                        onClick={() => handleColorToggle(color.value)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColors.includes(color.value) ? 'border-black scale-110' : 'border-gray-200'
                                            }`}
                                        style={{ backgroundColor: color.hex }}
                                        title={color.name}
                                    >
                                        {selectedColors.includes(color.value) && (
                                            <svg className="w-5 h-5 text-white mx-auto drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-100" />

                    {/* Sizes */}
                    <div>
                        <button
                            onClick={() => toggleSection('size')}
                            className="flex items-center justify-between w-full mb-3"
                        >
                            <h4 className="font-semibold text-sm">Tallas</h4>
                            {expandedSections.size ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        {expandedSections.size && (
                            <div className="grid grid-cols-3 gap-2">
                                {availableSizes.map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => handleSizeToggle(size)}
                                        className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${selectedSizes.includes(size)
                                            ? 'bg-black text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <Button
                        className="w-full h-12 text-base"
                        onClick={() => {
                            applyFilters();
                            onClose();
                        }}
                    >
                        Aplicar Filtros
                    </Button>
                </div>
            </div>
        </div>
    );
}
