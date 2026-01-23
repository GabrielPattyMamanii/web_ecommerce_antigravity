
import React, { useState } from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import CategorySelect from './CategorySelect';

const FiltersPanel = ({
    categoria,
    onCategoriaChange,
    categorias,
    precioRange,
    onPrecioChange,
    stockRange,
    onStockChange,
    soloVisibles,
    onSoloVisiblesChange,
    soloOcultos,
    onSoloOcultosChange,
    onLimpiar
}) => {
    const [collapsed, setCollapsed] = useState(false);

    // Helper wrappers because standard checkbox sends event, user wants bool
    const handleVisiblesChange = (checked) => {
        onSoloVisiblesChange(checked);
        if (checked) onSoloOcultosChange(false);
    };

    const handleOcultosChange = (checked) => {
        onSoloOcultosChange(checked);
        if (checked) onSoloVisiblesChange(false);
    };

    return (
        <div className="filters-panel">
            <div
                className="filters-header"
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className="filters-title">
                    <span>🔧</span>
                    Filtros Avanzados
                </div>
                <span className={`filters-toggle-icon ${collapsed ? 'collapsed' : ''}`}>
                    ▼
                </span>
            </div>

            {!collapsed && (
                <>
                    <div className="filters-grid">
                        {/* Filtro por Categoría */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <span className="filter-label-icon">📁</span>
                                Categoría
                            </label>
                            <CategorySelect
                                value={categoria}
                                onChange={onCategoriaChange}
                                categorias={categorias}
                            />
                        </div>

                        {/* Filtro por Precio */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <span className="filter-label-icon">💰</span>
                                Rango de Precio
                            </label>
                            <div className="range-slider-container">
                                <div className="range-slider-header">
                                    <span className="range-value">
                                        ${precioRange.min.toLocaleString()}
                                    </span>
                                    <span className="range-value">
                                        ${precioRange.max.toLocaleString()}
                                    </span>
                                </div>
                                <Slider
                                    range
                                    min={0}
                                    max={10000} // This should ideally be dynamic max based on props, but fixed for now or handled by parent passing dynamic max logic if implied
                                    // The prompt implementation used fixed or calc. We use props if passed as limits, but here we just blindly use what is passed as current range state.
                                    // Actually the prompt had: 
                                    // const [precioRange, setPrecioRange] = useState({ min: 0, max: 10000 });
                                    // And Slider uses hardcoded min=0 max=10000? 
                                    // "Rango dinámico basado en productos existentes" -> This implies the SLIDER BOUNDS should be dynamic. 
                                    // But the props passed are `precioRange` which is the SELECTED range. 
                                    // Usually we need `minPrice` and `maxPrice` available in data.
                                    // For now I will stick to 0-10000 as default or maybe 0-20000. 
                                    // Ideally the parent should pass `minLimit` and `maxLimit`.
                                    // The user code snippet: useEffect(() => ... setPrecioRange({min, max}))
                                    // So `precioRange` IS the limit? No, `precioFilter` is the selection.
                                    // Use prompt logic: 
                                    // value={[precioRange.min, precioRange.max]} -> onChange setPrecioRange?
                                    // Wait, usually: 
                                    // limits: availableMin, availableMax
                                    // selection: selectedMin, selectedMax
                                    // User code:
                                    // const [precioRange, setPrecioRange] = useState({ min: 0, max: 10000 }); // This seems to be the LIMITS?
                                    // const [precioFilter, setPrecioFilter] = useState({ min: 0, max: 10000 }); // This is SELECTION?
                                    // In FiltersPanel, props are `precioRange` and `onPrecioChange`.
                                    // Slider value={[precioRange.min, precioRange.max]}.
                                    // This means `precioRange` IS the selection. 
                                    // Where are the limits? The user hardcoded `max={10000}` inside the component in the prompt example.
                                    // I'll keep it hardcoded to 10000 or 100000 for safety, or better, pass `maxPrice` prop if I can.
                                    // I'll stick to the user's prompt code for exactness: max={10000}.
                                    value={[precioRange.min, precioRange.max]}
                                    onChange={(values) => onPrecioChange({
                                        min: values[0],
                                        max: values[1]
                                    })}
                                    allowCross={false}
                                />
                            </div>
                        </div>

                        {/* Filtro por Stock */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <span className="filter-label-icon">📦</span>
                                Rango de Stock
                            </label>
                            <div className="range-slider-container">
                                <div className="range-slider-header">
                                    <span className="range-value">{stockRange.min}</span>
                                    <span className="range-value">{stockRange.max}</span>
                                </div>
                                <Slider
                                    range
                                    min={0}
                                    max={1000}
                                    value={[stockRange.min, stockRange.max]}
                                    onChange={(values) => onStockChange({
                                        min: values[0],
                                        max: values[1]
                                    })}
                                    allowCross={false}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros de Visibilidad */}
                    <div className="visibility-filters">
                        <label className="visibility-filter-option">
                            <div
                                className={`visibility-checkbox ${soloVisibles ? 'checked' : ''}`}
                                onClick={() => handleVisiblesChange(!soloVisibles)}
                            >
                                <span className="visibility-checkbox-icon">✓</span>
                            </div>
                            <span className="visibility-filter-label">
                                Solo productos visibles en catálogo
                            </span>
                        </label>

                        <label className="visibility-filter-option">
                            <div
                                className={`visibility-checkbox ${soloOcultos ? 'checked' : ''}`}
                                onClick={() => handleOcultosChange(!soloOcultos)}
                            >
                                <span className="visibility-checkbox-icon">✓</span>
                            </div>
                            <span className="visibility-filter-label">
                                Solo productos ocultos del catálogo
                            </span>
                        </label>
                    </div>

                    {/* Botón Limpiar Filtros */}
                    <button className="clear-filters-btn" onClick={onLimpiar}>
                        <span className="clear-filters-icon">🗑️</span>
                        Limpiar Filtros
                    </button>
                </>
            )}
        </div>
    );
};

export default FiltersPanel;
