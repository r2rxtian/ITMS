import './styles.css';
import { dashboardApi } from './services/dashboard-api';
import type { DashboardWarehouse } from './types/dashboard';
import { ensureSession, renderModule, showLogin } from './pages/modules';
import { apiRequest } from './services/api';
import { isDialogOpen, showError } from './ui/dialog';
import { buildLocationHierarchy, setupCascadingLocationChain } from './ui/cascading-location';

type IconName = 'grid' | 'box' | 'activity' | 'tag' | 'pin' | 'chart' | 'settings' | 'search' | 'moon' | 'bell' | 'plus' | 'chevron' | 'wallet' | 'warning' | 'clock' | 'filter' | 'download' | 'more' | 'edit' | 'move' | 'arrow' | 'menu' | 'close' | 'logout' | 'clipboard';

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
  logout: '<path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 12h6M9 16h6"/>'
};

const icon = (name: IconName, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const formatPeso = (value: number | string) => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
let currentUserRole = '';
let notificationSeenKey='stockhub.notifications.seenId';
let latestNotificationId=0;

const navItems: [IconName, string][] = [
  ['grid', 'Dashboard'], ['box', 'Inventory'], ['activity', 'Stock Tracking'],
  ['tag', 'Categories'], ['pin', 'Locations'], ['clipboard', 'Plans'],
  ['chart', 'Reports'], ['settings', 'Settings']
];

type LocationItem = { name: string; code: string; units: number; status: string };
type WarehouseLocation = {
  id: number; code: string; name: string; currentUsage: number; maximumCapacity: number;
  skuCount: number; lowStockCount: number; outOfStockCount: number;
  sublocations: { code: string; currentUsage: number; maximumCapacity: number }[];
  items: LocationItem[];
};

const esc = (value: string | number | null | undefined) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

let activeWarehouseId: number = Number(localStorage.getItem('stockhub.activeWarehouseId')) || 1;

const getPinnedSlotKey = (whId?: number) => `stockhub.pinnedSlots.${whId || activeWarehouseId || 1}`;

const getStoredPinnedSlotIds = (whId?: number): number[] | undefined => {
  const stored = localStorage.getItem(getPinnedSlotKey(whId));
  if (!stored) return undefined;
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(Number).filter(n => Number.isInteger(n) && n > 0);
  } catch {}
  return undefined;
};

const setStoredPinnedSlotIds = (whId: number | undefined, ids: number[] | undefined) => {
  const key = getPinnedSlotKey(whId);
  if (!ids || ids.length === 0) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, JSON.stringify(ids.slice(0, 6)));
  }
};


const utilization = (current: number, maximum: number) => Math.min(100, Math.round((Number(current || 0) / (Number(maximum) || 1)) * 100));
const capacityTone = (percent: number) => percent >= 95 ? 'critical' : percent >= 85 ? 'high' : percent >= 70 ? 'full' : 'healthy';

const shelfBay = (x: number, boxes: number[]) => `
  <g transform="translate(${x} 0)">
    <rect x="0" y="78" width="154" height="133" rx="5" fill="#dbe5ef" fill-opacity=".56" stroke="#1665cc" stroke-width="1.6" stroke-dasharray="5 4"/>
    <rect x="14" y="88" width="7" height="118" rx="2" fill="#587997"/><rect x="132" y="88" width="7" height="118" rx="2" fill="#587997"/>
    <path d="M15 123h123M15 163h123M15 202h123" stroke="#587997" stroke-width="5"/>
    ${boxes.map((v, i) => `<rect x="${27 + (i % 3) * 34}" y="${92 + Math.floor(i / 3) * 39}" width="26" height="24" rx="2" fill="${v ? '#b88958' : '#d4a56d'}"/><path d="M${40 + (i % 3) * 34} ${92 + Math.floor(i / 3) * 39}v24" stroke="#8b633c" opacity=".45"/>`).join('')}
  </g>`;

const warehouseSvg = `
<svg class="warehouse-art" viewBox="0 0 850 300" preserveAspectRatio="none" role="img" aria-label="Interactive warehouse overview and storage bays">
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
  ${shelfBay(28, [1,0,1,0,1,1,1,0,1])}
  ${shelfBay(232, [0,1,1,1,0,1,1,1,0])}
  ${shelfBay(438, [1,1,0,1,1,1,0,1,1])}
  ${shelfBay(650, [1,0,1,1,1,0,0,1,1])}
  <g transform="translate(752 226)"><rect x="0" y="20" width="67" height="31" rx="5" fill="#dc8b24"/><rect x="45" y="5" width="29" height="27" rx="4" fill="#486b82"/><circle cx="16" cy="53" r="9" fill="#324657"/><circle cx="62" cy="53" r="9" fill="#324657"/><path d="M72 8V-10h4V8" stroke="#3a5367" stroke-width="4"/></g>
</svg>`;

