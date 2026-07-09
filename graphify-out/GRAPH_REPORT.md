# Graph Report - .  (2026-06-29)

## Corpus Check
- 439 files · ~380,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 645 nodes · 1386 edges · 45 communities (32 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]

## God Nodes (most connected - your core abstractions)
1. `supabase` - 66 edges
2. `useMercanciaUser()` - 23 edges
3. `Button` - 22 edges
4. `src/App.jsx` - 21 edges
5. `cn()` - 16 edges
6. `useMobile()` - 13 edges
7. `useCartStore` - 12 edges
8. `template.sh script` - 11 edges
9. `useCheckoutPro Hook` - 11 edges
10. `FeaturedProducts Component` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ProtectedRoute()` --implements--> `Supabase Authentication System`  [INFERRED]
  src/components/admin/ProtectedRoute.jsx → README.md
- `ProductsTable()` --shares_data_with--> `Supabase Client`  [INFERRED]
  src/components/admin/products/ProductsTable.jsx → README.md
- `Navbar()` --conceptually_related_to--> `WhatsApp Integration`  [INFERRED]
  src/components/layout/Navbar.jsx → README.md
- `Navbar()` --shares_data_with--> `Cart Store Context`  [EXTRACTED]
  src/components/layout/Navbar.jsx → README.md
- `Navbar()` --shares_data_with--> `Supabase Client`  [EXTRACTED]
  src/components/layout/Navbar.jsx → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Layout Composition Pattern** — src_components_layout_mainlayout_mainlayout, src_components_layout_navbar_navbar, src_components_layout_footer_footer, src_components_layout_adminlayout_adminlayout [INFERRED 0.85]
- **Admin Access Control Flow** — src_components_admin_protectedroute_protectedroute, src_hooks_useauth_useauth, src_lib_supabase_client, supabase_auth_system [INFERRED 0.85]
- **Product Display Architecture** — src_components_featuredproducts_featuredproducts, src_components_productcard_productcard, src_components_catalog_catalogproductcard3d_catalogproductcard3d [INFERRED 0.75]

## Communities (45 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (26): React Library, EvidenceUploader(), ProtectedRoute(), AdminLayout(), PATH_SECTION_MAP, AdminMobileMenu(), BuscadorProductos(), MercanciaLoginModal() (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (28): Performance Optimization with Debounce, Responsive Design System, BrandList(), ProductTable(), TandaHeader(), BuscadorMercancia(), DetalleTanda(), ListaTandas() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (23): CategorySelect(), FiltersPanel(), Pagination(), ProductsTable(), SearchBar(), BrandPhotoUploader(), FormularioMarca(), Toast() (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (28): App(), ScrollToTop(), MercadoPagoBrick(), SenaModal(), Breadcrumb(), FilterDrawer(), QuantityPicker(), useCartStore (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (43): dependencies, clsx, dompurify, dotenv, framer-motion, jspdf, jspdf-autotable, lucide-react (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): Dark Mode Theme Management, LocalStorage Persistence, ALL_NAV_ITEMS, UserLayout(), AvatarUploader(), BoletaForm(), BoletaImageUploader(), MiMercaderiaLayout() (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (22): DebtDetailModal(), AgregarTanda(), ShippingConfigModal(), TandaCard(), Button, Card, CardContent, CardDescription (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (37): Admin Routes (/admin/*), Control Mercancia Routes (/admin/control-mercancia), CORS Restriction (SITE_URL-based, no wildcard), CuentasBancarias Route (/admin/cuentas-bancarias), CSS Design System (oklch variables, fonts, shadows), Supabase Edge Function: create-mp-preference, EntregaDinero Routes (/admin/entrega-dinero), Environment Variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) (+29 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (26): buildDaySummary(), CuentasModal(), DailySummary(), DayCard(), DayDetail(), DeleteDayModal(), EditVentaInline(), fmtMiles() (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (15): AdminPanelBackground(), ProductCard(), CardBody(), CardContainer(), CardItem(), MouseEnterContext, useMouseEnter(), BackgroundBeamsWithCollision() (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (18): ProductCard Component, Tailwind CSS Styling, Hero Section Component, Mercado Pago Payment System, Product Catalog, CatalogProductCard3D(), FeaturedProducts Component, FeaturedProducts() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (23): Admin Permissions Context, App Router Configuration, Checkout Page, Home Page, Mi Mercaderia Context, Cart Store (Zustand), create-mp-preference Edge Function, create-sena-preference Edge Function (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (16): ask(), ask_secret(), banner(), _clear(), finish(), note(), open_url(), pause() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (13): BUCKETS, convertToWebP(), __dirname, downloadImage(), __filename, formatBytes(), generateReport(), migrate() (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.36
Nodes (9): agruparPorMarca(), calcUSD(), EntregaDineroTanda(), exportarPDF(), formatARS(), formatUSD(), MarcaSection(), montoEfectivo() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.25
Nodes (5): CuentasBancarias(), formatARS(), HistorialModal(), PROPIETARIO_COLORS, PROPIETARIOS

### Community 17 - "Community 17"
Cohesion: 0.46
Nodes (7): agruparTandas(), calcUSD(), EntregaDinero(), formatARS(), formatUSD(), montoEfectivo(), TandaCard()

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (4): CartItem, CORS_HEADERS, MPItem, MPPreference

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (4): __dirname, env, envPath, supabase

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): compilerOptions, lib, strict, imports, https://deno.land/std@0.177.0/http/server.ts

### Community 22 - "Community 22"
Cohesion: 0.83
Nodes (3): capture(), hitl-loop.template.sh script, step()

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): Admin Panel Features, E-commerce Web App, Public Part Features

## Knowledge Gaps
- **121 isolated node(s):** `block-dangerous-git.sh script`, `name`, `private`, `version`, `type` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `supabase` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 15`, `Community 16`, `Community 17`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `block-dangerous-git.sh script`, `name`, `private` to the rest of the system?**
  _123 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07111501316944688 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0693815987933635 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06285714285714286 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08244680851063829 - nodes in this community are weakly interconnected._