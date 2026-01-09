import React from 'react';

const Checkout = () => {
    return (
        <div className="bg-gray-50 dark:bg-[#1a1a1a] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">Checkout</h1>

                <div className="bg-white dark:bg-[#242424] shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">

                            {/* Contact Information */}
                            <div className="sm:col-span-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Contact Information</h2>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        autoComplete="email"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            {/* Shipping Address */}
                            <div className="sm:col-span-6 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Shipping Address</h2>
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    First name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="first-name"
                                        id="first-name"
                                        autoComplete="given-name"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-3">
                                <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Last name
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="last-name"
                                        id="last-name"
                                        autoComplete="family-name"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-6">
                                <label htmlFor="street-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Street address
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="street-address"
                                        id="street-address"
                                        autoComplete="street-address"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    City
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="city"
                                        id="city"
                                        autoComplete="address-level2"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    State / Province
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="region"
                                        id="region"
                                        autoComplete="address-level1"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="postal-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    ZIP / Postal code
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="postal-code"
                                        id="postal-code"
                                        autoComplete="postal-code"
                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-700 rounded-md dark:bg-[#1a1a1a] dark:text-white p-2 border"
                                    />
                                </div>
                            </div>

                            {/* Payment (Simplified) */}
                            <div className="sm:col-span-6 border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Payment</h2>
                                <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Payment integration would go here (Stripe, PayPal, etc.).</p>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div className="px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] text-right sm:px-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Place Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
