import './styles.css';
import { dashboardApi } from './services/dashboard-api';
import type { DashboardWarehouse } from './types/dashboard';
import { ensureSession, renderModule, showLogin } from './pages/modules';
import { apiRequest } from './services/api';
import { isDialogOpen, showError } from './ui/dialog';

type IconName = 'grid' | 'box' | 'activity' | 'tag' | 'pin' | 'chart' | 'settings' | 'search' | 'moon' | 'bell' | 'plus' | 'chevron' | 'wallet' | 'warning' | 'clock' | 'filter' | 'download' | 'more' | 'edit' | 'move' | 'arrow' | 'menu' | 'close' | 'logout';

const icons: Record<IconName, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  box: '<path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5Z"/><path d="M12 13v8"/>',
  activity: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  tag: '<path d="M20.6 13.6 11 23l-9-9V3h11l7.6 7.6a2.1 2.1 0 0 1 0 3Z"/><circle cx="7" cy="8" r="1.5"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.5a1.7 1.7 0 0 0 1.7-1.1 1.7 1.7 0 0 0-.34-1.88L3.8 6.56l2.83-2.83.06.06A1.7 1.7 0 0 0 8.6 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.5a1.7 1.7 0 0 0 1.1 1.6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.5 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.5v4h-.5a1.7 1.7 0 0 0-1.8 1.1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M16 13h5M3 9h14a4 4 0 0 1 4 4v3"/>',
  warning: '<path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  filter: '<path d="M4 5h16l-6 7v6l-4 2v-8Z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  move: '<path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>'
};

