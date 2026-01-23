import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Home } from './pages/public/Home';
import { Catalog } from './pages/public/Catalog';
import { ProductDetail } from './pages/public/ProductDetail';
import { Cart } from './pages/public/Cart';
import { Contact } from './pages/public/Contact';
import { Login } from './pages/admin/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { ProductList } from './pages/admin/ProductList';
import { ProductForm } from './pages/admin/ProductForm';
import { CategoryList } from './pages/admin/CategoryList';
import { DebtList } from './pages/admin/DebtList';
import { DebtForm } from './pages/admin/DebtForm';
import { Settings } from './pages/admin/Settings';
import { ListaTandas } from './components/mercancia/ListaTandas';
import { AgregarTanda } from './components/mercancia/AgregarTanda';
import { DetalleTanda } from './components/mercancia/DetalleTanda';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { CostCalculation } from './pages/admin/CostCalculation';
import { PrecioVentaListado } from './pages/admin/PrecioVentaListado';
import { PrecioVentaDetalle } from './pages/admin/PrecioVentaDetalle';

function App() {
  const isConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuración Requerida</h1>
          <p className="text-gray-600 mb-6">
            No se han detectado las variables de entorno de Supabase.
          </p>
          <div className="text-left bg-gray-100 p-4 rounded-md text-sm font-mono mb-6 overflow-x-auto">
            <p className="mb-2 text-gray-500">// Crea un archivo .env en la raíz y agrega:</p>
            <p>VITE_SUPABASE_URL=tu_url</p>
            <p>VITE_SUPABASE_ANON_KEY=tu_key</p>
          </div>
          <p className="text-sm text-gray-500">
            Revisa el archivo README.md para más instrucciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        {/* Add other routes here later */}
        <Route path="catalog" element={<Catalog />} />
        <Route path="contact" element={<Contact />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/edit/:id" element={<ProductForm />} />
        <Route path="products/edit/:id" element={<ProductForm />} />
        <Route path="categories" element={<CategoryList />} />
        <Route path="debts" element={<DebtList />} />
        <Route path="debts/new" element={<DebtForm />} />
        <Route path="debts/edit/:id" element={<DebtForm />} />

        {/* Merchandise Routes */}
        <Route path="mercancia" element={<ListaTandas />} />
        <Route path="mercancia/new" element={<AgregarTanda />} /> {/* Handles /new and /nueva if updated */}
        <Route path="mercancia/nueva" element={<AgregarTanda />} />
        <Route path="mercancia/detalle/:tanda" element={<DetalleTanda />} />
        <Route path="mercancia/editar/:tandaNombre" element={<AgregarTanda />} />

        <Route path="precio-venta-sugerido" element={<PrecioVentaListado />} />
        <Route path="precio-venta-sugerido/:tandaNombre" element={<PrecioVentaDetalle />} />

        <Route path="calculo-costos" element={<CostCalculation />} />

        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