const eastHubSvg = `
<svg class="warehouse-art warehouse-art-easthub" viewBox="0 0 850 300" preserveAspectRatio="none" role="img" aria-label="East Hub Warehouse architectural interior with mezzanine catwalks, industrial glazing, and staging dock">
  <defs>
    <linearGradient id="ehWallBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b68962"/>
      <stop offset="35%" stop-color="#c99b74"/>
      <stop offset="85%" stop-color="#b88b65"/>
      <stop offset="100%" stop-color="#a4754f"/>
    </linearGradient>

    <linearGradient id="ehTopHeader" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#73492a"/>
      <stop offset="100%" stop-color="#8e623f"/>
    </linearGradient>

    <linearGradient id="ehColumnGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#cca484"/>
      <stop offset="25%" stop-color="#e9d0b9"/>
      <stop offset="70%" stop-color="#dcbe9f"/>
      <stop offset="100%" stop-color="#b8916f"/>
    </linearGradient>

    <linearGradient id="ehBeamGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ebd5c0"/>
      <stop offset="40%" stop-color="#dcbe9f"/>
      <stop offset="100%" stop-color="#b8916f"/>
    </linearGradient>

    <linearGradient id="ehFloorGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8c8579"/>
      <stop offset="15%" stop-color="#a49e92"/>
      <stop offset="60%" stop-color="#908a7e"/>
      <stop offset="100%" stop-color="#736d62"/>
    </linearGradient>

    <linearGradient id="ehFloorSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.02"/>
      <stop offset="22%" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="78%" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>

    <linearGradient id="ehLampRay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff8eb" stop-opacity="0.38"/>
      <stop offset="60%" stop-color="#fff5e4" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ffe8cc" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="ehGlassGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f5efe6"/>
      <stop offset="100%" stop-color="#e3dacb"/>
    </linearGradient>

    <linearGradient id="ehConduitBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4e758e"/>
      <stop offset="50%" stop-color="#3b5f77"/>
      <stop offset="100%" stop-color="#2a4557"/>
    </linearGradient>

    <linearGradient id="ehDoorRollup" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>

    <pattern id="ehSlatPattern" width="16" height="300" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="300" stroke="#996a46" stroke-width="1.2" opacity="0.45"/>
      <line x1="1" y1="0" x2="1" y2="300" stroke="#dfbc9b" stroke-width="0.8" opacity="0.25"/>
    </pattern>

    <pattern id="ehTopSlatPattern" width="10" height="32" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="32" stroke="#573419" stroke-width="1.2" opacity="0.55"/>
      <line x1="1" y1="0" x2="1" y2="32" stroke="#a4734a" stroke-width="0.8" opacity="0.25"/>
    </pattern>
  </defs>

  <!-- 1. Background Wall & Vertical Fluting -->
  <g id="ehBgWall">
    <rect width="850" height="236" fill="url(#ehWallBase)"/>
    <rect width="850" height="236" fill="url(#ehSlatPattern)"/>
    <rect x="0" y="0" width="850" height="32" fill="url(#ehTopHeader)"/>
    <rect x="0" y="0" width="850" height="32" fill="url(#ehTopSlatPattern)"/>
    <line x1="0" y1="32" x2="850" y2="32" stroke="#543217" stroke-width="2"/>
    <line x1="0" y1="34" x2="850" y2="34" stroke="#d5b08e" stroke-width="1"/>
  </g>

  <!-- 2. Roof Trusses / Rafters (Triangle Warren Truss) -->
  <g id="ehTrusses" stroke="#caa27e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="0" y1="58" x2="850" y2="58" stroke="#bd916b" stroke-width="6"/>

    <!-- Left Bay Rafters -->
    <line x1="0" y1="32" x2="48" y2="58"/>
    <line x1="48" y1="58" x2="98" y2="32"/>
    <line x1="48" y1="32" x2="48" y2="58"/>
    <line x1="98" y1="32" x2="98" y2="58"/>
    <line x1="98" y1="32" x2="146" y2="58"/>

    <!-- Center Bay Rafters -->
    <line x1="192" y1="58" x2="258" y2="32"/>
    <line x1="258" y1="32" x2="325" y2="58"/>
    <line x1="258" y1="32" x2="258" y2="58"/>
    <line x1="325" y1="58" x2="391" y2="32"/>
    <line x1="325" y1="32" x2="325" y2="58"/>
    <line x1="391" y1="32" x2="458" y2="58"/>
    <line x1="391" y1="32" x2="391" y2="58"/>
    <line x1="458" y1="58" x2="525" y2="32"/>
    <line x1="458" y1="32" x2="458" y2="58"/>
    <line x1="525" y1="32" x2="591" y2="58"/>
    <line x1="525" y1="32" x2="525" y2="58"/>
    <line x1="591" y1="58" x2="658" y2="32"/>
    <line x1="591" y1="32" x2="591" y2="58"/>

    <!-- Right Bay Rafters -->
    <line x1="704" y1="32" x2="752" y2="58"/>
    <line x1="752" y1="58" x2="802" y2="32"/>
    <line x1="752" y1="32" x2="752" y2="58"/>
    <line x1="802" y1="32" x2="802" y2="58"/>
    <line x1="802" y1="32" x2="850" y2="58"/>
  </g>

  <!-- 3. Upper & Mid Windows -->
  <g id="ehWindows">
    <!-- Center Ribbon Window -->
    <rect x="260" y="104" width="330" height="34" rx="2" fill="#d9cebd" stroke="#b19f87" stroke-width="2"/>
    <rect x="263" y="107" width="324" height="28" fill="url(#ehGlassGrad)"/>
    <g stroke="#ffffff" stroke-width="1.5" opacity="0.88">
      <line x1="263" y1="121" x2="587" y2="121"/>
      <line x1="303" y1="107" x2="303" y2="135"/>
      <line x1="344" y1="107" x2="344" y2="135"/>
      <line x1="385" y1="107" x2="385" y2="135"/>
      <line x1="425" y1="107" x2="425" y2="135"/>
      <line x1="465" y1="107" x2="465" y2="135"/>
      <line x1="506" y1="107" x2="506" y2="135"/>
      <line x1="547" y1="107" x2="547" y2="135"/>
    </g>
    <g fill="#ffffff" opacity="0.32">
      <polygon points="285,107 305,107 277,135 264,135"/>
      <polygon points="365,107 400,107 365,135 330,135"/>
      <polygon points="465,107 500,107 465,135 430,135"/>
      <polygon points="550,107 585,107 555,135 520,135"/>
    </g>

    <!-- Left Bay Window -->
    <rect x="0" y="106" width="95" height="32" rx="2" fill="#d9cebd" stroke="#b19f87" stroke-width="2"/>
    <rect x="0" y="108" width="92" height="28" fill="url(#ehGlassGrad)"/>
    <g stroke="#ffffff" stroke-width="1.5" opacity="0.88">
      <line x1="0" y1="122" x2="92" y2="122"/>
      <line x1="30" y1="108" x2="30" y2="136"/>
      <line x1="62" y1="108" x2="62" y2="136"/>
    </g>
    <polygon points="25,108 50,108 22,136 0,136" fill="#ffffff" opacity="0.32"/>
    <polygon points="75,108 92,108 64,136 47,136" fill="#ffffff" opacity="0.32"/>

    <!-- Right Bay Window -->
    <rect x="755" y="106" width="95" height="32" rx="2" fill="#d9cebd" stroke="#b19f87" stroke-width="2"/>
    <rect x="758" y="108" width="92" height="28" fill="url(#ehGlassGrad)"/>
    <g stroke="#ffffff" stroke-width="1.5" opacity="0.88">
      <line x1="758" y1="122" x2="850" y2="122"/>
      <line x1="788" y1="108" x2="788" y2="136"/>
      <line x1="820" y1="108" x2="820" y2="136"/>
    </g>
    <polygon points="785,108 810,108 782,136 758,136" fill="#ffffff" opacity="0.32"/>
    <polygon points="835,108 850,108 832,136 817,136" fill="#ffffff" opacity="0.32"/>

    <!-- Lower Louver Accent Windows -->
    <g opacity="0.92">
      <rect x="0" y="195" width="80" height="15" rx="1.5" fill="#d9cebd" stroke="#b19f87" stroke-width="1.5"/>
      <rect x="0" y="197" width="77" height="11" fill="url(#ehGlassGrad)"/>
      <line x1="0" y1="202" x2="77" y2="202" stroke="#ffffff" stroke-width="1.2"/>
      <line x1="26" y1="197" x2="26" y2="208" stroke="#ffffff" stroke-width="1.2"/>
      <line x1="52" y1="197" x2="52" y2="208" stroke="#ffffff" stroke-width="1.2"/>
      <polygon points="20,197 34,197 23,208 9,208" fill="#ffffff" opacity="0.38"/>

      <rect x="765" y="195" width="85" height="15" rx="1.5" fill="#d9cebd" stroke="#b19f87" stroke-width="1.5"/>
      <rect x="768" y="197" width="82" height="11" fill="url(#ehGlassGrad)"/>
      <line x1="768" y1="202" x2="850" y2="202" stroke="#ffffff" stroke-width="1.2"/>
      <line x1="795" y1="197" x2="795" y2="208" stroke="#ffffff" stroke-width="1.2"/>
      <line x1="822" y1="197" x2="822" y2="208" stroke="#ffffff" stroke-width="1.2"/>
      <polygon points="785,197 799,197 788,208 774,208" fill="#ffffff" opacity="0.38"/>
    </g>
  </g>

  <!-- 4. Industrial Utility Conduits & Control Terminal -->
  <g id="ehConduits">
    <rect x="0" y="172" width="850" height="9" fill="#2d495e" stroke="#1c3140" stroke-width="1"/>
    <line x1="0" y1="173" x2="850" y2="173" stroke="#507c9b" stroke-width="1"/>

    <!-- Central Terminal Console / Distribution Junction Box -->
    <rect x="365" y="192" width="120" height="16" rx="2" fill="url(#ehConduitBlue)" stroke="#22394a" stroke-width="1.5"/>
    <rect x="370" y="195" width="110" height="10" rx="1" fill="#2d4a5e"/>
    <circle cx="378" cy="200" r="1.8" fill="#4ade80"/>
    <circle cx="386" cy="200" r="1.8" fill="#38bdf8"/>
    <circle cx="394" cy="200" r="1.8" fill="#facc15"/>
    <line x1="410" y1="198" x2="472" y2="198" stroke="#486f8a" stroke-width="1.2"/>
    <line x1="410" y1="202" x2="465" y2="202" stroke="#486f8a" stroke-width="1.2"/>

    <!-- Dual Conduit Pipe Routing -->
    <g stroke="url(#ehConduitBlue)" stroke-width="4.5" fill="none" stroke-linejoin="round" stroke-linecap="round">
      <path d="M365 196 H236 V252 H24"/>
      <path d="M365 204 H246 V244 H38"/>
      <path d="M485 196 H614 V252 H826"/>
      <path d="M485 204 H604 V244 H812"/>
    </g>
    <g stroke="#1d3140" stroke-width="1" fill="none" stroke-linejoin="round">
      <path d="M365 196 H236 V252 H24"/>
      <path d="M365 204 H246 V244 H38"/>
      <path d="M485 196 H614 V252 H826"/>
      <path d="M485 204 H604 V244 H812"/>
    </g>
  </g>

  <!-- 5. Volumetric Lighting & Pendant Lamps -->
  <g id="ehLighting">
    <polygon points="340,74 250,146 600,146 510,74" fill="url(#ehLampRay)"/>
    <polygon points="0,74 -25,146 160,146 90,74" fill="url(#ehLampRay)"/>
    <polygon points="760,74 690,146 875,146 850,74" fill="url(#ehLampRay)"/>

    <!-- Center Pendant Fixture -->
    <line x1="375" y1="32" x2="375" y2="68" stroke="#33241b" stroke-width="1.5"/>
    <line x1="475" y1="32" x2="475" y2="68" stroke="#33241b" stroke-width="1.5"/>
    <polygon points="340,74 510,74 496,68 354,68" fill="#443226" stroke="#2c1e16" stroke-width="1"/>
    <rect x="348" y="73" width="154" height="2.5" fill="#fff9ed"/>

    <!-- Left Pendant Fixture -->
    <line x1="30" y1="32" x2="30" y2="68" stroke="#33241b" stroke-width="1.5"/>
    <polygon points="0,74 90,74 80,68 0,68" fill="#443226" stroke="#2c1e16" stroke-width="1"/>
    <rect x="0" y="73" width="84" height="2.5" fill="#fff9ed"/>

    <!-- Right Pendant Fixture -->
    <line x1="820" y1="32" x2="820" y2="68" stroke="#33241b" stroke-width="1.5"/>
    <polygon points="760,74 850,74 850,68 770,68" fill="#443226" stroke="#2c1e16" stroke-width="1"/>
    <rect x="766" y="73" width="84" height="2.5" fill="#fff9ed"/>
  </g>

  <!-- 6. Upper Catwalk Mezzanine -->
  <g id="ehUpperCatwalk">
    <rect x="0" y="86" width="850" height="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="0" y1="78" x2="850" y2="78" stroke="#335066" stroke-width="2.5"/>
    <line x1="0" y1="82" x2="850" y2="82" stroke="#335066" stroke-width="2.5"/>
    <g stroke="#f8fafc" stroke-width="2.8" stroke-linecap="square">
      <line x1="12" y1="76" x2="12" y2="86"/>
      <line x1="68" y1="76" x2="68" y2="86"/>
      <line x1="124" y1="76" x2="124" y2="86"/>
      <line x1="210" y1="76" x2="210" y2="86"/>
      <line x1="266" y1="76" x2="266" y2="86"/>
      <line x1="322" y1="76" x2="322" y2="86"/>
      <line x1="378" y1="76" x2="378" y2="86"/>
      <line x1="434" y1="76" x2="434" y2="86"/>
      <line x1="490" y1="76" x2="490" y2="86"/>
      <line x1="546" y1="76" x2="546" y2="86"/>
      <line x1="602" y1="76" x2="602" y2="86"/>
      <line x1="640" y1="76" x2="640" y2="86"/>
      <line x1="726" y1="76" x2="726" y2="86"/>
      <line x1="782" y1="76" x2="782" y2="86"/>
      <line x1="838" y1="76" x2="838" y2="86"/>
    </g>
  </g>

  <!-- 7. Main Lower Catwalk Mezzanine -->
  <g id="ehLowerCatwalk">
    <rect x="0" y="150" width="850" height="9" fill="url(#ehBeamGrad)" stroke="#9a7c61" stroke-width="1.2"/>
    <rect x="0" y="146" width="850" height="5" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="0" y1="138" x2="850" y2="138" stroke="#335066" stroke-width="2.5"/>
    <line x1="0" y1="142" x2="850" y2="142" stroke="#335066" stroke-width="2.5"/>
    <g stroke="#f8fafc" stroke-width="2.8" stroke-linecap="square">
      <line x1="12" y1="136" x2="12" y2="147"/>
      <line x1="68" y1="136" x2="68" y2="147"/>
      <line x1="124" y1="136" x2="124" y2="147"/>
      <line x1="210" y1="136" x2="210" y2="147"/>
      <line x1="266" y1="136" x2="266" y2="147"/>
      <line x1="322" y1="136" x2="322" y2="147"/>
      <line x1="378" y1="136" x2="378" y2="147"/>
      <line x1="434" y1="136" x2="434" y2="147"/>
      <line x1="490" y1="136" x2="490" y2="147"/>
      <line x1="546" y1="136" x2="546" y2="147"/>
      <line x1="602" y1="136" x2="602" y2="147"/>
      <line x1="640" y1="136" x2="640" y2="147"/>
      <line x1="726" y1="136" x2="726" y2="147"/>
      <line x1="782" y1="136" x2="782" y2="147"/>
      <line x1="838" y1="136" x2="838" y2="147"/>
    </g>
  </g>

  <!-- 8. Major Architectural Vertical Columns -->
  <g id="ehColumns">
    <!-- Left Pillar (x=146 to 192) -->
    <rect x="146" y="32" width="46" height="206" fill="url(#ehColumnGrad)"/>
    <line x1="146" y1="32" x2="146" y2="238" stroke="#9e7756" stroke-width="1.5"/>
    <line x1="192" y1="32" x2="192" y2="238" stroke="#855f40" stroke-width="2"/>
    <line x1="156" y1="32" x2="156" y2="238" stroke="#ffffff" stroke-width="1" opacity="0.35"/>
    <rect x="142" y="85" width="54" height="8" rx="1.5" fill="#ab8768" stroke="#7e5d42" stroke-width="1"/>
    <rect x="142" y="145" width="54" height="14" rx="1.5" fill="#ab8768" stroke="#7e5d42" stroke-width="1"/>
    <rect x="140" y="230" width="58" height="8" rx="2" fill="#75563c"/>

    <!-- Right Pillar (x=658 to 704) -->
    <rect x="658" y="32" width="46" height="206" fill="url(#ehColumnGrad)"/>
    <line x1="658" y1="32" x2="658" y2="238" stroke="#9e7756" stroke-width="1.5"/>
    <line x1="704" y1="32" x2="704" y2="238" stroke="#855f40" stroke-width="2"/>
    <line x1="668" y1="32" x2="668" y2="238" stroke="#ffffff" stroke-width="1" opacity="0.35"/>
    <rect x="654" y="85" width="54" height="8" rx="1.5" fill="#ab8768" stroke="#7e5d42" stroke-width="1"/>
    <rect x="654" y="145" width="54" height="14" rx="1.5" fill="#ab8768" stroke="#7e5d42" stroke-width="1"/>
    <rect x="652" y="230" width="58" height="8" rx="2" fill="#75563c"/>
  </g>

  <!-- 9. Ground Floor, Access Dock Door & Safety Lines -->
  <g id="ehFloor">
    <rect x="0" y="226" width="850" height="12" fill="#9e7552" stroke="#785334" stroke-width="1"/>
    <rect x="0" y="238" width="850" height="62" fill="url(#ehFloorGrad)"/>
    <rect x="0" y="238" width="850" height="62" fill="url(#ehFloorSheen)"/>

    <!-- Safety Yellow Perimeter Line -->
    <line x1="0" y1="240" x2="850" y2="240" stroke="#fbbf24" stroke-width="3" opacity="0.9"/>
    <!-- Center Staging Boundary Box -->
    <rect x="290" y="248" width="270" height="52" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.85"/>

    <!-- Center Loading Bay Shutter Door -->
    <g id="ehBayDoor">
      <rect x="360" y="180" width="130" height="58" rx="2" fill="url(#ehDoorRollup)" stroke="#1e293b" stroke-width="2"/>
      <line x1="360" y1="187" x2="490" y2="187" stroke="#64748b" stroke-width="1"/>
      <line x1="360" y1="194" x2="490" y2="194" stroke="#64748b" stroke-width="1"/>
      <line x1="360" y1="201" x2="490" y2="201" stroke="#64748b" stroke-width="1"/>
      <line x1="360" y1="208" x2="490" y2="208" stroke="#64748b" stroke-width="1"/>
      <line x1="360" y1="215" x2="490" y2="215" stroke="#64748b" stroke-width="1"/>
      <line x1="360" y1="222" x2="490" y2="222" stroke="#64748b" stroke-width="1"/>
      <line x1="360" y1="229" x2="490" y2="229" stroke="#64748b" stroke-width="1"/>
      <!-- Hazard Header -->
      <rect x="358" y="177" width="134" height="4" fill="#f59e0b"/>
      <path d="M362 177l4 4h4l-4-4z M374 177l4 4h4l-4-4z M386 177l4 4h4l-4-4z M398 177l4 4h4l-4-4z M410 177l4 4h4l-4-4z M422 177l4 4h4l-4-4z M434 177l4 4h4l-4-4z M446 177l4 4h4l-4-4z M458 177l4 4h4l-4-4z M470 177l4 4h4l-4-4z M482 177l4 4h4l-4-4z" fill="#0f172a"/>
      <!-- Bay Number Sign -->
      <rect x="410" y="166" width="30" height="10" rx="2" fill="#0f172a" stroke="#475569" stroke-width="1"/>
      <text x="425" y="174" font-family="system-ui, sans-serif" font-size="7" font-weight="700" fill="#38bdf8" text-anchor="middle">BAY 02</text>
    </g>
  </g>

  <!-- 10. Staged Pallets, Freight & Electric Pallet Truck -->
  <g id="ehCargo">
    <!-- Left Staging Area -->
    <g id="leftCargo" transform="translate(48, 235)">
      <rect x="0" y="34" width="74" height="4" fill="#854d0e"/>
      <rect x="3" y="38" width="10" height="5" fill="#713f12"/>
      <rect x="32" y="38" width="10" height="5" fill="#713f12"/>
      <rect x="61" y="38" width="10" height="5" fill="#713f12"/>
      <rect x="0" y="43" width="74" height="3" fill="#854d0e"/>
      <rect x="4" y="12" width="66" height="22" rx="1.5" fill="#dfad78" stroke="#b5824e" stroke-width="1"/>
      <line x1="37" y1="12" x2="37" y2="34" stroke="#9a6939" stroke-width="1"/>
      <line x1="4" y1="20" x2="70" y2="20" stroke="#fcd34d" stroke-width="2.5" opacity="0.8"/>
      <rect x="12" y="16" width="14" height="10" rx="0.5" fill="#ffffff"/>
      <line x1="14" y1="19" x2="23" y2="19" stroke="#1e293b" stroke-width="0.8"/>
      <line x1="14" y1="22" x2="21" y2="22" stroke="#1e293b" stroke-width="0.8"/>
      <rect x="16" y="-3" width="42" height="15" rx="1.5" fill="#cca06c" stroke="#a47543" stroke-width="1"/>
      <line x1="16" y1="4" x2="58" y2="4" stroke="#fcd34d" stroke-width="2" opacity="0.8"/>
      <rect x="42" y="0" width="11" height="8" rx="0.5" fill="#ffffff"/>
    </g>

    <!-- Right Staging Area -->
    <g id="rightCargo" transform="translate(712, 236)">
      <rect x="0" y="34" width="80" height="4" fill="#854d0e"/>
      <rect x="4" y="38" width="10" height="5" fill="#713f12"/>
      <rect x="35" y="38" width="10" height="5" fill="#713f12"/>
      <rect x="66" y="38" width="10" height="5" fill="#713f12"/>
      <rect x="0" y="43" width="80" height="3" fill="#854d0e"/>
      <rect x="4" y="10" width="40" height="24" rx="1.5" fill="#3b637d" stroke="#254357" stroke-width="1"/>
      <rect x="7" y="13" width="34" height="18" fill="#2d4f66"/>
      <line x1="7" y1="13" x2="41" y2="31" stroke="#487491" stroke-width="1.2"/>
      <line x1="7" y1="31" x2="41" y2="13" stroke="#487491" stroke-width="1.2"/>
      <rect x="46" y="6" width="30" height="28" rx="1.5" fill="#d9aa74" stroke="#ad7d49" stroke-width="1"/>
      <line x1="46" y1="18" x2="76" y2="18" stroke="#fcd34d" stroke-width="2" opacity="0.85"/>
      <rect x="52" y="10" width="10" height="6" rx="0.5" fill="#ffffff"/>
      <rect x="12" y="-6" width="28" height="16" rx="1.5" fill="#dfad78" stroke="#b5824e" stroke-width="1"/>
    </g>

    <!-- Electric Pallet Truck -->
    <g id="palletTruck" transform="translate(530, 252)">
      <circle cx="12" cy="34" r="5" fill="#1e293b"/>
      <circle cx="12" cy="34" r="2.5" fill="#64748b"/>
      <circle cx="68" cy="35" r="3.5" fill="#1e293b"/>
      <circle cx="82" cy="35" r="3.5" fill="#1e293b"/>
      <rect x="22" y="30" width="66" height="5" rx="1.5" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
      <rect x="4" y="16" width="22" height="18" rx="3" fill="#1663c7" stroke="#0f468f" stroke-width="1"/>
      <rect x="6" y="18" width="8" height="10" rx="1" fill="#0f2b54"/>
      <circle cx="10" cy="23" r="1.5" fill="#38bdf8"/>
      <path d="M12 16 L2 0 H-4" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="-7" y="-3" width="6" height="6" rx="1.5" fill="#ea580c"/>
    </g>
  </g>

  <!-- 11. Subtle Boundary Frame -->
  <rect width="850" height="300" fill="none" stroke="#2a1f18" stroke-width="1" opacity="0.3"/>
</svg>`;

