import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Home } from './pages/public/Home';
import { Catalog } from './pages/public/Catalog';
import { CatalogLimpio } from './pages/public/CatalogLimpio';
import { ProductDetail } from './pages/public/ProductDetail';
import { Cart } from './pages/public/Cart';
import { Contact } from './pages/public/Contact';
import { HowToBuy } from './pages/public/HowToBuy';
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
import { PriceCalculation } from './pages/admin/PriceCalculation';
import { PosiblesCompras } from './pages/admin/PosiblesCompras';
import { MiMercaderia } from './pages/admin/MiMercaderia';
import { MiMercaderiaLayout } from './components/mercancia/MiMercaderiaLayout';
import { MiMercaderiaProvider } from './context/MiMercaderiaContext';
import { UsuariosRegistrados } from './pages/admin/UsuariosRegistrados';
import { Boletas } from './pages/admin/mercancia/Boletas';
import { ResumenBoletas } from './pages/admin/mercancia/ResumenBoletas';
import { CalculoTransporte } from './pages/admin/mercancia/CalculoTransporte';
import { ParametrosCostos } from './pages/admin/mercancia/ParametrosCostos';
import { UserLayout } from './components/layout/UserLayout';
import { Usuarios } from './pages/admin/Usuarios';
import { UserDashboard } from './pages/user/UserDashboard';
import { CargaBoletas } from './pages/user/CargaBoletas';
import { ResumenBoletasUser } from './pages/user/ResumenBoletasUser';
import { CalculoTransporteUser } from './pages/user/CalculoTransporteUser';
import { UserTandaDetalle } from './pages/user/UserTandaDetalle';
import { ControlMercancia } from './pages/admin/ControlMercancia';
import { ControlMercanciaTanda } from './pages/admin/ControlMercanciaTanda';
import { ProductScan } from './pages/scan/ProductScan';
import Checkout from './pages/Checkout';
import { BoletasCargadas } from './pages/admin/BoletasCargadas';
import { BoletasTanda } from './pages/admin/BoletasTanda';
import { CatalogProductForm } from './pages/admin/CatalogProductForm';
import { CouponList } from './pages/admin/CouponList';
import { SenasList } from './pages/admin/SenasList';
import { Senas } from './pages/public/Senas';
import { VentasScanner } from './pages/admin/VentasScanner';
import { VentasHistorial } from './pages/admin/VentasHistorial';
import { CuentasBancarias } from './pages/admin/CuentasBancarias';
import { EntregaDinero } from './pages/admin/EntregaDinero';
import { EntregaDineroTanda } from './pages/admin/EntregaDineroTanda';
import { MercanciaPropietarios } from './pages/admin/MercanciaPropietarios';
import { MercanciaPropietariosTanda } from './pages/admin/MercanciaPropietariosTanda';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { Toaster } from 'react-hot-toast';

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
    <>
      <Toaster position="top-center" />
      <ScrollToTop />
      <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        {/* Add other routes here later */}
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog-limpio" element={<CatalogLimpio />} />
        <Route path="contact" element={<Contact />} />
        {/* ⚠️ TEMPORAL */}
        <Route path="how-to-buy" element={<HowToBuy />} />
        <Route path="catalog/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="senas" element={<Senas />} />
      </Route>


      {/* Public QR Scan Route (mobile) */}
      <Route path="/scan/:productId" element={<ProductScan />} />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<ProtectedRoute />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/edit/:id" element={<ProductForm />} />
        <Route path="products/edit/:id" element={<ProductForm />} />
        {/* Catalog from boletas */}
        <Route path="products/boletas" element={<BoletasCargadas />} />
        <Route path="products/boletas/:tanda" element={<BoletasTanda />} />
        <Route path="products/new/:entradaId" element={<CatalogProductForm />} />
        <Route path="categories" element={<CategoryList />} />
        <Route path="coupons" element={<CouponList />} />
        <Route path="senas" element={<SenasList />} />
        <Route path="debts" element={<DebtList />} />
        <Route path="debts/new" element={<DebtForm />} />
        <Route path="debts/edit/:id" element={<DebtForm />} />

        {/* Merchandise Routes */}
        <Route path="mercancia" element={<ListaTandas />} />
        <Route path="mercancia/new" element={<AgregarTanda />} /> {/* Handles /new and /nueva if updated */}
        <Route path="mercancia/nueva" element={<AgregarTanda />} />
        <Route path="mercancia/detalle/:tanda" element={<DetalleTanda />} />
        <Route path="mercancia/editar/:tandaNombre" element={<AgregarTanda />} />
        <Route path="mercancia/propietarios" element={<MercanciaPropietarios />} />
        <Route path="mercancia/propietarios/:tanda" element={<MercanciaPropietariosTanda />} />

        {/* Control de Mercancía Routes */}
        <Route path="control-mercancia" element={<ControlMercancia />} />
        <Route path="control-mercancia/:tanda" element={<ControlMercanciaTanda />} />

        <Route path="precio-venta-sugerido" element={<PrecioVentaListado />} />
        <Route path="precio-venta-sugerido/:tandaNombre" element={<PrecioVentaDetalle />} />

        <Route path="calculo-costos" element={<CostCalculation />} />

        <Route path="calculo-precios" element={<PriceCalculation />} />
        <Route path="posibles-compras" element={<PosiblesCompras />} />
        {/* Redirect old route to new one to prevent blank screen */}
        <Route path="mercaderia-guardada" element={<Navigate to="posibles-compras" replace />} />


        {/* User Management Route */}
        <Route path="usuarios-registrados" element={
          <MiMercaderiaProvider>
            <UsuariosRegistrados />
          </MiMercaderiaProvider>
        } />

        {/* Mi Mercaderia Section - Wrapped in Provider and Custom Layout */}
        {/* User Management Route - Replaces MiMercaderia */}
        <Route path="usuarios" element={
          <MiMercaderiaProvider>
            <Usuarios />
          </MiMercaderiaProvider>
        } />

        {/* Keep this just in case, or redirect */}
        <Route path="mi-mercaderia" element={<Navigate to="usuarios" replace />} />

        <Route path="settings" element={<Settings />} />

        {/* Ventas diarias */}
        <Route path="ventas" element={<VentasScanner />} />
        <Route path="ventas/historial" element={<VentasHistorial />} />
        <Route path="cuentas-bancarias" element={<CuentasBancarias />} />
        <Route path="entrega-dinero" element={<EntregaDinero />} />
        <Route path="entrega-dinero/:tanda" element={<EntregaDineroTanda />} />
      </Route>

      {/* User Dashboard Routes - For App Users (Light Auth) */}
      <Route path="/dashboard" element={
        <MiMercaderiaProvider>
          <UserLayout />
        </MiMercaderiaProvider>
      }>
        <Route index element={<UserDashboard />} />
        <Route path="carga-boletas" element={<CargaBoletas />} />
        <Route path="resumen" element={<ResumenBoletasUser />} />
        <Route path="calculo" element={<CalculoTransporteUser />} />
        <Route path="tanda/:tandaNombre" element={<UserTandaDetalle />} />
      </Route>
    </Routes>
    </>
  );
}

export default App;