const icon = (name: IconName, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const formatPeso = (value: number | string) => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
let currentUserRole = '';

const navItems: [IconName, string][] = [
  ['grid', 'Dashboard'], ['box', 'Inventory'], ['activity', 'Stock Tracking'],
  ['tag', 'Categories'], ['pin', 'Locations'], ['chart', 'Reports'], ['settings', 'Settings']
];

type LocationItem = { name: string; code: string; units: number; status: string };
type WarehouseLocation = {
  id: number; code: string; name: string; currentUsage: number; maximumCapacity: number;
  skuCount: number; lowStockCount: number; outOfStockCount: number;
  sublocations: { code: string; currentUsage: number; maximumCapacity: number }[];
  items: LocationItem[];
};

// Mirrors the warehouse portion of the future GET /api/dashboard response.
// Percentages are intentionally derived below rather than stored in the UI.
const warehouseData: { name: string; locations: WarehouseLocation[] } = {
  name: 'Main Warehouse',
  locations: [
    { id: 1, code: 'A', name: 'Shelf A', currentUsage: 0, maximumCapacity: 500, skuCount: 0, lowStockCount: 0, outOfStockCount: 0,
      sublocations: [{ code: 'A1', currentUsage: 0, maximumCapacity: 165 }, { code: 'A2', currentUsage: 0, maximumCapacity: 165 }, { code: 'A3', currentUsage: 0, maximumCapacity: 170 }], items: [] },
    { id: 2, code: 'B', name: 'Shelf B', currentUsage: 0, maximumCapacity: 500, skuCount: 0, lowStockCount: 0, outOfStockCount: 0,
      sublocations: [{ code: 'B1', currentUsage: 0, maximumCapacity: 165 }, { code: 'B2', currentUsage: 0, maximumCapacity: 165 }, { code: 'B3', currentUsage: 0, maximumCapacity: 170 }], items: [] },
    { id: 3, code: 'C', name: 'Shelf C', currentUsage: 0, maximumCapacity: 500, skuCount: 0, lowStockCount: 0, outOfStockCount: 0,
      sublocations: [{ code: 'C1', currentUsage: 0, maximumCapacity: 165 }, { code: 'C2', currentUsage: 0, maximumCapacity: 165 }, { code: 'C3', currentUsage: 0, maximumCapacity: 170 }], items: [] },
    { id: 4, code: 'ST', name: 'Storage Area', currentUsage: 0, maximumCapacity: 500, skuCount: 0, lowStockCount: 0, outOfStockCount: 0,
      sublocations: [{ code: 'ST-01', currentUsage: 0, maximumCapacity: 170 }, { code: 'ST-02', currentUsage: 0, maximumCapacity: 165 }, { code: 'ST-03', currentUsage: 0, maximumCapacity: 165 }], items: [] }
  ]
};

const utilization = (current: number, maximum: number) => Math.min(100, Math.round((current / maximum) * 100));
const capacityTone = (percent: number) => percent >= 95 ? 'critical' : percent >= 85 ? 'high' : percent >= 70 ? 'full' : 'healthy';
const totalCurrent = warehouseData.locations.reduce((sum, location) => sum + location.currentUsage, 0);
const totalCapacity = warehouseData.locations.reduce((sum, location) => sum + location.maximumCapacity, 0);
const overallUtilization = utilization(totalCurrent, totalCapacity);

const shelf = (label: string, x: number, boxes: number[]) => `
  <g transform="translate(${x} 0)">
    <rect x="0" y="78" width="154" height="133" rx="5" fill="#dbe5ef" fill-opacity=".56" stroke="#1665cc" stroke-width="1.6" stroke-dasharray="5 4"/>
    <rect x="14" y="88" width="7" height="118" rx="2" fill="#587997"/><rect x="132" y="88" width="7" height="118" rx="2" fill="#587997"/>
    <path d="M15 123h123M15 163h123M15 202h123" stroke="#587997" stroke-width="5"/>
    ${boxes.map((v, i) => `<rect x="${27 + (i % 3) * 34}" y="${92 + Math.floor(i / 3) * 39}" width="26" height="24" rx="2" fill="${v ? '#b88958' : '#d4a56d'}"/><path d="M${40 + (i % 3) * 34} ${92 + Math.floor(i / 3) * 39}v24" stroke="#8b633c" opacity=".45"/>`).join('')}
    <rect x="48" y="60" width="60" height="28" rx="6" fill="#0e5bb8"/><text x="78" y="78" text-anchor="middle" fill="white" font-size="13" font-weight="700">${label}</text>
  </g>`;

const warehouseSvg = `
<svg class="warehouse-art" viewBox="0 0 850 300" role="img" aria-label="Interactive warehouse overview with shelves A, B, C and storage area">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#edf3f8"/><stop offset="1" stop-color="#ccd9e6"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef3f7"/><stop offset="1" stop-color="#b9c8d6"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>
  <rect width="850" height="300" fill="url(#wall)"/>
  <path d="M0 58 425 0l425 58v16L425 17 0 74Z" fill="#9cb0c2" opacity=".72"/>
  <g stroke="#8fa6ba" stroke-width="4" opacity=".55"><path d="M0 58 425 0l425 58M70 50l120 42L310 16l115 76L540 16l120 76 120-42M0 74h850"/></g>
  <g stroke="#b4c4d2" opacity=".6"><path d="M40 70v155M100 60v165M160 52v173M220 43v182M280 35v190M340 26v199M400 18v207M460 18v207M520 28v197M580 36v189M640 44v181M700 52v173M760 60v165M820 68v157"/></g>
  <path d="M0 214h850v86H0Z" fill="url(#floor)"/><path d="m425 210-55 90M425 210l55 90" stroke="#ffd253" stroke-width="5" opacity=".85"/>
  ${shelf('Shelf A', 28, [1,0,1,0,1,1,1,0,1])}
  ${shelf('Shelf B', 232, [0,1,1,1,0,1,1,1,0])}
  ${shelf('Shelf C', 438, [1,1,0,1,1,1,0,1,1])}
  <g transform="translate(650 0)">${shelf('Storage Area', 0, [1,0,1,1,1,0,0,1,1]).replace('<g transform="translate(0 0)">','').replace('</g>','')}</g>
  <g transform="translate(752 226)"><rect x="0" y="20" width="67" height="31" rx="5" fill="#dc8b24"/><rect x="45" y="5" width="29" height="27" rx="4" fill="#486b82"/><circle cx="16" cy="53" r="9" fill="#324657"/><circle cx="62" cy="53" r="9" fill="#324657"/><path d="M72 8V-10h4V8" stroke="#3a5367" stroke-width="4"/></g>
</svg>`;

const statCard = (type: IconName, label: string, value: string, meta: string, tone: string) => `
  <article class="stat-card">
    <div class="stat-icon ${tone}">${icon(type)}</div>
    <div><span>${label}</span><strong>${value}</strong><small>${meta}</small></div>
  </article>`;

const locationZone = (location: WarehouseLocation, index: number) => {
  const percent = utilization(location.currentUsage, location.maximumCapacity);
  return `<button class="location-zone location-${index + 1} ${capacityTone(percent)}" data-location-id="${location.id}" data-location-code="${location.code}" style="--util:${percent}%" aria-label="Open ${location.name} details">
    <span class="location-percent">${percent}%</span><small>USED</small>
    <span class="location-progress"><i></i></span>
    <span class="location-counts"><b>${location.skuCount} SKUs</b><b>${location.currentUsage} units</b></span>
    <span class="location-tooltip"><strong>${location.name}</strong><b>${percent}% utilized</b><span>${location.currentUsage} / ${location.maximumCapacity} units</span><span>${location.skuCount} SKUs · ${location.lowStockCount} low stock</span></span>
  </button>`;
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-mark">${icon('box')}</div><div><strong>StockHub</strong><span>Inventory System</span></div></div>
      <nav>${navItems.map(([i, label], idx) => `<button class="nav-item ${idx === 0 ? 'active' : ''}" data-label="${label}">${icon(i)}<span>${label}</span></button>`).join('')}</nav>
      <div class="sidebar-bottom">
        <button class="selector" id="warehouseSelector"><span class="selector-icon">🏢</span><span><small>Warehouse</small><b>Main Warehouse</b></span>${icon('chevron')}</button><div class="warehouse-menu" id="warehouseMenu"></div>
        <button class="profile"><span class="avatar">AM</span><span><b>Admin User</b><small>admin@stockhub.com</small></span>${icon('chevron')}</button>
        <button class="logout-button" id="globalLogout" type="button">${icon('logout')}<span>Logout</span></button>
      </div>
    </aside>
    <div class="app-content">
      <header class="header">
        <button class="mobile-menu" id="menuButton" aria-label="Open navigation">${icon('menu')}</button>
        <div class="page-title"><h1>Dashboard</h1><p>Overview of your inventory and warehouse</p></div>
        <label class="search"><span>${icon('search')}</span><input id="globalSearch" placeholder="Search items, SKU, categories..."/><kbd>Ctrl + K</kbd></label>
        <button class="icon-button mobile-search-button" id="mobileSearchButton" aria-label="Open search">${icon('search')}</button>
        <button class="icon-button" id="themeButton" aria-label="Toggle dark mode">${icon('moon')}</button>
        <button class="icon-button notification" id="notificationButton" aria-label="Notifications">${icon('bell')}<span>3</span></button>
        <button class="primary-button" id="quickAdd">${icon('plus')}<span>Quick Add</span><i></i>${icon('chevron')}</button>
      </header>
      <main>
        <div id="dashboardPage" class="dashboard-loading" aria-busy="true">
        <section class="dashboard-grid">
          <div class="main-column">
            <section class="stats-grid">
              ${statCard('box','Total Items','1,248','↑ 12.5%  vs last month','blue')}
              ${statCard('wallet','Total Warehouse Value','₱284,750.00','↑ 8.3%  vs last month','green')}
              ${statCard('warning','Low Stock Items','23','↓ 4  vs last month','orange')}
              ${statCard('clock','Recently Updated','18','In the last 24 hours','purple')}
            </section>
            <section class="warehouse-card">
              <div class="warehouse-title"><span>Main Warehouse</span></div>
              ${warehouseSvg}
              <div class="warehouse-summary" aria-live="polite"><span><b>${overallUtilization}%</b><small>Overall capacity</small></span><i></i><span><b>${totalCurrent.toLocaleString()}</b><small>Occupied units</small></span><i></i><span><b>${totalCapacity.toLocaleString()}</b><small>Total capacity</small></span><i></i><span><b>12</b><small>Locations</small></span></div>
              <div class="utilization-overlay">${warehouseData.locations.map(locationZone).join('')}</div>
              <div class="capacity-legend"><span><i class="healthy"></i>Healthy</span><span><i class="full"></i>Getting full</span><span><i class="high"></i>High</span><span><i class="critical"></i>Critical</span></div>
              <div class="mobile-capacity-list"><div class="mobile-overall"><span>Warehouse Capacity</span><b>${overallUtilization}%</b><small>${totalCurrent.toLocaleString()} of ${totalCapacity.toLocaleString()} units occupied</small></div>${warehouseData.locations.map(location => { const percent = utilization(location.currentUsage, location.maximumCapacity); return `<button class="mobile-location ${capacityTone(percent)}" data-location-id="${location.id}" data-location-code="${location.code}" style="--util:${percent}%"><span><b>${location.name}</b><small>${location.skuCount} SKUs · ${location.currentUsage} units</small></span><strong>${percent}%</strong><i><em></em></i>${icon('chevron')}</button>`; }).join('')}</div>
            </section>
            <section class="inventory-card warehouse-insights" aria-label="Read-only warehouse inventory overview">
              <div class="insight-heading"><div><h2>Warehouse Inventory Overview</h2><p>Live aggregate metrics by storage section</p></div><span><i></i>Live · Read only</span></div>
              <div class="table-scroll"><table class="insight-table"><thead><tr><th>Warehouse Section</th><th>Total SKUs</th><th>Total Units</th><th>Capacity</th><th>Utilization</th><th>Low Stock</th><th>Out of Stock</th><th>Capacity Status</th></tr></thead>
                <tbody id="warehouseSummaryRows"><tr><td colspan="8">Loading warehouse summary…</td></tr></tbody>
              </table></div>
            </section>
          </div>
          <aside class="right-rail">
            <section class="rail-card alerts"><div class="card-heading"><h2>Alerts</h2><button class="view-alerts">View all</button></div><div id="dashboardAlerts">
              ${[['Critical Stock','5 items are out of stock','5','red'],['Low Stock','23 items are low on stock','23','orange'],['Reorder Soon','15 items need reordering','15','yellow']].map(([a,b,c,d])=>`<div class="alert-row"><span class="alert-icon ${d}">${icon('warning')}</span><span><b>${a}</b><small>${b}</small></span><strong class="${d}">${c}</strong></div>`).join('')}</div>
            </section>
            <section class="rail-card stock-status"><h2>Stock Status</h2><div class="stock-wrap"><div class="donut"><span><b>1,248</b><small>Total Items</small></span></div><div class="legend"><span><i class="green"></i>In Stock <b>842 (67%)</b></span><span><i class="orange"></i>Low Stock <b>223 (18%)</b></span><span><i class="red"></i>Out of Stock <b>65 (5%)</b></span><span><i class="gray"></i>Unknown <b>118 (10%)</b></span></div></div></section>
            <section class="rail-card activity-card"><div class="card-heading"><h2>Recent Activity</h2><button class="view-transactions">View all</button></div><div id="dashboardActivity">
              ${[['↔','Wireless Drill moved from A1-03 to A2-12','2 mins ago by Admin','blue'],['♙','Safety Helmet stock updated','5 mins ago by John D.','orange'],['▣','LED Flood Light added to inventory','1 hour ago by Sarah M.','green']].map(([a,b,c,d])=>`<div class="activity-row"><span class="activity-icon ${d}">${a}</span><span><b>${b}</b><small>${c}</small></span></div>`).join('')}</div>
            </section>
          </aside>
        </section>
        </div>
        <div id="modulePage" hidden></div>
      </main>
    </div>
  </div>
  <div class="scrim" id="scrim"></div>
  <aside class="drawer" id="addDrawer" aria-hidden="true"><div class="drawer-head"><div><small>Inventory</small><h2>Add new item</h2></div><button id="closeDrawer">${icon('close')}</button></div><form id="addForm"><label>Item name<input name="name" required placeholder="e.g. Cordless screwdriver"></label><label>SKU<input name="sku" required placeholder="TL-000-000"></label><div class="form-row"><label>Category<select name="categoryId" required><option value="">Loading categories…</option></select></label><label>Quantity<input name="quantity" type="number" min="0" value="0"></label></div><div class="form-row"><label>Unit cost (PHP ₱)<input name="unitCost" type="number" min="0" step=".01" value="0" placeholder="0.00" aria-label="Unit cost in Philippine pesos"></label><label>Reorder level<input name="reorderLevel" type="number" min="0" value="10"></label></div><label>Warehouse location<select name="locationId" required><option value="">Loading locations…</option></select></label><label>Description<textarea name="description" placeholder="Add item details..."></textarea></label><div class="drawer-actions"><button type="button" id="cancelDrawer">Cancel</button><button class="save" type="submit">Save item</button></div></form></aside>
  <aside class="drawer location-drawer" id="locationDrawer" aria-hidden="true"><div id="locationDrawerContent"></div></aside>
  <div class="toast" id="toast"><span>✓</span><div><b>Inventory updated</b><small id="toastText">New inventory item added</small></div><button>${icon('close')}</button></div>
  <aside class="notification-panel" id="notificationPanel"><div><h3>Notifications</h3><button class="close-notifications">${icon('close')}</button></div><section></section></aside>
`;

const sidebar = document.querySelector('#sidebar')!;
const scrim = document.querySelector<HTMLElement>('#scrim')!;
const drawer = document.querySelector<HTMLElement>('#addDrawer')!;
const locationDrawer = document.querySelector<HTMLElement>('#locationDrawer')!;
const toast = document.querySelector<HTMLElement>('#toast')!;

const closePanels = () => { sidebar.classList.remove('open'); drawer.classList.remove('open'); locationDrawer.classList.remove('open'); scrim.classList.remove('show'); drawer.setAttribute('aria-hidden','true'); locationDrawer.setAttribute('aria-hidden','true'); };
document.querySelector('#menuButton')?.addEventListener('click', () => { sidebar.classList.add('open'); scrim.classList.add('show'); });
document.querySelector('#mobileSearchButton')?.addEventListener('click', () => { document.querySelector('.header')?.classList.toggle('search-open'); document.querySelector<HTMLInputElement>('#globalSearch')?.focus(); });
document.querySelector('#quickAdd')?.addEventListener('click', async () => { drawer.classList.add('open'); scrim.classList.add('show'); drawer.setAttribute('aria-hidden','false');try{const [categories,locations]:any[]=await Promise.all([apiRequest('/categories'),apiRequest('/locations')]);const categorySelect=drawer.querySelector<HTMLSelectElement>('[name="categoryId"]')!;const locationSelect=drawer.querySelector<HTMLSelectElement>('[name="locationId"]')!;categorySelect.innerHTML=categories.map((entry:any)=>`<option value="${entry.id}">${entry.name}</option>`).join('');locationSelect.innerHTML=locations.filter((entry:any)=>entry.locationType!=='WAREHOUSE'&&entry.status==='ACTIVE').map((entry:any)=>`<option value="${entry.id}">${entry.name} (${entry.code}) — ${entry.currentUsage}/${entry.maximumCapacity} units</option>`).join('');}catch(error){closePanels();showError(error instanceof Error?error.message:'Form options could not be loaded.');} });
document.querySelector('#closeDrawer')?.addEventListener('click', closePanels);
document.querySelector('#cancelDrawer')?.addEventListener('click', closePanels);
scrim.addEventListener('click', closePanels);

document.querySelector('#themeButton')?.addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('stockhub-theme', dark ? 'dark' : 'light');
});
if (localStorage.getItem('stockhub-theme') === 'dark') document.documentElement.classList.add('dark');

document.querySelectorAll<HTMLElement>('.nav-item').forEach(el => el.addEventListener('click', async () => {
  const label=el.dataset.label!;document.body.classList.toggle('categories-active',label==='Categories');document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));el.classList.add('active');
  document.querySelector('.page-title h1')!.textContent=label;const dashboard=document.querySelector<HTMLElement>('#dashboardPage')!;const module=document.querySelector<HTMLElement>('#modulePage')!;
  if(label==='Dashboard'){dashboard.hidden=false;module.hidden=true;await Promise.all([hydrateDashboard(),loadWarehouseDashboard()]);}else{dashboard.hidden=true;module.hidden=false;module.innerHTML='<div class="module-loading page-loader">Loading…</div>';await renderModule(label as any,module);}
  const currentQuery=document.querySelector<HTMLInputElement>('#globalSearch')?.value??'';if(currentQuery)filterRows(currentQuery);
  if(innerWidth<=1100)closePanels();window.scrollTo({top:0,behavior:'smooth'});
}));

const filterRows = (query = '') => {
  const module=document.querySelector<HTMLElement>('#modulePage');
  const moduleSearch=module&&!module.hidden?module.querySelector<HTMLInputElement>('.table-search'):null;
  if(moduleSearch){if(moduleSearch.value!==query){moduleSearch.value=query;moduleSearch.dispatchEvent(new Event('input',{bubbles:true}));}return;}
  document.querySelectorAll<HTMLTableRowElement>('#warehouseSummaryRows tr,#inventoryRows tr').forEach(row => {
    row.hidden = !row.textContent!.toLowerCase().includes(query.toLowerCase());
  });
};
document.querySelector<HTMLInputElement>('#globalSearch')?.addEventListener('input', e => filterRows((e.target as HTMLInputElement).value));
window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector<HTMLInputElement>('#globalSearch')?.focus(); } });

const renderLocationDetails = (location: WarehouseLocation) => {
  const percent = utilization(location.currentUsage, location.maximumCapacity);
  const tone = capacityTone(percent);
  document.querySelector('#locationDrawerContent')!.innerHTML = `
    <div class="drawer-head"><div><small>Warehouse location</small><h2>${location.name}</h2></div><button class="close-location">${icon('close')}</button></div>
    <div class="location-detail-body">
      <div class="location-code"><span>${location.code}</span><div><b>Location Code</b><small>Main Warehouse · Active</small></div></div>
      <section class="detail-capacity ${tone}" style="--util:${percent}%"><div><span>Utilization</span><strong>${percent}%</strong></div><div class="detail-progress"><i></i></div><small>${location.currentUsage} of ${location.maximumCapacity} units occupied</small></section>
      <div class="detail-stats"><span><b>${location.skuCount}</b><small>Total SKUs</small></span><span><b>${location.currentUsage}</b><small>Total Units</small></span><span><b>${location.lowStockCount}</b><small>Low Stock</small></span><span><b>${location.outOfStockCount}</b><small>Out of Stock</small></span></div>
      <section class="sublocations"><div class="detail-heading"><h3>Sublocations</h3><small>Capacity utilization</small></div><div class="sublocation-grid">${location.sublocations.map(sub => { const subPercent = utilization(sub.currentUsage, sub.maximumCapacity); return `<div class="sublocation ${capacityTone(subPercent)}" style="--util:${subPercent}%"><span><b>${sub.code}</b><strong>${subPercent}%</strong></span><i><em></em></i><small>${sub.currentUsage} / ${sub.maximumCapacity} units</small></div>`; }).join('')}</div></section>
      <section class="location-items"><div class="detail-heading"><h3>Items in this location</h3><small>Showing ${location.items.length} items</small></div>${location.items.slice(0,5).map(item => `<div class="location-item"><span class="mini-box">${icon('box')}</span><div><b>${item.name}</b><small>${item.code} · ${item.units} units</small></div><span class="pill ${item.status === 'Low Stock' ? 'orange' : 'green'}">${item.status}</span></div>`).join('')}<button class="view-location-items" data-code="${location.code}">View all items ${icon('arrow')}</button></section>
    </div>`;
  locationDrawer.classList.add('open');
  locationDrawer.setAttribute('aria-hidden','false');
  scrim.classList.add('show');
  locationDrawer.querySelector('.close-location')?.addEventListener('click', closePanels);
  locationDrawer.querySelector<HTMLButtonElement>('.view-location-items')?.addEventListener('click', () => {
    closePanels();
    openModule('Inventory');
  });
};

document.querySelectorAll<HTMLElement>('[data-location-id]').forEach(section => section.addEventListener('click', async () => {
  const location = warehouseData.locations.find(candidate => candidate.code === section.dataset.locationCode)
    ?? warehouseData.locations.find(candidate => candidate.id === Number(section.dataset.locationId));
  if(location){try{const live:any=await apiRequest(`/locations/${location.id}`);renderLocationDetails({...location,...live,skuCount:Number(live.skuCount??0),lowStockCount:Number(live.lowStockCount??0),outOfStockCount:Number(live.outOfStockCount??0)});}catch{renderLocationDetails(location);}}
}));

function applyWarehouseData(data: DashboardWarehouse): void {
  const summaryValues = document.querySelectorAll<HTMLElement>('.warehouse-summary span b');
  const summary = [data.utilizationPercentage, data.currentUsage, data.maximumCapacity, data.locationCount];
  summaryValues.forEach((element, index) => element.textContent = index === 0 ? `${Math.round(summary[index] ?? 0)}%` : Number(summary[index] ?? 0).toLocaleString());
  const mobileOverall = document.querySelector<HTMLElement>('.mobile-overall');
  if (mobileOverall) mobileOverall.innerHTML = `<span>Warehouse Capacity</span><b>${Math.round(data.utilizationPercentage)}%</b><small>${data.currentUsage.toLocaleString()} of ${data.maximumCapacity.toLocaleString()} units occupied</small>`;

  data.locations.forEach(apiLocation => {
    const local = warehouseData.locations.find(location => location.code === apiLocation.code);
    if (local) Object.assign(local, { id: apiLocation.id, name: apiLocation.name, currentUsage: apiLocation.currentUsage, maximumCapacity: apiLocation.maximumCapacity, skuCount: apiLocation.skuCount, lowStockCount: apiLocation.lowStockCount, outOfStockCount: apiLocation.outOfStockCount });
    const percent = Math.round(apiLocation.utilizationPercentage);
    const zone = document.querySelector<HTMLElement>(`.location-zone[data-location-code="${apiLocation.code}"]`);
    if (zone) {
      zone.dataset.locationId = String(apiLocation.id);
      zone.classList.remove('healthy','full','high','critical'); zone.classList.add(capacityTone(percent)); zone.style.setProperty('--util', `${percent}%`);
      zone.querySelector<HTMLElement>('.location-percent')!.textContent = `${percent}%`;
      const counts = zone.querySelectorAll<HTMLElement>('.location-counts b'); counts[0]!.textContent = `${apiLocation.skuCount} SKUs`; counts[1]!.textContent = `${apiLocation.currentUsage} units`;
      const tooltipRoot = zone.querySelector<HTMLElement>('.location-tooltip')!;
      tooltipRoot.querySelector('strong')!.textContent = apiLocation.name;
      tooltipRoot.querySelector('b')!.textContent = `${percent}% utilized`;
      const tooltip = tooltipRoot.querySelectorAll<HTMLElement>('span');
      tooltip[0]!.textContent = `${apiLocation.currentUsage} / ${apiLocation.maximumCapacity} units`;
      tooltip[1]!.textContent = `${apiLocation.skuCount} SKUs · ${apiLocation.lowStockCount} low stock`;
    }
    const mobile = document.querySelector<HTMLElement>(`.mobile-location[data-location-code="${apiLocation.code}"]`);
    if (mobile) mobile.dataset.locationId = String(apiLocation.id);
  });
  const summaryRows=document.querySelector<HTMLElement>('#warehouseSummaryRows');
  if(summaryRows)summaryRows.innerHTML=data.locations.length?data.locations.map(location=>{const percent=Math.round(location.utilizationPercentage);const remaining=Number(location.maximumCapacity)-Number(location.currentUsage);const status=percent>100?'Over Capacity':percent>=85?'Near Capacity':percent>=70?'Monitor':'Healthy';const tone=percent>100?'red':percent>=85?'orange':'green';return`<tr><td><b>${location.name}</b><small>${location.code}</small></td><td>${Number(location.skuCount).toLocaleString()}</td><td>${Number(location.currentUsage).toLocaleString()}</td><td>${Number(location.maximumCapacity).toLocaleString()} units</td><td><b>${percent}%</b><div class="progress"><i class="${tone==='green'?'green':'orange'}" style="width:${Math.min(100,Math.max(0,percent))}%"></i></div></td><td>${Number(location.lowStockCount).toLocaleString()}</td><td>${Number(location.outOfStockCount).toLocaleString()}</td><td><span class="pill ${tone}">${status}</span><small>${remaining>=0?`${remaining.toLocaleString()} units available`:`${Math.abs(remaining).toLocaleString()} units over`}</small></td></tr>`;}).join(''):`<tr><td colspan="8">No active warehouse sections found.</td></tr>`;
  document.querySelector('.warehouse-card')?.classList.remove('is-loading','has-data-error');
}

async function loadWarehouseDashboard(): Promise<void> {
  const card = document.querySelector<HTMLElement>('.warehouse-card');
  card?.classList.add('is-loading'); card?.setAttribute('aria-busy','true');
  try { applyWarehouseData(await dashboardApi.getWarehouse()); }
  catch {
    card?.classList.add('has-data-error');
    document.querySelectorAll<HTMLElement>('.location-zone').forEach(zone => {
      zone.querySelector<HTMLElement>('.location-percent')!.textContent = '—';
      zone.querySelectorAll<HTMLElement>('.location-counts b').forEach(value => value.textContent = 'Unavailable');
      zone.setAttribute('aria-label', 'Warehouse utilization data unavailable');
    });
  }
  finally { card?.classList.remove('is-loading'); card?.setAttribute('aria-busy','false'); }
}

const openModule=(label:string)=>document.querySelector<HTMLButtonElement>(`.nav-item[data-label="${label}"]`)?.click();
async function hydrateDashboard():Promise<void>{
  try{
    const [summary,alerts,transactions,locations]:any[]=await Promise.all([
      apiRequest('/reports/inventory-summary'),apiRequest('/alerts'),apiRequest('/transactions?limit=5'),apiRequest('/locations')
    ]);
    const statValues=document.querySelectorAll<HTMLElement>('.stat-card strong');
    if(statValues[0])statValues[0].textContent=Number(summary.totalItems).toLocaleString();
    if(statValues[1])statValues[1].textContent=formatPeso(summary.inventoryValue);
    if(statValues[2])statValues[2].textContent=Number(summary.lowStockItems).toLocaleString();
    const recentlyUpdated=transactions.transactions.filter((transaction:any)=>Date.now()-new Date(transaction.createdAt).getTime()<=86_400_000).length;
    if(statValues[3])statValues[3].textContent=recentlyUpdated.toLocaleString();
    const statMeta=document.querySelectorAll<HTMLElement>('.stat-card small');
    if(statMeta[0])statMeta[0].textContent='Active inventory SKUs';
    if(statMeta[1])statMeta[1].textContent='Current stock valuation';
    if(statMeta[2])statMeta[2].textContent=`${Number(summary.outOfStockItems).toLocaleString()} items out of stock`;
    if(statMeta[3])statMeta[3].textContent='Updated in the last 24 hours';
    const total=Number(summary.totalItems)||0,low=Number(summary.lowStockItems)||0,out=Number(summary.outOfStockItems)||0,inStock=Math.max(0,total-low-out);
    const percent=(value:number)=>total?Math.round(value/total*100):0;const inPercent=percent(inStock),lowPercent=percent(low),outPercent=percent(out),unknownPercent=Math.max(0,100-inPercent-lowPercent-outPercent);
    const donut=document.querySelector<HTMLElement>('.stock-status .donut');if(donut){donut.style.background=`conic-gradient(#43bb73 0 ${inPercent}%,#f19a2c ${inPercent}% ${inPercent+lowPercent}%,#ea5656 ${inPercent+lowPercent}% ${inPercent+lowPercent+outPercent}%,#9aa8ba ${inPercent+lowPercent+outPercent}% 100%)`;donut.querySelector('b')!.textContent=total.toLocaleString();}
    const legendValues=document.querySelectorAll<HTMLElement>('.stock-status .legend b');const liveLegend=[[inStock,inPercent],[low,lowPercent],[out,outPercent],[0,unknownPercent]];legendValues.forEach((element,index)=>{const value=liveLegend[index]??[0,0];element.textContent=`${value[0].toLocaleString()} (${value[1]}%)`;});
    const alertRoot=document.querySelector<HTMLElement>('#dashboardAlerts')!;
    alertRoot.innerHTML=alerts.length?alerts.slice(0,3).map((a:any)=>`<div class="alert-row"><span class="alert-icon ${a.severity==='CRITICAL'?'red':'orange'}">${icon('warning')}</span><span><b>${a.type.replaceAll('_',' ')}</b><small>${a.message}</small></span></div>`).join(''):`<div class="rail-empty">No active alerts</div>`;
    const activityRoot=document.querySelector<HTMLElement>('#dashboardActivity')!;
    activityRoot.innerHTML=transactions.transactions.length?transactions.transactions.slice(0,3).map((t:any)=>`<div class="activity-row"><span class="activity-icon blue">↔</span><span><b>${t.item} · ${t.transactionType.replaceAll('_',' ')}</b><small>${new Date(t.createdAt).toLocaleString()} by ${t.performedBy}</small></span></div>`).join(''):`<div class="rail-empty">No recent activity</div>`;
    const badge=document.querySelector<HTMLElement>('#notificationButton span')!;badge.textContent=String(alerts.length);badge.hidden=!alerts.length;
    const notificationBody=document.querySelector<HTMLElement>('#notificationPanel section')!;notificationBody.innerHTML=alerts.length?alerts.map((a:any)=>`<article><b>${a.type.replaceAll('_',' ')}</b><span>${a.message}</span><small>${new Date(a.createdAt).toLocaleString()}</small></article>`).join(''):`<div class="rail-empty">You are all caught up.</div>`;
    const warehouses=locations.filter((l:any)=>l.locationType==='WAREHOUSE');const menu=document.querySelector<HTMLElement>('#warehouseMenu')!;menu.innerHTML=warehouses.map((w:any)=>`<button data-id="${w.id}"><b>${w.name}</b><small>${w.code}</small></button>`).join('')||'<span>No warehouses found</span>';
    menu.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>{document.querySelector('#warehouseSelector b')!.textContent=button.querySelector('b')!.textContent!;menu.classList.remove('show');});
  }catch(error){console.error('Dashboard hydration failed',error);throw error;}
}


