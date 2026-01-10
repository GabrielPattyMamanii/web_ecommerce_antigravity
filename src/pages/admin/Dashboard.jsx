import React from 'react';
import { Download, MoreHorizontal } from 'lucide-react';

export function Dashboard() {
    return (
        <div className="space-y-6">
            {/* Top Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Products Card - Purple */}
                <div className="bg-[#D05CE3] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-sm font-medium opacity-90 mb-1">Products</h3>
                        <p className="text-xs opacity-75 mb-4">Lorem ipsum dolor</p>
                        <p className="text-4xl font-bold">123</p>
                    </div>
                    {/* Decorative circle */}
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                </div>

                {/* Downloads Card - White */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Downloads</h3>
                    <p className="text-xs text-gray-400 mb-4">Lorem ipsum dolor</p>
                    <p className="text-4xl font-bold text-gray-900">1,234,567</p>
                </div>

                {/* Earnings Card - Pink */}
                <div className="bg-[#F45B69] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-sm font-medium opacity-90 mb-1">Earnings Balance</h3>
                        <p className="text-xs opacity-75 mb-4">Lorem ipsum dolor</p>
                        <p className="text-4xl font-bold">$2000</p>
                    </div>
                    {/* Decorative circle */}
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                </div>
            </div>

            {/* Middle Row - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">2019</h3>
                        <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal /></button>
                    </div>

                    {/* CSS Bar Chart Mockup */}
                    <div className="h-48 flex items-end justify-between gap-4 px-4">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((month, i) => {
                            const heights = ['40%', '25%', '35%', '60%', '50%', '30%', '55%'];
                            return (
                                <div key={month} className="flex flex-col items-center gap-2 w-full">
                                    <div
                                        className="w-full bg-[#5EEad4] rounded-t-sm hover:opacity-80 transition-opacity"
                                        style={{ height: heights[i] }}
                                    ></div>
                                    <span className="text-xs text-gray-400">{month}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48">
                        {/* CSS Donut Chart */}
                        <div
                            className="w-full h-full rounded-full"
                            style={{
                                background: 'conic-gradient(#F45B69 0% 75%, #5EEad4 75% 100%)',
                                mask: 'radial-gradient(transparent 60%, black 61%)',
                                WebkitMask: 'radial-gradient(transparent 60%, black 61%)'
                            }}
                        ></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold text-gray-900">75%</span>
                            <span className="text-xs text-gray-500">lorem ipsum</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row - Area Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">Current Status</h3>
                    <p className="text-sm text-gray-500 max-w-xs text-right">Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</p>
                </div>

                {/* CSS Area Chart Mockup (Simplified with SVG) */}
                <div className="h-48 w-full">
                    <svg viewBox="0 0 100 20" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Gradient definition */}
                        <defs>
                            <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Area Path */}
                        <path
                            d="M0,15 L10,10 L20,18 L30,5 L40,12 L50,2 L60,15 L70,5 L80,12 L90,8 L100,15 V20 H0 Z"
                            fill="url(#areaGradient)"
                        />
                        {/* Line Path */}
                        <path
                            d="M0,15 L10,10 L20,18 L30,5 L40,12 L50,2 L60,15 L70,5 L80,12 L90,8 L100,15"
                            fill="none"
                            stroke="#F45B69"
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {/* Points */}
                        {[
                            [0, 15], [10, 10], [20, 18], [30, 5], [40, 12], [50, 2],
                            [60, 15], [70, 5], [80, 12], [90, 8], [100, 15]
                        ].map(([x, y], i) => (
                            <circle key={i} cx={x} cy={y} r="0.8" fill="#F45B69" stroke="white" strokeWidth="0.2" />
                        ))}
                    </svg>
                </div>
            </div>
        </div>
    );
}
