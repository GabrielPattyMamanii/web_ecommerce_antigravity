
import React from 'react';

const Pagination = ({ paginaActual, totalPaginas, onChange }) => {
    if (totalPaginas <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];

        // Always show first page
        pages.push(
            <button
                key={1}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${paginaActual === 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted border border-border'
                    }`}
                onClick={() => onChange(1)}
            >
                1
            </button>
        );

        // Ellipsis start
        if (paginaActual > 3) {
            pages.push(<span key="dots-1" className="px-2 text-muted-foreground">...</span>);
        }

        // Pages around current
        for (let i = Math.max(2, paginaActual - 1); i <= Math.min(totalPaginas - 1, paginaActual + 1); i++) {
            pages.push(
                <button
                    key={i}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${paginaActual === i
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card text-foreground hover:bg-muted border border-border'
                        }`}
                    onClick={() => onChange(i)}
                >
                    {i}
                </button>
            );
        }

        // Ellipsis end
        if (paginaActual < totalPaginas - 2) {
            pages.push(<span key="dots-2" className="px-2 text-muted-foreground">...</span>);
        }

        // Always show last page
        pages.push(
            <button
                key={totalPaginas}
                className={`px-3 py-2 rounded-lg font-medium transition-colors ${paginaActual === totalPaginas
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted border border-border'
                    }`}
                onClick={() => onChange(totalPaginas)}
            >
                {totalPaginas}
            </button>
        );

        return pages;
    };

    return (
        <div className="flex items-center justify-center gap-2 mt-6">
            {/* Previous Button */}
            <button
                className="px-3 py-2 rounded-lg font-medium transition-colors bg-card text-foreground hover:bg-muted border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={paginaActual === 1}
                onClick={() => onChange(paginaActual - 1)}
            >
                ←
            </button>

            {/* Page Numbers */}
            {totalPaginas <= 7 ? (
                Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${paginaActual === num
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-foreground hover:bg-muted border border-border'
                            }`}
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
                className="px-3 py-2 rounded-lg font-medium transition-colors bg-card text-foreground hover:bg-muted border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={paginaActual === totalPaginas}
                onClick={() => onChange(paginaActual + 1)}
            >
                →
            </button>
        </div>
    );
};

export default Pagination;