toast.querySelector('button')?.addEventListener('click', () => toast.classList.remove('show'));
document.querySelector('#addForm')?.addEventListener('submit', async e => { e.preventDefault();const form=new FormData(e.target as HTMLFormElement);try{await apiRequest('/items',{method:'POST',body:JSON.stringify({name:form.get('name'),sku:form.get('sku'),description:form.get('description'),categoryId:Number(form.get('categoryId')),locationId:Number(form.get('locationId')),unit:'unit',unitCost:Number(form.get('unitCost')),reorderLevel:Number(form.get('reorderLevel')),initialQuantity:Number(form.get('quantity')),initialStockReason:'Initial stock entered during item creation.'})});closePanels();(e.target as HTMLFormElement).reset();window.dispatchEvent(new CustomEvent('stockhub:mutation'));document.querySelector('#toastText')!.textContent='New inventory item added';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500);}catch(error){showError(error instanceof Error?error.message:'Item could not be saved.','Item could not be saved');} });

document.querySelector('#notificationButton')?.addEventListener('click',()=>document.querySelector('#notificationPanel')?.classList.toggle('show'));
document.querySelector('.close-notifications')?.addEventListener('click',()=>document.querySelector('#notificationPanel')?.classList.remove('show'));
document.querySelector('#warehouseSelector')?.addEventListener('click',()=>document.querySelector('#warehouseMenu')?.classList.toggle('show'));
document.querySelectorAll('.view-alerts').forEach(button=>button.addEventListener('click',()=>document.querySelector('#notificationPanel')?.classList.add('show')));
document.querySelectorAll('.view-transactions').forEach(button=>button.addEventListener('click',()=>openModule('Stock Tracking')));
async function loadLiveDashboard():Promise<void>{const page=document.querySelector<HTMLElement>('#dashboardPage')!;page.classList.add('dashboard-loading');page.classList.remove('dashboard-load-error');page.setAttribute('aria-busy','true');try{await Promise.all([hydrateDashboard(),loadWarehouseDashboard()]);page.classList.remove('dashboard-loading');}catch{page.classList.remove('dashboard-loading');page.classList.add('dashboard-load-error');}finally{page.setAttribute('aria-busy','false');}}

