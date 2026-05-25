import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CouponBanner } from './CouponBanner';
import { WhatsAppButton } from './WhatsAppButton';

export function MainLayout() {
    return (
        <div className="public-layout flex min-h-screen flex-col">
            <div className="sticky top-0 z-[100]">
                <Navbar />
                <CouponBanner />
            </div>
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <WhatsAppButton />
        </div>
    );
}
