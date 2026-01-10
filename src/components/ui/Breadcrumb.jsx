import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Breadcrumb({ items }) {
    return (
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="w-4 h-4" />}
                    {item.href ? (
                        <Link to={item.href} className="hover:text-black transition-colors">
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-black font-medium">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
}
