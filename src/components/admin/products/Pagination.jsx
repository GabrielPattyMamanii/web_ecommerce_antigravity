
import React from 'react';

const Pagination = ({ paginaActual, totalPaginas, onChange }) => {
    if (totalPaginas <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];

        // Always show first page
        pages.push(
            <button
                key={1}
                className={`pagination-btn ${paginaActual === 1 ? 'active' : ''}`}
                onClick={() => onChange(1)}
            >
                1
            </button>
        );

        // Ellipsis start
        if (paginaActual > 3) {
            pages.push(<span key="dots-1" className="pagination-ellipsis">...</span>);
        }

        // Pages around current
        for (let i = Math.max(2, paginaActual - 1); i <= Math.min(totalPaginas - 1, paginaActual + 1); i++) {
            pages.push(
                <button
                    key={i}
                    className={`pagination-btn ${paginaActual === i ? 'active' : ''}`}
                    onClick={() => onChange(i)}
                >
                    {i}
                </button>
            );
        }

        // Ellipsis end
        if (paginaActual < totalPaginas - 2) {
            pages.push(<span key="dots-2" className="pagination-ellipsis">...</span>);
        }

        // Always show last page
        pages.push(
            <button
                key={totalPaginas}
                className={`pagination-btn ${paginaActual === totalPaginas ? 'active' : ''}`}
                onClick={() => onChange(totalPaginas)}
            >
                {totalPaginas}
            </button>
        );

        return pages;
    };

    return (
        <div className="pagination">
            {/* Previous Button */}
            <button
                className="pagination-btn"
                disabled={paginaActual === 1}
                onClick={() => onChange(paginaActual - 1)}
            >
                ←
            </button>

            {/* Page Numbers for small counts, logic matches the one inside renderPageNumbers somewhat but simpler to just use the function */}
            {totalPaginas <= 7 ? (
                Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        className={`pagination-btn ${paginaActual === num ? 'active' : ''}`}
                        onClick={() => onChange(num)}
                    >
                        {num}
                    </button>
                ))
            ) : (
                renderPageNumbers()
            )}

            {/* Next Button */}
            <button
                className="pagination-btn"
                disabled={paginaActual === totalPaginas}
                onClick={() => onChange(paginaActual + 1)}
            >
                →
            </button>
        </div>
    );
};

export default Pagination;