let liveUpdateTimer: number | undefined;
let knownDataVersion: string | null = null;
let liveRefreshInFlight = false;

async function refreshActiveView(): Promise<boolean> {
  if (drawer.classList.contains('open') || locationDrawer.classList.contains('open') || isDialogOpen()) return false;
  const active = document.querySelector<HTMLElement>('.nav-item.active')?.dataset.label ?? 'Dashboard';
  if (active === 'Dashboard') await Promise.all([hydrateDashboard(), loadWarehouseDashboard()]);
  else await renderModule(active as any, document.querySelector<HTMLElement>('#modulePage')!);
  return true;
}

async function checkForLiveUpdates(): Promise<void> {
  if (document.hidden || liveRefreshInFlight) return;
  liveRefreshInFlight = true;
  try {
    const data = await apiRequest<{version:string}>('/sync/version');
    if (knownDataVersion === null) knownDataVersion = data.version;
    else if (knownDataVersion !== data.version && await refreshActiveView()) knownDataVersion = data.version;
  } catch { /* A temporary polling failure must not interrupt the current screen. */ }
  finally { liveRefreshInFlight = false; }
}

function startLiveUpdates(): void {
  if (liveUpdateTimer !== undefined) return;
  void checkForLiveUpdates();
  liveUpdateTimer = window.setInterval(() => void checkForLiveUpdates(), 5000);
}

