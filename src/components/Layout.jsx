import React, { useState } from 'react';
import { Search, ShoppingCart, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#242424] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#242424]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold tracking-tighter">
                MINIMAL<span className="text-blue-600">.</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link to="/" className="text-sm font-medium hover:text-blue-600 transition-colors">Home</Link>
              <Link to="/shop" className="text-sm font-medium hover:text-blue-600 transition-colors">Shop</Link>
              <Link to="/about" className="text-sm font-medium hover:text-blue-600 transition-colors">About</Link>
              <Link to="/contact" className="text-sm font-medium hover:text-blue-600 transition-colors">Contact</Link>
            </nav>

            {/* Icons */}
            <div className="hidden md:flex items-center space-x-6">
              <button className="hover:text-blue-600 transition-colors">
                <Search className="h-5 w-5" />
              </button>
              <button className="relative hover:text-blue-600 transition-colors">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  2
                </span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white focus:outline-none"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#242424] border-b border-gray-100 dark:border-gray-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-800">Home</Link>
              <Link to="/shop" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-800">Shop</Link>
              <Link to="/about" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-800">About</Link>
              <Link to="/contact" className="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-50 dark:hover:bg-gray-800">Contact</Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Minimal Footer */}
      <footer className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">About</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                We curate the finest minimalist essentials for your everyday life. Quality over quantity.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link to="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-sm">FAQ</Link></li>
                <li><Link to="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-sm">Shipping</Link></li>
                <li><Link to="#" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 text-sm">Returns</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wider uppercase mb-4">Newsletter</h3>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 min-w-0 px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-l-md focus:ring-blue-500 focus:border-blue-500 dark:bg-[#242424]"
                />
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-8 text-center">
            <p className="text-xs text-gray-400">&copy; 2026 Minimal Store. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
