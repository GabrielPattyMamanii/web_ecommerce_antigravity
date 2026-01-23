
import React, { useEffect } from 'react';

const Toast = ({ mensaje, tipo, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (tipo) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    };

    return (
        <div className={`toast ${tipo}`}>
            <span className="toast-icon">{getIcon()}</span>
            <span className="toast-message">{mensaje}</span>
        </div>
    );
};

export default Toast;
