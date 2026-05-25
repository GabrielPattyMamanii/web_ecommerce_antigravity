import React from 'react';
import { Check } from 'lucide-react';

export function ColorPicker({ colors, selectedColor, onColorChange, label = "Seleccionar Colores" }) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-600">{label}</h3>
            <div className="flex gap-3">
                {colors.map((color) => (
                    <button
                        key={color.value}
                        onClick={() => onColorChange(color.value)}
                        className="relative w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                        style={{
                            backgroundColor: color.hex,
                            borderColor: selectedColor === color.value ? '#000' : 'transparent'
                        }}
                        title={color.name}
                    >
                        {selectedColor === color.value && (
                            <Check className="w-5 h-5 text-white absolute inset-0 m-auto" strokeWidth={3} />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
