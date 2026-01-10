import React from 'react';
import { Outlet } from 'react-router-dom';
import { PromoBanner } from './PromoBanner';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function MainLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <PromoBanner />
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