function isEastHubContext(warehouseName = '', warehouseCode = ''): boolean {
  const normName = String(warehouseName || '').trim().toLowerCase();
  const normCode = String(warehouseCode || '').trim().toUpperCase();

  return (
    normName === 'east hub warehouse' ||
    normName.includes('east hub') ||
    normName.includes('east distribution') ||
    normCode === 'WH-EAST' ||
    normCode.includes('EAST')
  );
}

function renderWarehouseBackdrop(warehouseName = '', warehouseCode = ''): string {
  if (isEastHubContext(warehouseName, warehouseCode)) {
    return `<div class="warehouse-art-wrapper warehouse-art-vector warehouse-art-easthub">${eastHubSvg}</div>`;
  }
  return `<div class="warehouse-art-wrapper warehouse-art-vector">${warehouseSvg}</div>`;
}

const statCard = (type: IconName, label: string, value: string, meta: string, tone: string) => `
  <article class="stat-card ${tone}">
    <span class="stat-icon">${icon(type)}</span>
    <div><small>${label}</small><b>${value}</b><p>${meta}</p></div>
  </article>`;

const locationZone = (location: any, index = 0) => {
  const percent = Number(location.maximumCapacity) > 0
    ? Math.round(Number(location.currentUsage) / Number(location.maximumCapacity) * 100)
    : 0;
  const tone = capacityTone(percent);
  return `<button class="location-zone location-${index + 1} ${tone}" data-location-id="${location.id}" data-location-code="${esc(location.code)}" style="--util:${percent}%" aria-label="Open ${esc(location.name)} details">
    <div class="location-zone-indicator">
      <span class="loc-name" title="${esc(location.name)}"><span class="loc-name-icon">⌖</span>${esc(location.name)}</span>
      <span class="loc-code">${esc(location.code)}</span>
    </div>
    <div class="location-zone-mid">
      <span class="location-percent">${percent}%</span>
      <small>USED</small>
    </div>
    <span class="location-progress"><i style="width:${Math.min(100, Math.max(0, percent))}%"></i></span>
    <span class="location-counts">
      <b>${location.skuCount ?? 0} SKUs</b>
      <b>${Number(location.currentUsage ?? 0).toLocaleString()} units</b>
    </span>
    <span class="location-tooltip">
      <strong>${esc(location.name)} (${esc(location.code)})</strong>
      <b>${percent}% utilized</b>
      <span>${Number(location.currentUsage ?? 0).toLocaleString()} / ${Number(location.maximumCapacity ?? 0).toLocaleString()} units</span>
      <span>${location.skuCount ?? 0} SKUs · ${location.lowStockCount ?? 0} low stock</span>
    </span>
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
        <button class="icon-button notification" id="notificationButton" aria-label="Notifications">${icon('bell')}<span hidden></span></button>
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
              <div class="warehouse-title"><span id="warehouseCardTitle">Main Warehouse</span></div>
              <button class="widget-config-btn" id="configureWarehouseSlots" type="button" title="Configure pinned location slots">⚙ Pin Slots</button>
              <div id="warehouseBackdrop" class="warehouse-backdrop-container">${renderWarehouseBackdrop('Main Warehouse', 'MAIN')}</div>
              <div class="warehouse-summary" aria-live="polite"><span><b>0%</b><small>Overall capacity</small></span><i></i><span><b>0</b><small>Occupied units</small></span><i></i><span><b>0</b><small>Total capacity</small></span><i></i><span><b>0</b><small>Locations</small></span></div>
              <div class="utilization-overlay" id="warehouseOverlay"></div>
              <div class="capacity-legend"><span><i class="healthy"></i>Healthy</span><span><i class="full"></i>Getting full</span><span><i class="high"></i>High</span><span><i class="critical"></i>Critical</span></div>
              <div class="mobile-capacity-list" id="mobileCapacityList"><div class="mobile-overall"><span>Warehouse Capacity</span><b>0%</b><small>0 of 0 units occupied</small></div></div>
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
  <aside class="drawer" id="addDrawer" aria-hidden="true"><div class="drawer-head"><div><small>Quick Inventory</small><h2>Add new item</h2></div><button id="closeDrawer" type="button" aria-label="Close drawer">${icon('close')}</button></div><form id="addForm"><div class="drawer-row-grid"><label class="drawer-field-label"><span>Item name <strong class="req">*</strong></span><input name="name" required placeholder="e.g. Cordless screwdriver"></label><label class="drawer-field-label"><span>SKU <strong class="req">*</strong></span><input name="sku" required placeholder="TL-000-000" style="text-transform:uppercase"></label></div><div class="drawer-row-grid"><label class="drawer-field-label"><span>Category <strong class="req">*</strong></span><select name="categoryId" required><option value="">Loading categories…</option></select></label><label class="drawer-field-label"><span>Initial stock</span><input name="quantity" type="number" min="0" value="0"></label></div><div class="drawer-row-grid"><label class="drawer-field-label"><span>Unit cost (PHP ₱)</span><input name="unitCost" type="number" min="0" step=".01" value="0" placeholder="0.00" aria-label="Unit cost in Philippine pesos"></label><label class="drawer-field-label"><span>Reorder level</span><input name="reorderLevel" type="number" min="0" value="10"></label></div><div class="stepped-location-card drawer-location-card"><div class="drawer-card-header"><span class="drawer-card-title">📍 Location Hierarchy</span><span class="drawer-card-subtitle">Cascading assignment</span></div><div class="drawer-stepped-grid"><div class="stepped-field tier-warehouse-step"><div class="stepped-field-header"><span class="stepped-field-title">1. Facility</span><span class="tier-pill-badge tier-badge-warehouse">Facility</span></div><select name="warehouseId" id="quickAddWarehouse" required><option value="">Loading facilities…</option></select></div><div class="stepped-field tier-zone-step"><div class="stepped-field-header"><span class="stepped-field-title">2. Zone / Aisle</span><span class="tier-pill-badge tier-badge-zone">Zone</span></div><select name="sectionId" id="quickAddZone" required disabled><option value="">Select Warehouse…</option></select></div></div><div class="stepped-field tier-slot-step"><div class="stepped-field-header"><span class="stepped-field-title">3. Target Storage Location</span><span class="tier-pill-badge tier-badge-slot">Pick Point</span></div><select name="locationId" id="quickAddLocation" required disabled><option value="">Select Zone first…</option></select></div><div id="quickAddBreadcrumb" class="drawer-breadcrumb-bar"></div><div id="quickAddCapacityPill" class="drawer-capacity-pill" hidden></div></div><label class="drawer-field-label drawer-remarks-field"><span>Optional remarks / specifications <small>(handling notes, serials, storage guidelines)</small></span><textarea name="description" placeholder="Enter any item details, handling instructions, dimensions, serial numbers, or operational remarks..."></textarea></label><div class="drawer-actions"><button type="button" id="cancelDrawer">Cancel</button><button class="save" type="submit" id="quickAddSubmit">Save item</button></div></form></aside>
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
document.querySelector('#quickAdd')?.addEventListener('click', async () => { drawer.classList.add('open'); scrim.classList.add('show'); drawer.setAttribute('aria-hidden','false');try{const [categories,locations]:any[]=await Promise.all([apiRequest('/categories'),apiRequest('/locations')]);const categorySelect=drawer.querySelector<HTMLSelectElement>('[name="categoryId"]')!;categorySelect.innerHTML=categories.map((entry:any)=>`<option value="${entry.id}">${entry.name}</option>`).join('');const hierarchy=buildLocationHierarchy(locations);setupCascadingLocationChain({hierarchy,warehouseSelect:drawer.querySelector<HTMLSelectElement>('#quickAddWarehouse')!,zoneSelect:drawer.querySelector<HTMLSelectElement>('#quickAddZone')!,locationSelect:drawer.querySelector<HTMLSelectElement>('#quickAddLocation')!,breadcrumbContainer:drawer.querySelector<HTMLElement>('#quickAddBreadcrumb'),pillContainer:drawer.querySelector<HTMLElement>('#quickAddCapacityPill'),quantityInput:drawer.querySelector<HTMLInputElement>('[name="quantity"]'),submitButton:drawer.querySelector<HTMLButtonElement>('#quickAddSubmit')});}catch(error){closePanels();showError(error instanceof Error?error.message:'Form options could not be loaded.');} });
document.querySelector('#closeDrawer')?.addEventListener('click', closePanels);
document.querySelector('#cancelDrawer')?.addEventListener('click', closePanels);
scrim.addEventListener('click', closePanels);

document.querySelector('#themeButton')?.addEventListener('click', () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('stockhub-theme', dark ? 'dark' : 'light');
});
if (localStorage.getItem('stockhub-theme') === 'dark') document.documentElement.classList.add('dark');

const pageDescriptions: Record<string, string> = {
  'Dashboard': 'Overview of your inventory and warehouse',
  'Inventory': 'Manage items, stock levels, and warehouse assignments',
  'Stock Tracking': 'Complete audit trail of inventory quantity changes',
  'Categories': 'Organize inventory using reusable categories',
  'Locations': 'Monitor capacity and utilization across physical storage locations',
  'Plans': 'Weekly operational targets, managerial objectives, and daily floor activity logs',
  'Reports': 'Live inventory valuation and category breakdown',
  'Settings': 'Account, session, and system configuration'
};

document.querySelectorAll<HTMLElement>('.nav-item').forEach(el => el.addEventListener('click', async () => {
  const label=el.dataset.label!;document.body.classList.toggle('categories-active',label==='Categories');document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));el.classList.add('active');
  document.querySelector('.page-title h1')!.textContent=label;
  const pageSubtitle=document.querySelector<HTMLElement>('.page-title p');
  if(pageSubtitle)pageSubtitle.textContent=pageDescriptions[label]??'';
  const dashboard=document.querySelector<HTMLElement>('#dashboardPage')!;const module=document.querySelector<HTMLElement>('#modulePage')!;
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

const renderLocationDetails = (location: any) => {
  const currentUsage = Number(location.currentUsage ?? 0);
  const maximumCapacity = Number(location.maximumCapacity ?? 0);
  const percent = utilization(currentUsage, maximumCapacity);
  const tone = capacityTone(percent);
  const sublocations = Array.isArray(location.sublocations) ? location.sublocations : [];
  const items = Array.isArray(location.items) ? location.items : [];
  const typeLabel = location.locationType === 'WAREHOUSE' ? 'Warehouse facility' : location.locationType === 'SECTION' ? 'Storage section' : 'Storage slot';
  const tierBadge = location.locationType === 'WAREHOUSE' 
    ? '<span class="tier-pill-badge tier-badge-warehouse">Facility</span>' 
    : location.locationType === 'SECTION' 
    ? '<span class="tier-pill-badge tier-badge-zone">Zone / Aisle</span>' 
    : '<span class="tier-pill-badge tier-badge-slot">Pick Point</span>';

  document.querySelector('#locationDrawerContent')!.innerHTML = `
    <div class="drawer-head"><div><div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;"><small>${typeLabel}</small>${tierBadge}</div><h2>${esc(location.name)}</h2></div><button class="close-location">${icon('close')}</button></div>
    <div class="location-detail-body">
      <div class="location-code"><span>${esc(location.code)}</span><div><b>Location Code</b><small>${esc(location.parentName ?? 'Main Warehouse')} · Active</small></div></div>
      <section class="detail-capacity ${tone}" style="--util:${percent}%"><div><span>Utilization</span><strong>${percent}%</strong></div><div class="detail-progress"><i></i></div><small>${currentUsage.toLocaleString()} of ${maximumCapacity.toLocaleString()} units occupied</small></section>
      <div class="detail-stats"><span><b>${Number(location.skuCount ?? 0).toLocaleString()}</b><small>Total SKUs</small></span><span><b>${currentUsage.toLocaleString()}</b><small>Total Units</small></span><span><b>${Number(location.lowStockCount ?? 0).toLocaleString()}</b><small>Low Stock</small></span><span><b>${Number(location.outOfStockCount ?? 0).toLocaleString()}</b><small>Out of Stock</small></span></div>
      ${sublocations.length ? `<section class="sublocations"><div class="detail-heading"><h3>Sublocations</h3><small>Capacity utilization</small></div><div class="sublocation-grid">${sublocations.map((sub: any) => { const subPercent = utilization(Number(sub.currentUsage ?? 0), Number(sub.maximumCapacity ?? 0)); return `<div class="sublocation ${capacityTone(subPercent)}" style="--util:${subPercent}%"><span><b>${esc(sub.code)}</b><strong>${subPercent}%</strong></span><i><em></em></i><small>${Number(sub.currentUsage ?? 0).toLocaleString()} / ${Number(sub.maximumCapacity ?? 0).toLocaleString()} units</small></div>`; }).join('')}</div></section>` : ''}
      <section class="location-items"><div class="detail-heading"><h3>Items in this location</h3><small>Showing ${items.length} items</small></div>${items.length ? items.slice(0,5).map((item: any) => `<div class="location-item"><span class="mini-box">${icon('box')}</span><div><b>${esc(item.name)}</b><small>${esc(item.code)} · ${Number(item.units).toLocaleString()} units</small></div><span class="pill ${item.status === 'Low Stock' ? 'orange' : 'green'}">${esc(item.status)}</span></div>`).join('') : '<p style="color:var(--muted);font-size:11px;padding:12px 0;">No active items currently stored in this location.</p>'}${items.length ? `<button class="view-location-items" data-code="${esc(location.code)}">View all items ${icon('arrow')}</button>` : ''}</section>
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

window.addEventListener('stockhub:view-location', async event => {
  const id = Number((event as CustomEvent<{id:number}>).detail?.id);
  if (!id) return;
  try {
    const live: any = await apiRequest(`/locations/${id}`);
    renderLocationDetails({
      ...live,
      currentUsage: Number(live.currentUsage ?? 0),
      maximumCapacity: Number(live.maximumCapacity ?? 0),
      skuCount: Number(live.skuCount ?? 0),
      lowStockCount: Number(live.lowStockCount ?? 0),
      outOfStockCount: Number(live.outOfStockCount ?? 0),
      sublocations: live.sublocations ?? [],
      items: live.items ?? []
    });
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Location details could not be loaded.');
  }
});

function applyWarehouseData(data: DashboardWarehouse): void {
  const title = document.querySelector<HTMLElement>('#warehouseCardTitle');
  if (title) title.textContent = data.name;

  const backdrop = document.querySelector<HTMLElement>('#warehouseBackdrop');
  if (backdrop) {
    backdrop.innerHTML = renderWarehouseBackdrop(data.name, data.code);
  }

  const card = document.querySelector<HTMLElement>('.warehouse-card');
  if (card) {
    const isEast = isEastHubContext(data.name, data.code);
    card.classList.toggle('has-image-backdrop', false);
    card.classList.toggle('is-easthub-context', isEast);
  }

  const summaryValues = document.querySelectorAll<HTMLElement>('.warehouse-summary span b');
  const summary = [data.utilizationPercentage, data.currentUsage, data.maximumCapacity, data.locationCount];
  summaryValues.forEach((element, index) => element.textContent = index === 0 ? `${Math.round(summary[index] ?? 0)}%` : Number(summary[index] ?? 0).toLocaleString());

  const overlay = document.querySelector<HTMLElement>('#warehouseOverlay');
  if (overlay) {
    overlay.className = 'utilization-overlay' + (data.locations.length > 4 ? ' layout-multi' : '');
    overlay.innerHTML = data.locations.length
      ? data.locations.map((loc, idx) => locationZone(loc, idx)).join('')
      : '<div style="color:var(--muted);font-size:12px;background:rgba(255,255,255,.94);padding:14px 20px;border-radius:9px;border:1px dashed var(--line);pointer-events:auto;box-shadow:0 4px 12px rgba(0,0,0,.08);text-align:center;">No locations pinned to this widget.<br><button type="button" id="btnOverlayPinSlots" style="margin-top:8px;font-size:11px;padding:4px 10px;border-radius:6px;background:#1663c7;color:#fff;border:0;cursor:pointer;font-weight:700;">⚙ Configure Pinned Slots</button></div>';
    overlay.querySelectorAll<HTMLElement>('[data-location-id]').forEach(zone => {
      zone.onclick = () => window.dispatchEvent(new CustomEvent('stockhub:view-location', { detail: { id: Number(zone.dataset.locationId) } }));
    });
    overlay.querySelector('#btnOverlayPinSlots')?.addEventListener('click', openSlotConfigModal);
  }

  const mobileList = document.querySelector<HTMLElement>('#mobileCapacityList');
  if (mobileList) {
    mobileList.innerHTML = `<div class="mobile-overall"><span>Warehouse Capacity</span><b>${Math.round(data.utilizationPercentage)}%</b><small>${data.currentUsage.toLocaleString()} of ${data.maximumCapacity.toLocaleString()} units occupied</small></div>` +
      data.locations.map(location => {
        const percent = Math.round(location.utilizationPercentage ?? utilization(location.currentUsage, location.maximumCapacity));
        return `<button class="mobile-location ${capacityTone(percent)}" data-location-id="${location.id}" data-location-code="${esc(location.code)}" style="--util:${percent}%"><span><b>${esc(location.name)}</b><small>${location.skuCount} SKUs · ${location.currentUsage} units</small></span><strong>${percent}%</strong><i><em></em></i>${icon('chevron')}</button>`;
      }).join('');
    mobileList.querySelectorAll<HTMLElement>('[data-location-id]').forEach(btn => {
      btn.onclick = () => window.dispatchEvent(new CustomEvent('stockhub:view-location', { detail: { id: Number(btn.dataset.locationId) } }));
    });
  }

  const summaryRows = document.querySelector<HTMLElement>('#warehouseSummaryRows');
  if (summaryRows) summaryRows.innerHTML = data.locations.length ? data.locations.map(location => {
    const percent = Math.round(location.utilizationPercentage);
    const remaining = Number(location.maximumCapacity) - Number(location.currentUsage);
    const status = percent > 100 ? 'Over Capacity' : percent >= 85 ? 'Near Capacity' : percent >= 70 ? 'Monitor' : 'Healthy';
    const tone = percent > 100 ? 'red' : percent >= 85 ? 'orange' : 'green';
    return `<tr><td><b>${esc(location.name)}</b><small>${esc(location.code)}</small></td><td>${Number(location.skuCount).toLocaleString()}</td><td>${Number(location.currentUsage).toLocaleString()}</td><td>${Number(location.maximumCapacity).toLocaleString()} units</td><td><b>${percent}%</b><div class="progress"><i class="${tone === 'green' ? 'green' : 'orange'}" style="width:${Math.min(100, Math.max(0, percent))}%"></i></div></td><td>${Number(location.lowStockCount).toLocaleString()}</td><td>${Number(location.outOfStockCount).toLocaleString()}</td><td><span class="pill ${tone}">${status}</span><small>${remaining >= 0 ? `${remaining.toLocaleString()} units available` : `${Math.abs(remaining).toLocaleString()} units over`}</small></td></tr>`;
  }).join('') : `<tr><td colspan="8">No active locations pinned for this warehouse. Click ⚙ Pin Slots above to configure.</td></tr>`;

  document.querySelector('.warehouse-card')?.classList.remove('is-loading', 'has-data-error');
}

async function loadWarehouseDashboard(): Promise<void> {
  const card = document.querySelector<HTMLElement>('.warehouse-card');
  card?.classList.add('is-loading'); card?.setAttribute('aria-busy', 'true');
  try {
    const slotIds = getStoredPinnedSlotIds(activeWarehouseId);
    const data = await dashboardApi.getWarehouse(activeWarehouseId, slotIds);
    applyWarehouseData(data);
  }
  catch {
    card?.classList.add('has-data-error');
    const overlay = document.querySelector<HTMLElement>('#warehouseOverlay');
    if (overlay) overlay.innerHTML = '<div style="color:var(--muted);font-size:12px;background:rgba(255,255,255,.94);padding:14px 20px;border-radius:9px;border:1px solid var(--line);pointer-events:auto;">Warehouse utilization data is temporarily unavailable.</div>';
  }
  finally {
    card?.classList.remove('is-loading'); card?.setAttribute('aria-busy', 'false');
  }
}

async function openSlotConfigModal(): Promise<void> {
  let allLocations: any[] = [];
  try {
    allLocations = await apiRequest('/locations');
  } catch (err) {
    showError('Could not load locations for widget configuration.');
    return;
  }

  const warehouses = allLocations.filter((l: any) => l.locationType === 'WAREHOUSE');
  const targetWh = warehouses.find((w: any) => w.id === activeWarehouseId) || warehouses[0];
  const whId = targetWh ? targetWh.id : (activeWarehouseId || 1);

  const storedIds = getStoredPinnedSlotIds(whId);
  const selectedIds = new Set<number>(storedIds ?? []);

  const whSections = allLocations.filter((l: any) =>
    l.locationType === 'SECTION' && (whId === undefined || l.parentLocationId === whId)
  );
  const secIds = new Set(whSections.map(s => s.id));
  const whSlots = allLocations.filter((l: any) =>
    (l.locationType === 'SLOT' || l.locationType === 'STORAGE') &&
    (secIds.has(l.parentLocationId) || l.parentLocationId === whId)
  );

  const sectionSlotsMap = new Map<number, any[]>();
  whSections.forEach(sec => sectionSlotsMap.set(sec.id, []));
  whSlots.forEach(slot => {
    if (sectionSlotsMap.has(slot.parentLocationId)) {
      sectionSlotsMap.get(slot.parentLocationId)!.push(slot);
    }
  });

  const overlay = document.createElement('div');
  overlay.className = 'slot-config-overlay';
  overlay.innerHTML = `
    <section class="slot-config-dialog" role="dialog" aria-modal="true">
      <div class="slot-config-header">
        <div>
          <h2>Configure Warehouse Monitoring Slots</h2>
          <p>Choose up to 6 locations or sub-locations to pin to your Dashboard widget for real-time tracking.</p>
        </div>
        <button class="app-dialog-close" type="button" aria-label="Close">×</button>
      </div>

      <div class="slot-config-controls">
        <input type="search" class="slot-search-input" placeholder="Search sections and slots by name or code...">
        <span class="slot-count-badge">Pinned: <b id="slotCountDisplay">${selectedIds.size}</b> / 6</span>
      </div>

      <div class="slot-tree-container" id="slotTreeContainer"></div>

      <div class="slot-config-footer">
        <button type="button" class="btn-reset">Reset to Default</button>
        <div class="footer-actions">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="button" class="btn-save">Save Configuration</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);

  const closeDialog = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('.app-dialog-close')?.addEventListener('click', closeDialog);
  overlay.querySelector('.btn-cancel')?.addEventListener('click', closeDialog);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });

  const treeContainer = overlay.querySelector<HTMLElement>('#slotTreeContainer')!;
  const countDisplay = overlay.querySelector<HTMLElement>('#slotCountDisplay')!;
  const searchInput = overlay.querySelector<HTMLInputElement>('.slot-search-input')!;

  const updateCount = () => {
    countDisplay.textContent = String(selectedIds.size);
  };

  const renderTree = (filterQuery = '') => {
    const q = filterQuery.trim().toLowerCase();
    let html = '';

    whSections.forEach(sec => {
      const slots = sectionSlotsMap.get(sec.id) ?? [];
      const secMatches = !q || sec.name.toLowerCase().includes(q) || sec.code.toLowerCase().includes(q);
      const matchingSlots = slots.filter(slot => !q || slot.name.toLowerCase().includes(q) || slot.code.toLowerCase().includes(q));

      if (!secMatches && matchingSlots.length === 0) return;

      const secPct = utilization(sec.currentUsage, sec.maximumCapacity);
      const secTone = capacityTone(secPct);

      html += `<div class="slot-group-header">Section: ${esc(sec.name)} (${esc(sec.code)})</div>`;

      const isSecSelected = selectedIds.has(sec.id);
      html += `
        <label class="slot-check-item ${isSecSelected ? 'selected' : ''}" data-item-id="${sec.id}">
          <div class="slot-check-main">
            <input type="checkbox" data-id="${sec.id}" ${isSecSelected ? 'checked' : ''}>
            <div class="slot-check-info">
              <b>${esc(sec.name)}</b>
              <code>${esc(sec.code)}</code>
            </div>
          </div>
          <div class="slot-check-meta">
            <small>${Number(sec.currentUsage).toLocaleString()} / ${Number(sec.maximumCapacity).toLocaleString()} units</small>
            <span class="slot-check-chip ${secTone}">${secPct}%</span>
          </div>
        </label>
      `;

      const slotsToDisplay = q ? matchingSlots : slots;
      slotsToDisplay.forEach(slot => {
        const slotPct = utilization(slot.currentUsage, slot.maximumCapacity);
        const slotTone = capacityTone(slotPct);
        const isSlotSelected = selectedIds.has(slot.id);
        html += `
          <label class="slot-check-item slot-check-sub ${isSlotSelected ? 'selected' : ''}" data-item-id="${slot.id}">
            <div class="slot-check-main">
              <span style="color:#7b93b2;font-weight:700;">↳</span>
              <input type="checkbox" data-id="${slot.id}" ${isSlotSelected ? 'checked' : ''}>
              <div class="slot-check-info">
                <b>${esc(slot.name)}</b>
                <code>${esc(slot.code)}</code>
              </div>
            </div>
            <div class="slot-check-meta">
              <small>${Number(slot.currentUsage).toLocaleString()} / ${Number(slot.maximumCapacity).toLocaleString()} units</small>
              <span class="slot-check-chip ${slotTone}">${slotPct}%</span>
            </div>
          </label>
        `;
      });
    });

    if (!html) html = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:12px;">No locations match "${esc(filterQuery)}".</div>`;
    treeContainer.innerHTML = html;

    treeContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(cb => {
      cb.onchange = () => {
        const id = Number(cb.dataset.id);
        const itemLabel = cb.closest('.slot-check-item');
        if (cb.checked) {
          if (selectedIds.size >= 6) {
            cb.checked = false;
            showError('You can pin a maximum of 6 locations to the widget.');
            return;
          }
          selectedIds.add(id);
          itemLabel?.classList.add('selected');
        } else {
          selectedIds.delete(id);
          itemLabel?.classList.remove('selected');
        }
        updateCount();
      };
    });
  };

  renderTree();
  searchInput.oninput = () => renderTree(searchInput.value);

  overlay.querySelector('.btn-reset')?.addEventListener('click', () => {
    selectedIds.clear();
    setStoredPinnedSlotIds(whId, undefined);
    closeDialog();
    loadWarehouseDashboard();
    document.querySelector('#toastText')!.textContent = 'Widget reset to default warehouse sections.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  });

  overlay.querySelector('.btn-save')?.addEventListener('click', () => {
    const ids = Array.from(selectedIds);
    setStoredPinnedSlotIds(whId, ids.length > 0 ? ids : undefined);
    closeDialog();
    loadWarehouseDashboard();
    document.querySelector('#toastText')!.textContent = ids.length > 0
      ? `Widget pinned slots updated (${ids.length} locations).`
      : 'Widget reset to default sections.';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  });

  requestAnimationFrame(() => {
    overlay.classList.add('show');
    searchInput.focus();
  });
}

const openModule=(label:string)=>document.querySelector<HTMLButtonElement>(`.nav-item[data-label="${label}"]`)?.click();
async function hydrateDashboard():Promise<void>{
  try{
    const [summary,alerts,transactions,locations]:any[]=await Promise.all([
      apiRequest('/reports/inventory-summary'),apiRequest('/alerts'),apiRequest('/transactions?limit=5'),apiRequest('/locations')
    ]);
    const statValues=document.querySelectorAll<HTMLElement>('.stat-card b');
    if(statValues[0])statValues[0].textContent=Number(summary.totalItems).toLocaleString();
    if(statValues[1])statValues[1].textContent=formatPeso(summary.inventoryValue);
    if(statValues[2])statValues[2].textContent=Number(summary.lowStockItems).toLocaleString();
    const recentlyUpdated=transactions.transactions.filter((transaction:any)=>Date.now()-new Date(transaction.createdAt).getTime()<=86_400_000).length;
    if(statValues[3])statValues[3].textContent=recentlyUpdated.toLocaleString();
    const statMeta=document.querySelectorAll<HTMLElement>('.stat-card p');
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
    latestNotificationId=alerts.reduce((latest:number,alert:any)=>Math.max(latest,Number(alert.id)||0),0);const seenNotificationId=Number(localStorage.getItem(notificationSeenKey)||0);const unreadCount=alerts.filter((alert:any)=>Number(alert.id)>seenNotificationId).length;const badge=document.querySelector<HTMLElement>('#notificationButton span')!;badge.textContent=String(unreadCount);badge.hidden=unreadCount===0;
    const notificationBody=document.querySelector<HTMLElement>('#notificationPanel section')!;notificationBody.innerHTML=alerts.length?alerts.map((a:any)=>`<article><b>${a.type.replaceAll('_',' ')}</b><span>${a.message}</span><small>${new Date(a.createdAt).toLocaleString()}</small></article>`).join(''):`<div class="rail-empty">You are all caught up.</div>`;
    const warehouses=locations.filter((l:any)=>l.locationType==='WAREHOUSE');
    const currentWh=warehouses.find((w:any)=>w.id===activeWarehouseId)||warehouses[0];
    if(currentWh){
      activeWarehouseId=currentWh.id;
      localStorage.setItem('stockhub.activeWarehouseId',String(activeWarehouseId));
      const selectorText=document.querySelector('#warehouseSelector b');
      if(selectorText)selectorText.textContent=currentWh.name;
    }
    const menu=document.querySelector<HTMLElement>('#warehouseMenu')!;
    menu.innerHTML=warehouses.map((w:any)=>`<button data-id="${w.id}"><b>${esc(w.name)}</b><small>${esc(w.code)}</small></button>`).join('')||'<span>No warehouses found</span>';
    menu.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>{
      activeWarehouseId = Number(button.dataset.id);
      localStorage.setItem('stockhub.activeWarehouseId',String(activeWarehouseId));
      document.querySelector('#warehouseSelector b')!.textContent=button.querySelector('b')!.textContent!;
      menu.classList.remove('show');
      loadWarehouseDashboard();
      window.dispatchEvent(new CustomEvent('stockhub:warehouse-change', { detail: { warehouseId: activeWarehouseId } }));
    });
  }catch(error){console.error('Dashboard hydration failed',error);throw error;}
}

document.addEventListener('click', e => {
  const target = (e.target as HTMLElement)?.closest('#configureWarehouseSlots, #btnOverlayPinSlots');
  if (target) {
    e.preventDefault();
    openSlotConfigModal();
  }
});


toast.querySelector('button')?.addEventListener('click', () => toast.classList.remove('show'));
document.querySelector('#addForm')?.addEventListener('submit', async e => { e.preventDefault();const form=new FormData(e.target as HTMLFormElement);try{await apiRequest('/items',{method:'POST',body:JSON.stringify({name:form.get('name'),sku:String(form.get('sku')||'').trim().toUpperCase(),description:form.get('description'),categoryId:Number(form.get('categoryId')),warehouseId:Number(form.get('warehouseId')),locationId:Number(form.get('locationId')),unit:'unit',unitCost:Number(form.get('unitCost')),reorderLevel:Number(form.get('reorderLevel')),initialQuantity:Number(form.get('quantity')),initialStockReason:'Initial stock entered during item creation.'})});closePanels();(e.target as HTMLFormElement).reset();window.dispatchEvent(new CustomEvent('stockhub:mutation'));document.querySelector('#toastText')!.textContent='New inventory item added';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),3500);}catch(error){showError(error instanceof Error?error.message:'Item could not be saved.','Item could not be saved');} });