function stopLiveUpdates(): void {
  if (liveUpdateTimer !== undefined) window.clearInterval(liveUpdateTimer);
  liveUpdateTimer = undefined;
  knownDataVersion = null;
}

window.addEventListener('stockhub:mutation', event => {
  const refreshCurrent = (event as CustomEvent<{refreshCurrent?:boolean}>).detail?.refreshCurrent !== false;
  void (async () => {
    if (liveRefreshInFlight) {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('stockhub:mutation',{detail:{refreshCurrent}})), 100);
      return;
    }
    liveRefreshInFlight = true;
    try {
      if (refreshCurrent) await refreshActiveView();
      const data = await apiRequest<{version:string}>('/sync/version');
      knownDataVersion = data.version;
    } catch { /* The background poll will retry if immediate synchronization fails. */ }
    finally { liveRefreshInFlight = false; }
  })();
});

document.querySelector<HTMLButtonElement>('#globalLogout')!.addEventListener('click', async event => {
  const button = event.currentTarget as HTMLButtonElement;
  button.disabled = true;
  stopLiveUpdates();
  try { await apiRequest('/auth/logout',{method:'POST'}); location.reload(); }
  catch (error) {
    button.disabled = false;
    startLiveUpdates();
    showError(error instanceof Error ? error.message : 'Logout failed. Please try again.','Could not log out');
  }
});

async function initializeAuthenticatedUi():Promise<void>{const session:any=await apiRequest('/auth/me');currentUserRole=session.user.role;const admin=currentUserRole==='ADMIN';document.querySelector<HTMLButtonElement>('#quickAdd')!.hidden=!admin;const profile=document.querySelector<HTMLElement>('.profile')!;profile.querySelector('b')!.textContent=session.user.name;profile.querySelector('small')!.textContent=session.user.email;profile.querySelector('.avatar')!.textContent=session.user.name.split(/\s+/).map((part:string)=>part[0]).join('').slice(0,2).toUpperCase();await loadLiveDashboard();startLiveUpdates();}
void ensureSession().then(authenticated=>{
  if(authenticated){void initializeAuthenticatedUi();}
  else showLogin(()=>{void initializeAuthenticatedUi();});
});
