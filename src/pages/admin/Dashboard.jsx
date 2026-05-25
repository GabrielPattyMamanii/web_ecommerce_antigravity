import React from 'react';
import { AdminPanelBackground } from '../../components/AdminPanelBackground';

export function Dashboard() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
            <AdminPanelBackground className="rounded-3xl w-full h-[calc(100vh-100px)]" />
        </div>
    );
}