const markNotificationsSeen=()=>{if(latestNotificationId>0)localStorage.setItem(notificationSeenKey,String(latestNotificationId));const badge=document.querySelector<HTMLElement>('#notificationButton span');if(badge){badge.textContent='0';badge.hidden=true;}};
document.querySelector('#notificationButton')?.addEventListener('click',()=>{const panel=document.querySelector('#notificationPanel');const opening=!panel?.classList.contains('show');panel?.classList.toggle('show');if(opening)markNotificationsSeen();});
document.querySelector('.close-notifications')?.addEventListener('click',()=>document.querySelector('#notificationPanel')?.classList.remove('show'));
document.querySelector('#warehouseSelector')?.addEventListener('click',()=>document.querySelector('#warehouseMenu')?.classList.toggle('show'));
document.querySelectorAll('.view-alerts').forEach(button=>button.addEventListener('click',()=>{document.querySelector('#notificationPanel')?.classList.add('show');markNotificationsSeen();}));
document.querySelectorAll('.view-transactions').forEach(button=>button.addEventListener('click',()=>openModule('Stock Tracking')));
async function loadLiveDashboard():Promise<void>{const page=document.querySelector<HTMLElement>('#dashboardPage')!;page.classList.add('dashboard-loading');page.classList.remove('dashboard-load-error');page.setAttribute('aria-busy','true');try{await Promise.all([hydrateDashboard(),loadWarehouseDashboard()]);page.classList.remove('dashboard-loading');}catch{page.classList.remove('dashboard-loading');page.classList.add('dashboard-load-error');}finally{page.setAttribute('aria-busy','false');}}

