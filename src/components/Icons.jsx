// Admin SVG icon set — outline style, muted, 2px stroke
const I = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" width={20} height={20} {...p}>
    {children}
  </svg>
);

// ---- Navigation ----
export const DashboardIcon = (p) => <I {...p}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></I>;
export const ClockIcon = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></I>;
export const UsersIcon = (p) => <I {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></I>;
export const FileTextIcon = (p) => <I {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></I>;
export const MessageIcon = (p) => <I {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></I>;
export const AlertTriangleIcon = (p) => <I {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><path d="M12 9v4M12 17h.01"/></I>;
export const MegaphoneIcon = (p) => <I {...p}><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></I>;
export const CalendarIcon = (p) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></I>;
export const BuildingIcon = (p) => <I {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></I>;
export const ChartIcon = (p) => <I {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></I>;
export const ShieldIcon = (p) => <I {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></I>;
export const ClipboardIcon = (p) => <I {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></I>;
export const CreditCardIcon = (p) => <I {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></I>;

// ---- UI ----
export const SunIcon = (p) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></I>;
export const MoonIcon = (p) => <I {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></I>;
export const MenuIcon = (p) => <I {...p}><path d="M3 6h18M3 12h18M3 18h18"/></I>;
export const LogoutIcon = (p) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></I>;
export const SearchIcon = (p) => <I {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></I>;
export const XIcon = (p) => <I {...p}><path d="M18 6 6 18M6 6l12 12"/></I>;
export const ChevronRightIcon = (p) => <I {...p}><path d="m9 18 6-6-6-6"/></I>;

// ---- Stats ----
export const TrendUpIcon = (p) => <I {...p}><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></I>;
export const TrendDownIcon = (p) => <I {...p}><path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></I>;
export const CheckIcon = (p) => <I {...p}><path d="M20 6 9 17l-5-5"/></I>;
export const BanIcon = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></I>;