let liveUpdateTimer: number | undefined;
let knownDataVersion: string | null = null;
let liveRefreshInFlight = false;

async function refreshActiveView(): Promise<boolean> {
  if (drawer.classList.contains('open') || locationDrawer.classList.contains('open') || isDialogOpen() || Boolean(document.querySelector('.row-menu-popover.show'))) return false;
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
  liveUpdateTimer = window.setInterval(() => void checkForLiveUpdates(), 10000);
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

async function initializeAuthenticatedUi():Promise<void>{
  const session:any=await apiRequest('/auth/me');
  currentUserRole=session.user.role;
  notificationSeenKey=`stockhub.notifications.seenId.${String(session.user.email).toLowerCase()}`;
  const admin=currentUserRole==='ADMIN';
  document.querySelector<HTMLButtonElement>('#quickAdd')!.hidden=!admin;
  const profile=document.querySelector<HTMLElement>('.profile')!;
  profile.querySelector('b')!.textContent=session.user.name;
  profile.querySelector('small')!.textContent=session.user.email;
  profile.querySelector('.avatar')!.textContent=session.user.name.split(/\s+/).map((part:string)=>part[0]).join('').slice(0,2).toUpperCase();
  profile.onclick=()=>document.querySelector<HTMLElement>('.nav-item[data-label="Settings"]')?.click();
  await loadLiveDashboard();
  startLiveUpdates();
}
void ensureSession().then(authenticated=>{
  if(authenticated){void initializeAuthenticatedUi();}
  else showLogin(()=>{void initializeAuthenticatedUi();});
});
