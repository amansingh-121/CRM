import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3,
  Bell, Boxes, Building2, CalendarClock, Check, CheckCircle2, ChevronDown, CircleDollarSign,
  ClipboardList, CreditCard, Download, Edit2, FileText, FolderKanban, Globe2, Headphones,
  ImagePlus, LayoutDashboard, LockKeyhole, LogOut, Menu, MoreHorizontal, Package, PhoneCall, Plus,
  Receipt, RotateCcw, Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Star,
  StickyNote, Store, Tag, Trash2, Truck, Upload, UserPlus, Users, UsersRound, X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ClientWorkspaceView } from './ClientWorkspace.tsx';
import { CustomerBook, DEPARTMENT_META, DepartmentWorkspace, OrderBook } from './DepartmentsPage.tsx';
import { AdminCustomer, AdminReview, Category, Coupon, Order, Product } from '../types/ecommerce.ts';
import {
  AgencyBootstrap, AgencyInvoice, AgencyOverview, AgencyProject, ALL_PERMISSIONS, ClientNote, CrmAdmin, CrmBootstrap,
  CrmNotification, DepartmentId, PERMISSION_LABELS, Permission, RoleDefinition, WorkspaceModule,
} from '../types/crm.ts';
import { formatPrice } from '../utils/currency.ts';

type ModuleId = 'dashboard' | 'roles' | 'products' | 'orders' | 'inventory' |
  'customers' | 'payments' | 'coupons' | 'categories' | 'reports' | 'website' |
  'staff' | 'activity' | 'security' | 'returns' | 'shipping' | 'reviews' |
  'clients' | 'projects' | 'invoices' | 'notifications' |
  'orderbook' | 'customerbook' | 'sales' | 'accounts' | 'onboarding' | 'support' | 'fulfilment';
type ModalType = 'admin' | 'role' | 'product' | 'coupon' | 'category' | 'client' | 'project' | 'invoice' | 'note' | 'handover' | null;
type NavRole = 'superadmin' | 'client' | 'admin' | 'customer';

// Agency-level navigation. Storefront panels (orders, products, inventory,
// customers, payments, shipping, returns, coupons, categories, reviews) are not
// global: they only appear once a client project is opened, scoped to that site.
const NAV: { group: string; items: { id: ModuleId; label: string; icon: React.ElementType; permission: Permission; roles?: NavRole[] }[] }[] = [
  { group: 'Workspace', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  ] },
  { group: 'Operations', items: [
    { id: 'orderbook', label: 'Order book', icon: ShoppingBag, permission: 'orders:manage' },
    { id: 'customerbook', label: 'Customer book', icon: Users, permission: 'customers:manage' },
  ] },
  { group: 'Departments', items: [
    { id: 'sales', label: 'Sales desk', icon: PhoneCall, permission: 'dashboard:view' },
    { id: 'accounts', label: 'Accounts', icon: CreditCard, permission: 'dashboard:view' },
    { id: 'onboarding', label: 'Onboarding', icon: UserPlus, permission: 'dashboard:view' },
    { id: 'support', label: 'Support', icon: Headphones, permission: 'dashboard:view' },
    { id: 'fulfilment', label: 'Fulfilment', icon: Truck, permission: 'dashboard:view' },
  ] },
  { group: 'Client projects', items: [
    { id: 'clients', label: 'Clients', icon: Building2, permission: 'customers:manage', roles: ['superadmin', 'admin'] },
    { id: 'projects', label: 'Projects', icon: FolderKanban, permission: 'dashboard:view', roles: ['superadmin', 'admin', 'client'] },
    { id: 'invoices', label: 'Agency invoices', icon: Receipt, permission: 'payments:manage' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'dashboard:view', roles: ['superadmin', 'admin', 'client'] },
  ] },
  { group: 'Intelligence', items: [
    { id: 'reports', label: 'Reports & analytics', icon: BarChart3, permission: 'reports:view' },
    { id: 'website', label: 'Website content', icon: Globe2, permission: 'website:manage' },
  ] },
  { group: 'Administration', items: [
    { id: 'roles', label: 'Roles & permissions', icon: SlidersHorizontal, permission: 'roles:manage' },
    { id: 'staff', label: 'Staff management', icon: UsersRound, permission: 'admins:manage' },
    { id: 'activity', label: 'Activity logs', icon: Activity, permission: 'activity:view' },
    { id: 'security', label: 'Security', icon: LockKeyhole, permission: 'security:manage' },
  ] },
];

// Shown only while a project (website) workspace is open. Every entry reads from
// that single website's dataset.
const PROJECT_NAV: { group: string; items: { id: WorkspaceModule; label: string; icon: React.ElementType }[] }[] = [
  { group: 'Storefront', items: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'customers', label: 'Customers', icon: Users },
  ] },
  { group: 'Commerce', items: [
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'categories', label: 'Categories', icon: ClipboardList },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ] },
  { group: 'Billing', items: [
    { id: 'invoices', label: 'Invoices', icon: Receipt },
  ] },
];

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'];
const EMPTY_BOOTSTRAP: CrmBootstrap = { actorId: '', admins: [], roles: [], logs: [], sessions: [], security: { twoFactorRequired: true, approvalForRefunds: true, approvalForAdminChanges: true, sessionTimeout: 30, failedLoginLimit: 5 }, website: { storeName: '', supportEmail: '', announcement: '', heroTitle: '', maintenanceMode: false }, permissions: [] };
const EMPTY_AGENCY: AgencyBootstrap = { clients: [], projects: [], invoices: [], notes: [], notifications: [], unreadNotifications: 0 };
const EMPTY_OVERVIEW: AgencyOverview = {
  clients: 0, projects: 0, billedClients: 0, revenue: 0, collected: 0, outstanding: 0,
  storefrontRevenue: 0, orders: 0, customers: 0, averageOrderValue: 0, openReturns: 0,
  monthly: [], byClient: [], salesByCategory: [], lowStock: [], recentOrders: [], allOrders: [], allCustomers: [],
};
const PROJECT_STATUSES = ['planning', 'in_progress', 'review', 'handover', 'completed', 'on_hold'] as const;
const PROJECT_TYPES = ['website', 'application', 'branding', 'marketing'] as const;
const CLIENT_STATUSES = ['onboarding', 'active', 'paused', 'handover', 'completed'] as const;

const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const agencyTone = (status: string): 'neutral' | 'green' | 'amber' | 'red' | 'purple' | 'blue' => status === 'completed' || status === 'paid' || status === 'active' ? 'green' : status === 'on_hold' || status === 'paused' || status === 'overdue' ? 'red' : status === 'handover' || status === 'review' ? 'purple' : status === 'in_progress' || status === 'sent' ? 'blue' : 'amber';

function Progress({ value }: { value: number }) {
  return <div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div><span className="text-[10px] font-semibold text-slate-500">{value}%</span></div>;
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'purple' | 'blue' }) {
  const tones = { neutral: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700', purple: 'bg-violet-50 text-violet-700', blue: 'bg-blue-50 text-blue-700' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

function Panel({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}>
    {(title || action) && <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4"><div>{title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}{subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}</div>{action}</div>}
    {children}
  </section>;
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
    <button aria-label="Close dialog" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
    <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between"><div><h3 className="text-lg font-semibold text-slate-950">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"><X className="h-4 w-4" /></button></div>
      {children}
    </div>
  </div>;
}

function PhotoPicker({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const [error, setError] = useState('');
  const select = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Choose a JPG, PNG or WebP image.');
    if (file.size > 3 * 1024 * 1024) return setError('Image must be 3 MB or smaller.');
    setError('');
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  return <div>
    <p className="mb-2 text-xs font-medium text-slate-700">Product photo</p>
    <div className="flex items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{value ? <img src={value} alt="Product preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-slate-300" />}</div>
      <div className="min-w-0 flex-1">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-600"><Upload className="h-3.5 w-3.5" />{value ? 'Replace photo' : 'Upload photo'}<input type="file" accept="image/*" className="hidden" onChange={(event) => select(event.target.files?.[0])} /></label>
        <p className="mt-1 text-[10px] text-slate-400">JPG, PNG or WebP up to 3 MB. Appears in the product catalog right after saving.</p>
        {error && <p className="mt-1 text-[10px] font-semibold text-rose-600">{error}</p>}
      </div>
    </div>
  </div>;
}

function RevenueChart({ monthly, total }: { monthly: { month: string; revenue: number }[]; total: number }) {
  const values = monthly.length ? monthly.map((item) => item.revenue) : [0, 0];
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 600},${170 - (value / max) * 135}`).join(' ');
  return <div className="px-5 pb-4">
    <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400"><span>Total billed in this period</span><strong className="text-sm text-slate-900">{formatPrice(total)}</strong></div>
    <div className="relative h-[205px] w-full overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-between pb-7">{[0, 1, 2, 3].map((line) => <div key={line} className="border-t border-dashed border-slate-100" />)}</div>
      <svg viewBox="0 0 600 190" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[180px] w-full">
        <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7655f6" stopOpacity=".22" /><stop offset="100%" stopColor="#7655f6" stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,190 ${points} 600,190`} fill="url(#revenueFill)" />
        <polyline points={points} fill="none" stroke="#7655f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[9px] text-slate-400">{monthly.map((item) => <span key={item.month}>{item.month.split(' ')[0]}</span>)}</div>
    </div>
  </div>;
}

export const CrmDashboard: React.FC = () => {
  const { currentUser, products, categories: contextCategories, refreshProducts, switchUserRole, signOut, showToast } = useStore();
  const [active, setActive] = useState<ModuleId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<CrmBootstrap>(EMPTY_BOOTSTRAP);
  const [agency, setAgency] = useState<AgencyBootstrap>(EMPTY_AGENCY);
  const [overview, setOverview] = useState<AgencyOverview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>(contextCategories);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [productCategory, setProductCategory] = useState('All');
  const [editing, setEditing] = useState<Record<string, any>>({});
  const [website, setWebsite] = useState(EMPTY_BOOTSTRAP.website);
  // Drill-down state: dashboard -> client portfolio -> one website workspace.
  const [drill, setDrill] = useState<{ clientId: string; projectId?: string } | null>(null);
  // Which storefront panel is open inside the website workspace sidebar.
  const [workspaceModule, setWorkspaceModule] = useState<WorkspaceModule>('overview');
  const autoOpenedClient = useRef(false);

  const headers = { Authorization: `Bearer jwt-demo-${currentUser.id}`, 'Content-Type': 'application/json' };
  const can = (permission: Permission) => currentUser.role === 'superadmin' || (bootstrap.actorId === currentUser.id && bootstrap.permissions.includes(permission));
  const canSee = (item: { permission: Permission; roles?: NavRole[] }) => can(item.permission) && (!item.roles || item.roles.includes(currentUser.role));

  const request = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(path, { ...options, headers: { ...headers, ...options.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
    return data;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const core = await request('/api/crm/bootstrap');
      setBootstrap(core);
      setWebsite(core.website);
      const [orderData, customerData, couponData, categoryData, reviewData, agencyData, overviewData] = await Promise.all([
        request('/api/orders').catch(() => ({ orders: [] })),
        request('/api/admin/customers').catch(() => ({ customers: [] })),
        request('/api/admin/coupons').catch(() => ({ coupons: [] })),
        fetch('/api/categories').then((res) => res.json()).catch(() => ({ categories: contextCategories })),
        request('/api/admin/reviews').catch(() => ({ reviews: [] })),
        request('/api/agency/bootstrap').catch(() => EMPTY_AGENCY),
        request('/api/agency/overview').catch(() => null),
      ]);
      setOverview(overviewData?.overview || null);
      setOrders(orderData.orders || []);
      setCustomers(customerData.customers || []);
      setCoupons(couponData.coupons || []);
      setCategories(categoryData.categories || []);
      setReviews(reviewData.reviews || []);
      setAgency({ ...EMPTY_AGENCY, ...agencyData });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load CRM', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    autoOpenedClient.current = false;
    setDrill(null);
    setWorkspaceModule('overview');
    setBootstrap(EMPTY_BOOTSTRAP);
    setAgency(EMPTY_AGENCY);
    setActive('dashboard');
    loadData();
  }, [currentUser.id]);
  useEffect(() => { setCategories(contextCategories); }, [contextCategories]);
  // Clients only ever see their own tenant, so open their portfolio directly.
  useEffect(() => {
    if (autoOpenedClient.current || currentUser.role !== 'client' || !agency.clients.length) return;
    autoOpenedClient.current = true;
    setDrill({ clientId: agency.clients[0].id });
  }, [agency.clients, currentUser.role]);
  useEffect(() => {
    const activeItem = NAV.flatMap((group) => group.items).find((item) => item.id === active);
    if (activeItem && !canSee(activeItem)) setActive('dashboard');
  }, [currentUser.id, bootstrap.permissions]);

  const mutate = async (path: string, method: string, body: unknown, message: string) => {
    try {
      const data = await request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      showToast(data.message || message);
      setModal(null);
      setEditing({});
      await Promise.all([loadData(), refreshProducts()]);
      return data;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Action failed', 'error');
      return null;
    }
  };

  const openModal = (type: ModalType, item: Record<string, any> = {}) => { setEditing(item); setModal(type); };
  const updateField = (key: string, value: unknown) => setEditing((previous) => ({ ...previous, [key]: value }));
  const query = search.trim().toLowerCase();
  const visibleOrders = orders.filter((order) => !query || `${order.orderNumber} ${order.customerName} ${order.status}`.toLowerCase().includes(query));
  const activeLabel = NAV.flatMap((group) => group.items).find((item) => item.id === active)?.label || 'Dashboard';
  const pendingOrders = orders.filter((order) => order.status === 'Pending').length;
  const clientNotes = agency.notes.filter((note) => note.clientId === editing.clientId);
  const handoverProject = agency.projects.find((project) => project.id === editing.id);
  const clientName = (clientId?: string) => agency.clients.find((client) => client.id === clientId)?.name || '—';
  // Opening a client only swaps the page; opening one of its projects also swaps
  // the sidebar to that website's own storefront panels.
  const openClient = (clientId: string) => {
    setDrill({ clientId });
    setWorkspaceModule('overview');
    setSidebarOpen(false);
  };
  const openProject = (clientId: string, projectId: string) => {
    setDrill({ clientId, projectId });
    setWorkspaceModule('overview');
    setSidebarOpen(false);
  };
  const activeProject = drill?.projectId
    ? agency.projects.find((project) => project.id === drill.projectId)
    : undefined;
  // Dashboard shortcuts jump straight into the website a record belongs to.
  const openProjectModule = (projectId: string, module: WorkspaceModule) => {
    const project = agency.projects.find((entry) => entry.id === projectId);
    if (!project) return;
    setDrill({ clientId: project.clientId, projectId: project.id });
    setWorkspaceModule(module);
    setSidebarOpen(false);
  };
  // One step back through the hierarchy: website workspace -> that client's
  // portfolio -> the agency dashboard. Plain module pages return to the dashboard.
  const backTarget = drill?.projectId
    ? { label: `Back to ${clientName(drill.clientId)}`, action: () => openClient(drill.clientId) }
    : drill
      ? { label: currentUser.role === 'client' ? 'Back to dashboard' : 'Back to the previous page', action: () => { setDrill(null); setWorkspaceModule('overview'); } }
      : active !== 'dashboard'
        ? { label: 'Back to dashboard', action: () => { setActive('dashboard'); setSearch(''); } }
        : null;
  const modalName = ({ admin: 'staff member', role: 'role', product: 'product', coupon: 'coupon', category: 'category', client: 'client', project: 'project', invoice: 'invoice', note: 'client note' } as Record<string, string>)[modal || ''] || '';
  const isSuperAdmin = currentUser.role === 'superadmin';
  const roleName = currentUser.role === 'superadmin' ? 'Super Admin' : currentUser.role === 'client' ? 'Client / Website Owner' : bootstrap.roles.find((role) => role.id === bootstrap.admins.find((admin) => admin.id === currentUser.id)?.roleId)?.name || 'Admin';
  // Every dashboard figure rolls up all client websites, so it always matches
  // the per-client totals in the Clients table.
  const ov = overview || EMPTY_OVERVIEW;
  const departmentIds: DepartmentId[] = ['sales', 'accounts', 'onboarding', 'support', 'fulfilment'];
  const activeDepartment = departmentIds.includes(active as DepartmentId) ? (active as DepartmentId) : undefined;
  const pageSubtitle = active === 'dashboard' ? "Here's what’s happening with your business today."
    : active === 'orderbook' ? 'Every order from every client website, in one place.'
    : active === 'customerbook' ? 'Every customer from every client website, in one place.'
    : activeDepartment ? DEPARTMENT_META[activeDepartment].subtitle
    : active === 'staff' ? 'Everyone who can sign in, the role they hold and the modules they can touch.'
    : `Manage ${activeLabel.toLowerCase()} with permission-controlled access.`;

  const saveModal = (event: React.FormEvent) => {
    event.preventDefault();
    if (modal === 'admin') {
      const payload = { name: editing.name, email: editing.email, phone: editing.phone, roleId: editing.roleId || 'role-operations', title: editing.title, isActive: editing.isActive, permissions: editing.permissions };
      mutate(editing.id ? `/api/crm/admins/${editing.id}` : '/api/crm/admins', editing.id ? 'PATCH' : 'POST', payload, editing.id ? 'Staff access updated' : 'Staff account created');
    } else if (modal === 'role') {
      mutate(editing.id ? `/api/crm/roles/${editing.id}` : '/api/crm/roles', editing.id ? 'PATCH' : 'POST', { name: editing.name, description: editing.description, permissions: editing.permissions || [] }, 'Role permissions saved');
    } else if (modal === 'product') {
      const existing = products.find((product) => product.id === editing.id);
      const photo = editing.thumbnail || '/images/1505740420928-5e560c06d30e.jpg';
      const gallery = [photo, ...((existing?.images || []).filter((image) => image !== photo))];
      const payload = existing ? { name: editing.name, basePrice: Number(editing.basePrice), totalStock: Number(editing.totalStock), category: editing.category, thumbnail: photo, images: gallery } : {
        name: editing.name, brand: editing.brand || 'Aureva', category: editing.category || 'Electronics', subcategory: 'New arrivals',
        sku: `AUR-${Date.now()}`, description: editing.description || 'A new addition to the Aureva collection.', shortDescription: editing.description || 'New collection piece',
        basePrice: Number(editing.basePrice), originalPrice: Number(editing.basePrice), discountPercentage: 0, rating: 0, reviewCount: 0,
        totalStock: Number(editing.totalStock), images: [photo], thumbnail: photo,
        variants: [{ id: `variant-${Date.now()}`, name: 'Standard', sku: `AUR-${Date.now()}`, priceModifier: 0, stock: Number(editing.totalStock) }],
        specifications: [], tags: ['new'], inStock: Number(editing.totalStock) > 0,
      };
      mutate(editing.id ? `/api/admin/products/${editing.id}` : '/api/admin/products', editing.id ? 'PUT' : 'POST', payload, 'Product saved');
    } else if (modal === 'coupon') {
      mutate('/api/admin/coupons', 'POST', { code: editing.code, discountType: editing.discountType || 'percentage', discountValue: Number(editing.discountValue), minimumOrder: Number(editing.minimumOrder || 0), maximumDiscount: Number(editing.maximumDiscount || 0) || undefined, expiryDate: editing.expiryDate || '2030-12-31T23:59:59Z', usedCount: editing.usedCount || 0, isActive: editing.isActive !== false, description: editing.description || `${editing.discountValue}% store discount` }, 'Coupon saved');
    } else if (modal === 'category') {
      mutate('/api/admin/categories', 'POST', { name: editing.name, description: editing.description || '', subcategories: [] }, 'Category created');
    } else if (modal === 'client') {
      mutate('/api/agency/clients', 'POST', {
        name: editing.name, contactName: editing.contactName, email: editing.email, phone: editing.phone,
        website: editing.website, industry: editing.industry, projectName: editing.projectName,
        projectType: editing.projectType || 'website', budget: editing.budget ? Number(editing.budget) : undefined,
      }, 'Client onboarded');
    } else if (modal === 'project') {
      const team = editing.assignedAdminIds || [];
      const payload = editing.id
        ? { name: editing.name, description: editing.description, status: editing.status || 'planning', progress: Number(editing.progress ?? 0), deadline: editing.deadline, budget: Number(editing.budget || 0), assignedAdminIds: team }
        : { clientId: editing.clientId, name: editing.name, type: editing.type || 'website', deadline: editing.deadline, budget: Number(editing.budget || 0), assignedAdminIds: team };
      mutate(editing.id ? `/api/agency/projects/${editing.id}` : '/api/agency/projects', editing.id ? 'PATCH' : 'POST', payload, 'Project saved');
    } else if (modal === 'invoice') {
      mutate('/api/agency/invoices', 'POST', { clientId: editing.clientId, projectId: editing.projectId || undefined, amount: Number(editing.amount), taxPercent: Number(editing.taxPercent ?? 18), dueDate: editing.dueDate || undefined }, 'Invoice created');
    } else if (modal === 'note') {
      mutate(`/api/agency/clients/${editing.clientId}/notes`, 'POST', { body: editing.body }, 'Internal note added');
    }
  };

  const toggleHandoverItem = async (projectId: string, itemId: string) => {
    try {
      await request(`/api/agency/projects/${projectId}/handover/${itemId}`, { method: 'PATCH', body: '{}' });
      await loadData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Checklist update failed', 'error');
    }
  };

  const completeHandover = (projectId: string) => {
    if (!window.confirm('Mark this project complete and hand it over to the client?')) return;
    mutate(`/api/agency/projects/${projectId}/handover/complete`, 'POST', {}, 'Project handed over');
  };

  const exportReport = () => {
    const rows = [
      ['Client', 'Projects', 'Invoiced', 'Collected', 'Share %'],
      ...ov.byClient.map((client) => [client.clientName, String(client.projects), String(client.invoiced), String(client.collected), String(client.share)]),
      ['Total', String(ov.projects), String(ov.revenue), String(ov.collected), '100'],
    ];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'agency-revenue-report.csv'; link.click(); URL.revokeObjectURL(link.href);
    showToast('Business report exported');
  };

  const renderDashboard = () => {
    const cards = [
      { label: 'Total revenue', value: formatPrice(ov.revenue), hint: `${formatPrice(ov.collected)} collected · ${formatPrice(ov.outstanding)} outstanding`, icon: CircleDollarSign, tone: 'bg-violet-100 text-violet-600', target: 'invoices' as ModuleId },
      { label: 'Total orders', value: String(ov.orders), hint: `${ov.projects} client website${ov.projects === 1 ? '' : 's'} combined`, icon: ShoppingBag, tone: 'bg-blue-100 text-blue-600', target: 'orderbook' as ModuleId },
      { label: 'Active customers', value: String(ov.customers), hint: 'Registered across all client websites', icon: Users, tone: 'bg-emerald-100 text-emerald-600', target: 'customerbook' as ModuleId },
      { label: 'Average order value', value: formatPrice(ov.averageOrderValue), hint: `${formatPrice(ov.storefrontRevenue)} storefront sales`, icon: BarChart3, tone: 'bg-amber-100 text-amber-600', target: 'reports' as ModuleId },
    ];
    const dotTones = ['bg-violet-500', 'bg-sky-400', 'bg-emerald-400', 'bg-amber-400', 'bg-slate-300'];
    const sliceTones = ['#7655f6', '#36a3f7', '#27c49f', '#f4b84a', '#94a3b8'];
    let cursor = 0;
    const shareStops = ov.byClient.flatMap((client, index) => {
      if (client.share <= 0) return [];
      const start = cursor;
      cursor = Number(Math.min(100, cursor + client.share).toFixed(1));
      return [`${sliceTones[index % sliceTones.length]} ${start}% ${cursor}%`];
    });
    if (cursor < 100) shareStops.push(`#e7e9f2 ${cursor}% 100%`);
    const shareGradient = `conic-gradient(${shareStops.join(', ')})`;
    return <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <button key={card.label} type="button" onClick={() => setActive(card.target)} className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.02)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
          <div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}><card.icon className="h-5 w-5" /></div><ArrowRight className="h-4 w-4 text-slate-300" /></div>
          <p className="mt-5 text-xs font-medium text-slate-500">{card.label}</p><div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{card.value}</div>
          <p className="mt-3 text-[11px] text-slate-400">{card.hint}</p>
        </button>)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Revenue analytics" subtitle="Agency billing across every client project" className="xl:col-span-2" action={<select className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"><option>Last 12 months</option></select>}><RevenueChart monthly={ov.monthly} total={ov.revenue} /></Panel>
        <Panel title="Revenue by client" subtitle="Share of billed revenue per client">
          <div className="flex flex-col items-center px-5 pb-5"><div className="relative mt-2 h-36 w-36 rounded-full" style={{ background: shareGradient }}><div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-white"><span className="text-[10px] text-slate-400">Total revenue</span><strong className="mt-1 text-lg text-slate-900">{formatPrice(ov.revenue)}</strong></div></div>
            <div className="mt-5 w-full space-y-2.5">{ov.byClient.map((client, index) => <div key={client.clientId} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-600"><i className={`h-2 w-2 rounded-full ${dotTones[index % dotTones.length]}`} />{client.clientName}</span><span className="font-semibold text-slate-800">{formatPrice(client.invoiced)} · {client.share}%</span></div>)}
              {!ov.byClient.length && <p className="text-center text-xs text-slate-400">No client invoices yet.</p>}
            </div>
          </div>
        </Panel>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Recent orders" subtitle="Latest transactions across all client websites" className="xl:col-span-2" action={<button onClick={() => setActive('clients')} className="flex items-center gap-1 text-xs font-semibold text-violet-600">View clients <ArrowRight className="h-3.5 w-3.5" /></button>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Website</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{ov.recentOrders.map((order) => <tr key={`${order.projectId}-${order.orderNumber}`} className="hover:bg-slate-50/60"><td className="px-5 py-3.5 font-semibold text-slate-800">{order.orderNumber}</td><td className="px-4 py-3.5"><p className="font-medium text-slate-700">{order.projectName}</p><p className="mt-0.5 text-[10px] text-slate-400">{order.clientName}</p></td><td className="px-4 py-3.5 text-slate-600">{order.customerName}</td><td className="px-4 py-3.5 text-slate-500">{shortDate(order.createdAt)}</td><td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(order.total)}</td><td className="px-5 py-3.5"><Badge tone={order.status === 'Delivered' ? 'green' : ['Cancelled', 'Returned'].includes(order.status) ? 'red' : order.status === 'Shipped' ? 'blue' : 'amber'}>{order.status}</Badge></td></tr>)}</tbody></table>{!ov.recentOrders.length && <p className="p-10 text-center text-xs text-slate-400">No orders yet.</p>}</div>
        </Panel>
        <Panel title="Low stock alert" subtitle="Across all client websites" action={<Badge tone="red">{ov.lowStock.length} items</Badge>}>
          <div className="space-y-1 px-3 pb-3">{ov.lowStock.map((item) => <button key={`${item.projectId}-${item.sku}`} onClick={() => openProjectModule(item.projectId, 'inventory')} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Package className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-800">{item.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{item.projectName} · {item.sku}</p></div><Badge tone={item.stock === 0 ? 'red' : 'amber'}>{item.stock} left</Badge></button>)}</div>
        </Panel>
      </div>
    </>;
  };

  function OrderTable({ orders: rows, compact = false }: { orders: Order[]; compact?: boolean }) {
    return <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Status</th>{!compact && <th className="px-5 py-3 text-right font-medium">Action</th>}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((order) => <tr key={order.id} className="hover:bg-slate-50/60"><td className="px-5 py-3.5 font-semibold text-slate-800">{order.orderNumber}</td><td className="px-4 py-3.5"><p className="font-medium text-slate-700">{order.customerName}</p><p className="mt-0.5 text-[10px] text-slate-400">{order.items.length} item(s)</p></td><td className="px-4 py-3.5 text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(order.total)}</td><td className="px-4 py-3.5"><Badge tone={order.status === 'Delivered' ? 'green' : ['Cancelled', 'Returned'].includes(order.status) ? 'red' : order.status === 'Shipped' ? 'blue' : 'amber'}>{order.status}</Badge></td>{!compact && <td className="px-5 py-3.5 text-right"><select aria-label={`Update ${order.orderNumber}`} value={order.status} onChange={(event) => mutate(`/api/orders/${order.id}/status`, 'PATCH', { status: event.target.value, note: `Updated by ${currentUser.name}` }, 'Order status updated')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td>}</tr>)}</tbody></table>{!rows.length && <p className="p-10 text-center text-xs text-slate-400">No orders found.</p>}</div>;
  }

  const renderModule = () => {
    if (active === 'dashboard') return renderDashboard();
    if (active === 'orderbook') return <OrderBook rows={ov.allOrders} onOpenProject={openProjectModule} />;
    if (active === 'customerbook') return <CustomerBook rows={ov.allCustomers} onOpenProject={openProjectModule} />;
    if (activeDepartment) return <DepartmentWorkspace department={activeDepartment} request={request} canEdit={currentUser.role !== 'client'} onToast={showToast} onOpenClient={openClient} />;
    if (active === 'orders') return <Panel title="Order management" subtitle="View, process, cancel and update customer orders"><div className="px-5 pb-3"><div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order or customer" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-400" /></div></div><OrderTable orders={visibleOrders} /></Panel>;
    if (active === 'products') {
      const categoryNames = categories.map((category) => category.name);
      const activeCategory = productCategory === 'All' || categoryNames.includes(productCategory) ? productCategory : 'All';
      const visibleProducts = products.filter((product) => (activeCategory === 'All' || product.category === activeCategory) && (!query || product.name.toLowerCase().includes(query)));
      return <Panel title="Product catalog" subtitle={`${visibleProducts.length} of ${products.length} products · ${activeCategory === 'All' ? `${categoryNames.length} categories` : activeCategory}`} action={<button onClick={() => openModal('product', { basePrice: 999, totalStock: 10, category: activeCategory === 'All' ? categories[0]?.name : activeCategory })} className="crm-primary"><Plus className="h-4 w-4" />Add product</button>}>
        <div className="flex flex-wrap gap-2 px-5 pb-4">{['All', ...categoryNames].map((name) => {
          const count = products.filter((product) => name === 'All' || product.category === name).length;
          return <button key={name} onClick={() => setProductCategory(name)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${activeCategory === name ? 'border-violet-600 bg-violet-600 text-white shadow-sm shadow-violet-200' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600'}`}>{name}<span className={`rounded-full px-1.5 py-0.5 text-[9px] ${activeCategory === name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span></button>;
        })}</div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-slate-400"><th className="px-5 py-3 font-medium">Product</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Price</th><th className="px-4 py-3 font-medium">Stock</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleProducts.map((product) => <tr key={product.id}><td className="px-5 py-3"><div className="flex items-center gap-3"><img src={product.thumbnail || product.images[0]} className="h-10 w-10 rounded-lg object-cover" alt="" /><div><p className="max-w-[240px] truncate font-medium text-slate-800">{product.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{product.sku}</p></div></div></td><td className="px-4 py-3 text-slate-500">{product.category}</td><td className="px-4 py-3 font-semibold">{formatPrice(product.basePrice)}</td><td className="px-4 py-3">{product.totalStock}</td><td className="px-4 py-3"><Badge tone={product.inStock ? 'green' : 'red'}>{product.inStock ? 'Active' : 'Out of stock'}</Badge></td><td className="px-5 py-3"><div className="flex justify-end gap-1"><button onClick={() => openModal('product', product)} className="crm-icon"><Edit2 /></button><button onClick={() => window.confirm(`Remove ${product.name} from the storefront?`) && mutate(`/api/admin/products/${product.id}`, 'DELETE', undefined, 'Product deleted')} className="crm-icon hover:text-rose-600"><Trash2 /></button></div></td></tr>)}</tbody></table>{!visibleProducts.length && <p className="p-10 text-center text-xs text-slate-400">{activeCategory === 'All' ? 'No products yet. Use Add product to create the first one.' : `No products in ${activeCategory} yet. Use Add product to create one.`}</p>}</div>
      </Panel>;
    }
    if (active === 'inventory') return <Panel title="Inventory control" subtitle="Update available stock. Changes are audited." action={<Badge tone="amber">{ov.lowStock.length} low stock alerts</Badge>}><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><img src={product.thumbnail} className="h-12 w-12 rounded-lg object-cover" alt="" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-800">{product.name}</p><p className="mt-1 text-[10px] text-slate-400">{product.sku}</p></div><input type="number" min="0" defaultValue={product.totalStock} onBlur={(event) => Number(event.target.value) !== product.totalStock && mutate(`/api/admin/products/${product.id}`, 'PUT', { totalStock: Number(event.target.value) }, 'Stock updated')} className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-semibold outline-none focus:border-violet-400" /></div>)}</div></Panel>;
    if (active === 'customers') return <Panel title="Customer management" subtitle="Customer profiles, order value and account access"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-slate-400"><th className="px-5 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Orders</th><th className="px-4 py-3 font-medium">Lifetime value</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Access</th></tr></thead><tbody className="divide-y divide-slate-100">{customers.filter((user) => user.role === 'customer').map((customer) => <tr key={customer.id}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><img src={customer.avatarUrl} className="h-9 w-9 rounded-full object-cover" alt="" /><div><p className="font-medium text-slate-800">{customer.name}</p><p className="text-[10px] text-slate-400">{customer.email}</p></div></div></td><td className="px-4 py-3.5">{customer.orderCount}</td><td className="px-4 py-3.5 font-semibold">{formatPrice(customer.lifetimeSpend)}</td><td className="px-4 py-3.5"><Badge tone={customer.isActive ? 'green' : 'red'}>{customer.isActive ? 'Active' : 'Blocked'}</Badge></td><td className="px-5 py-3.5 text-right"><button onClick={() => mutate(`/api/admin/customers/${customer.id}/toggle`, 'PUT', { isActive: !customer.isActive }, 'Customer access updated')} className={`text-xs font-semibold ${customer.isActive ? 'text-rose-600' : 'text-emerald-600'}`}>{customer.isActive ? 'Block customer' : 'Unblock customer'}</button></td></tr>)}</tbody></table></div></Panel>;
    if (active === 'payments') return <Panel title="Payments & refunds" subtitle="Transaction history and controlled refund processing"><div className="divide-y divide-slate-100">{orders.map((order) => <div key={order.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><CreditCard className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-800">{order.orderNumber} · {order.customerName}</p><p className="mt-1 text-[10px] text-slate-400">{order.paymentMethod} · {new Date(order.createdAt).toLocaleDateString('en-IN')}</p></div><strong className="text-xs">{formatPrice(order.total)}</strong><Badge tone={order.paymentStatus === 'Paid' ? 'green' : order.paymentStatus === 'Refunded' ? 'purple' : 'amber'}>{order.paymentStatus}</Badge><button disabled={order.paymentStatus !== 'Paid'} onClick={() => window.confirm(`Refund ${formatPrice(order.total)}?`) && mutate(`/api/crm/orders/${order.id}/refund`, 'POST', {}, 'Refund processed')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-600 disabled:opacity-40">Refund</button></div>)}</div></Panel>;
    if (active === 'shipping' || active === 'returns') { const rows = active === 'returns' ? orders.filter((order) => ['Delivered', 'Returned'].includes(order.status)) : orders; return <Panel title={active === 'returns' ? 'Return requests' : 'Shipment management'} subtitle={active === 'returns' ? 'Review and process eligible customer returns' : 'Update fulfillment and tracking status'}><OrderTable orders={rows} /></Panel>; }
    if (active === 'coupons') return <Panel title="Coupon management" subtitle="Create promotions and control availability" action={<button onClick={() => openModal('coupon', { discountType: 'percentage', discountValue: 10, minimumOrder: 999 })} className="crm-primary"><Plus className="h-4 w-4" />New coupon</button>}><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{coupons.map((coupon) => <div key={coupon.code} className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4"><div className="flex items-center justify-between"><span className="font-mono text-sm font-bold text-violet-700">{coupon.code}</span><Badge tone={coupon.isActive ? 'green' : 'neutral'}>{coupon.isActive ? 'Active' : 'Disabled'}</Badge></div><p className="mt-3 text-xs text-slate-600">{coupon.description}</p><div className="mt-4 flex items-center justify-between text-[10px] text-slate-400"><span>{coupon.usedCount} / {coupon.usageLimit || '∞'} used</span><button onClick={() => mutate(`/api/admin/coupons/${coupon.code}`, 'PUT', { isActive: !coupon.isActive }, 'Coupon updated')} className="font-semibold text-violet-600">{coupon.isActive ? 'Disable' : 'Enable'}</button></div></div>)}</div></Panel>;
    if (active === 'categories') return <Panel title="Category management" subtitle="Organize your catalog and collections" action={<button onClick={() => openModal('category')} className="crm-primary"><Plus className="h-4 w-4" />Add category</button>}><div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{categories.map((category) => <div key={category.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ClipboardList className="h-4 w-4" /></div><Badge>{category.productCount} products</Badge></div><h3 className="mt-4 text-sm font-semibold">{category.name}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{category.description}</p></div>)}</div></Panel>;
    if (active === 'reviews') return <Panel title="Review moderation" subtitle="Approve genuine customer feedback"><div className="divide-y divide-slate-100">{reviews.map((review) => <div key={review.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">{review.userName} <span className="font-normal text-slate-400">on {review.productName}</span></p><div className="mt-1 flex text-amber-400">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="h-3 w-3 fill-current" />)}</div></div><Badge tone={review.isApproved === false ? 'amber' : 'green'}>{review.isApproved === false ? 'Pending' : 'Published'}</Badge></div><p className="mt-3 text-xs font-medium text-slate-700">{review.title}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{review.comment}</p>{review.isApproved === false && <button onClick={() => mutate(`/api/admin/reviews/${review.id}/moderate`, 'POST', { action: 'approve' }, 'Review approved')} className="mt-3 text-xs font-semibold text-violet-600">Approve review</button>}</div>)}</div></Panel>;
    if (active === 'reports') return <div className="grid gap-5 xl:grid-cols-3"><Panel title="Financial performance" subtitle="Audited billing and storefront sales across every client project" className="xl:col-span-2" action={<button onClick={exportReport} className="crm-secondary"><Download />Export CSV</button>}><RevenueChart monthly={ov.monthly} total={ov.revenue} /></Panel><Panel title="Business summary" subtitle={`${ov.projects} client projects · ${ov.clients} clients`}><div className="space-y-4 p-5">{[['Invoiced to clients', formatPrice(ov.revenue)], ['Collected', formatPrice(ov.collected)], ['Outstanding', formatPrice(ov.outstanding)], ['Storefront sales', formatPrice(ov.storefrontRevenue)], ['Orders managed', String(ov.orders)], ['Open returns', String(ov.openReturns)], ['Inventory alerts', String(ov.lowStock.length)]].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs last:border-0"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>)}</div></Panel></div>;
    if (active === 'staff') return <Panel title="Staff management" subtitle="Create staff, assign scoped roles and control account access" action={<button onClick={() => openModal('admin', { roleId: 'role-operations', isActive: true })} className="crm-primary"><Plus className="h-4 w-4" />Add staff</button>}><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-slate-400"><th className="px-5 py-3 font-medium">Team member</th><th className="px-4 py-3 font-medium">Role</th><th className="px-4 py-3 font-medium">Permissions</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{bootstrap.admins.map((admin) => <tr key={admin.id}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><img src={admin.avatarUrl} className="h-9 w-9 rounded-full object-cover" alt="" /><div><p className="font-medium text-slate-800">{admin.name}</p><p className="text-[10px] text-slate-400">{admin.email}</p></div></div></td><td className="px-4 py-3.5"><Badge tone={admin.role === 'superadmin' ? 'purple' : 'blue'}>{admin.role === 'superadmin' ? 'Super Admin' : bootstrap.roles.find((role) => role.id === admin.roleId)?.name}</Badge><p className="mt-1 text-[10px] text-slate-400">{admin.title}</p></td><td className="px-4 py-3.5 text-slate-500">{admin.role === 'superadmin' ? 'All modules' : `${admin.permissions.length} modules`}</td><td className="px-4 py-3.5"><Badge tone={admin.isActive === false ? 'red' : 'green'}>{admin.isActive === false ? 'Suspended' : 'Active'}</Badge></td><td className="px-5 py-3.5"><div className="flex justify-end gap-1">{(currentUser.role === 'superadmin' ? admin.role !== 'superadmin' : admin.role === 'admin' && admin.id !== currentUser.id) && <><button onClick={() => openModal('admin', admin)} className="crm-icon"><Edit2 /></button><button onClick={() => mutate(`/api/crm/admins/${admin.id}`, 'PATCH', { isActive: admin.isActive === false }, 'Staff status updated')} className="crm-icon"><LockKeyhole /></button><button onClick={() => window.confirm('Permanently delete this staff member?') && mutate(`/api/crm/admins/${admin.id}`, 'DELETE', undefined, 'Staff member removed')} className="crm-icon hover:text-rose-600"><Trash2 /></button></>}</div></td></tr>)}</tbody></table></div></Panel>;
    if (active === 'roles') return <><div className="mb-5 flex justify-end"><button onClick={() => openModal('role', { permissions: ['dashboard:view'] })} className="crm-primary"><Plus className="h-4 w-4" />Create custom role</button></div><div className="grid gap-4 md:grid-cols-2">{bootstrap.roles.map((role) => <Panel key={role.id}><div className="p-5"><div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${role.color}18`, color: role.color }}><ShieldCheck className="h-5 w-5" /></div>{role.id !== 'role-super' && <button onClick={() => openModal('role', role)} className="crm-icon"><Edit2 /></button>}</div><h3 className="mt-4 text-sm font-semibold">{role.name}</h3><p className="mt-1 text-xs text-slate-500">{role.description}</p><div className="mt-4 flex flex-wrap gap-1.5">{role.permissions.slice(0, 6).map((permission) => <Badge key={permission}>{PERMISSION_LABELS[permission]}</Badge>)}{role.permissions.length > 6 && <Badge tone="purple">+{role.permissions.length - 6} more</Badge>}</div></div></Panel>)}</div></>;
    if (active === 'activity') return <Panel title="Activity audit trail" subtitle="Every Super Admin and staff action is recorded"><div className="divide-y divide-slate-100">{bootstrap.logs.map((log) => <div key={log.id} className="flex gap-4 px-5 py-4"><div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${log.severity === 'critical' ? 'bg-rose-50 text-rose-600' : log.severity === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}><Activity className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs text-slate-700"><strong>{log.actorName}</strong> · {log.action}</p><p className="mt-1 text-[11px] text-slate-400">{log.target} · {log.ipAddress}</p></div><div className="text-right"><Badge tone={log.actorRole === 'superadmin' ? 'purple' : log.actorRole === 'client' ? 'blue' : 'neutral'}>{log.actorRole === 'superadmin' ? 'Super Admin' : log.actorRole === 'client' ? 'Client' : 'Admin'}</Badge><p className="mt-1 text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('en-IN')}</p></div></div>)}</div></Panel>;
    if (active === 'security') return <div className="grid gap-5 xl:grid-cols-2"><Panel title="Security & approval rules" subtitle="Platform-wide controls for sensitive actions"><div className="divide-y divide-slate-100 px-5">{[['twoFactorRequired', 'Require two-factor authentication', 'Required for all staff accounts'], ['approvalForRefunds', 'Approve refunds', 'Super Admin approval for Admin refunds'], ['approvalForAdminChanges', 'Approve permission changes', 'Additional review for access updates']].map(([key, label, description]) => <label key={key} className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-medium text-slate-800">{label}</p><p className="mt-1 text-[10px] text-slate-400">{description}</p></div><input type="checkbox" checked={Boolean(bootstrap.security[key as keyof typeof bootstrap.security])} onChange={(event) => mutate('/api/crm/security', 'PUT', { [key]: event.target.checked }, 'Security policy updated')} className="h-4 w-4 accent-violet-600" /></label>)}<div className="flex items-center justify-between py-4"><div><p className="text-xs font-medium">Session timeout</p><p className="text-[10px] text-slate-400">Automatically sign out inactive staff</p></div><select value={bootstrap.security.sessionTimeout} onChange={(event) => mutate('/api/crm/security', 'PUT', { sessionTimeout: Number(event.target.value) }, 'Session policy updated')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select></div></div></Panel><Panel title="Active login sessions" subtitle="Review and revoke staff devices"><div className="divide-y divide-slate-100 px-5">{bootstrap.sessions.map((session) => <div key={session.id} className="flex items-center gap-3 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Globe2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-medium">{session.device}</p><p className="mt-1 text-[10px] text-slate-400">{session.userName} · {session.location}</p></div>{session.current ? <Badge tone="green">Current</Badge> : <button onClick={() => mutate(`/api/crm/sessions/${session.id}`, 'DELETE', undefined, 'Session revoked')} className="text-[11px] font-semibold text-rose-600">Revoke</button>}</div>)}</div></Panel></div>;
    if (active === 'website') return <Panel title="Website settings" subtitle="Manage storefront identity, announcements and content"><form onSubmit={(event) => { event.preventDefault(); mutate('/api/crm/website', 'PUT', website, 'Website settings published'); }} className="grid gap-5 p-5 md:grid-cols-2"><label className="crm-label">Store name<input className="crm-input" value={website.storeName} onChange={(event) => setWebsite({ ...website, storeName: event.target.value })} /></label><label className="crm-label">Support email<input type="email" className="crm-input" value={website.supportEmail} onChange={(event) => setWebsite({ ...website, supportEmail: event.target.value })} /></label><label className="crm-label md:col-span-2">Announcement bar<input className="crm-input" value={website.announcement} onChange={(event) => setWebsite({ ...website, announcement: event.target.value })} /></label><label className="crm-label md:col-span-2">Homepage hero title<textarea rows={3} className="crm-input" value={website.heroTitle} onChange={(event) => setWebsite({ ...website, heroTitle: event.target.value })} /></label><label className="flex items-center gap-3 text-xs md:col-span-2"><input type="checkbox" checked={website.maintenanceMode} onChange={(event) => setWebsite({ ...website, maintenanceMode: event.target.checked })} className="h-4 w-4 accent-violet-600" />Enable maintenance mode</label><div className="md:col-span-2"><button className="crm-primary" type="submit"><Check className="h-4 w-4" />Publish changes</button></div></form></Panel>;
    if (active === 'clients') return <Panel title="Client portfolio" subtitle={`${agency.clients.length} isolated client tenants · internal notes stay hidden from clients`} action={isSuperAdmin ? <button onClick={() => openModal('client', { projectType: 'website' })} className="crm-primary"><UserPlus className="h-4 w-4" />Onboard client</button> : undefined}>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Projects</th><th className="px-4 py-3 font-medium">Invoiced</th><th className="px-4 py-3 font-medium">Handover</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{agency.clients.map((client) => {
        const clientProjects = agency.projects.filter((project) => project.clientId === client.id);
        const invoiced = agency.invoices.filter((invoice) => invoice.clientId === client.id).reduce((sum, invoice) => sum + invoice.total, 0);
        return <tr key={client.id} onClick={() => openClient(client.id)} className="cursor-pointer hover:bg-slate-50/60" title={`Open ${client.name} portfolio`}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Building2 className="h-4 w-4" /></div><div><p className="font-medium text-slate-800">{client.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{client.contactName} · {client.email}</p></div></div></td><td className="px-4 py-3.5">{isSuperAdmin ? <select value={client.status} onChange={(event) => mutate(`/api/agency/clients/${client.id}`, 'PATCH', { status: event.target.value }, 'Client status updated')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600">{CLIENT_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select> : <Badge tone={agencyTone(client.status)}>{titleCase(client.status)}</Badge>}</td><td className="px-4 py-3.5 text-slate-500">{clientProjects.length} project(s)<p className="mt-0.5 text-[10px] text-slate-400">{clientProjects.filter((project) => project.status !== 'completed').length} in delivery</p></td><td className="px-4 py-3.5 font-semibold">{formatPrice(invoiced)}</td><td className="px-4 py-3.5 text-slate-500">{client.handoverCompletedAt ? shortDate(client.handoverCompletedAt) : '—'}</td><td className="px-5 py-3.5"><div className="flex justify-end gap-2"><button onClick={(event) => { event.stopPropagation(); openModal('note', { clientId: client.id, clientName: client.name }); }} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-600"><StickyNote className="h-3.5 w-3.5" />Notes</button>{isSuperAdmin && <button onClick={(event) => { event.stopPropagation(); openModal('project', { clientId: client.id, type: 'website', deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }); }} className="crm-icon" title="Add project"><Plus /></button>}<button onClick={(event) => { event.stopPropagation(); openClient(client.id); }} className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100">Open<ArrowRight className="h-3.5 w-3.5" /></button></div></td></tr>;
      })}</tbody></table>{!agency.clients.length && <p className="p-10 text-center text-xs text-slate-400">{isSuperAdmin ? 'No clients yet. Use Onboard client to create the first tenant.' : 'No clients assigned to you yet.'}</p>}</div>
    </Panel>;
    if (active === 'projects') {
      const staffView = currentUser.role !== 'client';
      return <Panel title="Project delivery" subtitle={`${agency.projects.length} projects · progress, deadlines and handover sign-off`} action={staffView && agency.clients.length ? <button onClick={() => openModal('project', { clientId: agency.clients[0].id, type: 'website', deadline: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10) })} className="crm-primary"><Plus className="h-4 w-4" />New project</button> : undefined}>
        <div className="overflow-x-auto"><table className="w-full min-w-[1020px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Progress</th><th className="px-4 py-3 font-medium">Deadline</th><th className="px-4 py-3 font-medium">Assigned team</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{agency.projects.map((project: AgencyProject) => {
          const overdue = new Date(project.deadline).getTime() < Date.now() && project.status !== 'completed';
          const team = bootstrap.admins.filter((admin) => project.assignedAdminIds.includes(admin.id));
          return <tr key={project.id} className="hover:bg-slate-50/60"><td className="px-5 py-3.5"><button onClick={() => openProject(project.clientId, project.id)} className="text-left font-medium text-slate-800 hover:text-violet-700 hover:underline">{project.name}</button><p className="mt-0.5 text-[10px] text-slate-400">{titleCase(project.type)} · {project.handover.filter((item) => item.done).length}/{project.handover.length} handover steps</p></td><td className="px-4 py-3.5 text-slate-500">{clientName(project.clientId)}</td><td className="px-4 py-3.5"><Progress value={project.progress} /></td><td className={`px-4 py-3.5 ${overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>{shortDate(project.deadline)}</td><td className="px-4 py-3.5 text-slate-500">{team.length ? team.map((admin) => admin.name).join(', ') : <span className="text-slate-400">Unassigned</span>}</td><td className="px-4 py-3.5">{staffView ? <select value={project.status} onChange={(event) => mutate(`/api/agency/projects/${project.id}`, 'PATCH', { status: event.target.value }, 'Project status updated')} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-600">{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select> : <Badge tone={agencyTone(project.status)}>{titleCase(project.status)}</Badge>}</td><td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => openProject(project.clientId, project.id)} className="crm-icon" title="Open website workspace"><Globe2 /></button>{staffView && <><button onClick={() => openModal('handover', { id: project.id })} className="crm-icon" title="Handover checklist"><CheckCircle2 /></button><button onClick={() => openModal('project', project)} className="crm-icon" title="Edit project"><Edit2 /></button></>}</div></td></tr>;
        })}</tbody></table>{!agency.projects.length && <p className="p-10 text-center text-xs text-slate-400">{staffView ? 'No projects yet. Create a project for a client to start delivery.' : 'Your projects will appear here once the team starts delivery.'}</p>}</div>
      </Panel>;
    }
    if (active === 'invoices') return <Panel title="Project invoices" subtitle={`${agency.invoices.filter((invoice) => invoice.status !== 'paid').length} open invoice(s) · billed per client project`} action={isSuperAdmin && agency.clients.length ? <button onClick={() => openModal('invoice', { clientId: agency.clients[0].id, projectId: agency.projects[0]?.id, taxPercent: 18 })} className="crm-primary"><Plus className="h-4 w-4" />New invoice</button> : undefined}>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-5 py-3 font-medium">Invoice</th><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Project</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Due</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{agency.invoices.map((invoice: AgencyInvoice) => {
        const project = agency.projects.find((entry) => entry.id === invoice.projectId);
        return <tr key={invoice.id} className="hover:bg-slate-50/60"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Receipt className="h-4 w-4" /></div><div><p className="font-medium text-slate-800">{invoice.number}</p><p className="mt-0.5 text-[10px] text-slate-400">Issued {shortDate(invoice.issuedAt)}</p></div></div></td><td className="px-4 py-3.5 text-slate-500">{clientName(invoice.clientId)}</td><td className="px-4 py-3.5 text-slate-500">{project?.name || '—'}</td><td className="px-4 py-3.5 font-semibold">{formatPrice(invoice.total)}<p className="mt-0.5 text-[10px] font-normal text-slate-400">{formatPrice(invoice.amount)} + {invoice.taxPercent}% GST</p></td><td className="px-4 py-3.5 text-slate-500">{shortDate(invoice.dueDate)}</td><td className="px-4 py-3.5"><Badge tone={agencyTone(invoice.status)}>{titleCase(invoice.status)}</Badge></td><td className="px-5 py-3.5"><div className="flex justify-end gap-2">{isSuperAdmin && invoice.status === 'draft' && <button onClick={() => mutate(`/api/agency/invoices/${invoice.id}`, 'PATCH', { status: 'sent' }, 'Invoice sent')} className="text-[11px] font-semibold text-violet-600">Send</button>}{isSuperAdmin && ['sent', 'overdue'].includes(invoice.status) && <button onClick={() => mutate(`/api/agency/invoices/${invoice.id}`, 'PATCH', { status: 'paid' }, 'Invoice marked paid')} className="text-[11px] font-semibold text-emerald-600">Mark paid</button>}{invoice.status === 'paid' && <span className="text-[10px] text-slate-400">Settled {shortDate(invoice.paidAt)}</span>}</div></td></tr>;
      })}</tbody></table>{!agency.invoices.length && <p className="p-10 text-center text-xs text-slate-400">No invoices yet.</p>}</div>
    </Panel>;
    if (active === 'notifications') return <Panel title="Notifications" subtitle={`${agency.unreadNotifications} unread alert(s) for your access scope`} action={agency.unreadNotifications ? <button onClick={() => mutate('/api/agency/notifications/read-all', 'POST', {}, 'Notifications marked read')} className="crm-secondary">Mark all read</button> : undefined}>
      <div className="divide-y divide-slate-100">{agency.notifications.map((notification: CrmNotification) => {
        const unread = !notification.readBy.includes(currentUser.id);
        return <div key={notification.id} className={`flex gap-4 px-5 py-4 ${unread ? 'bg-violet-50/40' : ''}`}><div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Bell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-800">{notification.title}</p><p className="mt-1 text-xs text-slate-500">{notification.body}</p><p className="mt-1 text-[10px] text-slate-400">{titleCase(notification.kind)} · {new Date(notification.createdAt).toLocaleString('en-IN')}</p></div>{unread && <button onClick={() => mutate(`/api/agency/notifications/${notification.id}/read`, 'POST', {}, 'Notification read')} className="text-[11px] font-semibold text-violet-600">Mark read</button>}</div>;
      })}</div>
      {!agency.notifications.length && <p className="p-10 text-center text-xs text-slate-400">You are all caught up.</p>}
    </Panel>;
    return null;
  };

  return <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-white shadow-lg shadow-violet-200"><Store className="h-5 w-5" /></div><div><div className="text-base font-bold tracking-tight">Aureva <span className="text-violet-600">CRM</span></div><p className="text-[9px] font-medium uppercase tracking-[.16em] text-slate-400">Commerce command center</p></div></div>
      <div className="mx-4 mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-semibold">{activeProject ? activeProject.name : 'Commerce HQ'}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{activeProject ? clientName(activeProject.clientId) : 'Agency workspace'}</p></div><ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">{activeProject && drill ? <>
        {PROJECT_NAV.map((group) => <div key={group.group} className="mb-4"><p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.14em] text-slate-400">{group.group}</p>{group.items.map((item) => <button key={item.id} onClick={() => { setWorkspaceModule(item.id); setSidebarOpen(false); setSearch(''); }} className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${workspaceModule === item.id ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><item.icon className="h-4 w-4" /><span>{item.label}</span></button>)}</div>)}
        <div className="mb-4"><p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.14em] text-slate-400">Navigation</p><button onClick={() => openClient(drill.clientId)} className="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /><span className="truncate">Back to {clientName(drill.clientId)}</span></button>{currentUser.role !== 'client' && <button onClick={() => { setDrill(null); setSidebarOpen(false); }} className="mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"><Building2 className="h-4 w-4" /><span>All clients</span></button>}</div>
      </> : NAV.map((group) => { const items = group.items.filter(canSee); if (!items.length) return null; return <div key={group.group} className="mb-4"><p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[.14em] text-slate-400">{group.group}</p>{items.map((item) => <button key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); setSearch(''); setDrill(null); setWorkspaceModule('overview'); }} className={`mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${active === item.id ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}><item.icon className="h-4 w-4" /><span>{item.label}</span>{item.id === 'orders' && pendingOrders > 0 && <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] ${active === item.id ? 'bg-white/20' : 'bg-violet-50 text-violet-600'}`}>{pendingOrders}</span>}{item.id === 'notifications' && agency.unreadNotifications > 0 && <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] ${active === item.id ? 'bg-white/20' : 'bg-rose-50 text-rose-600'}`}>{agency.unreadNotifications}</span>}</button>)}</div>; })}</nav>
      <div className="border-t border-slate-100 p-3">
        <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[.14em] text-slate-400">Switch dashboard</p>
        <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1.5">
          {(['superadmin', 'admin', 'support', 'client'] as const).map((role) => (
            <button key={role} onClick={() => switchUserRole(role)} className={`rounded-lg px-2 py-2 text-[9px] font-semibold transition ${currentUser.role === role ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'}`}>
              {role === 'superadmin' ? 'Super Admin' : role === 'client' ? 'Client' : role === 'admin' ? 'Admin' : 'Support'}
            </button>
          ))}
        </div>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4" />Sign out</button>
      </div>
    </aside>
    <div className="lg:pl-[250px]">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6"><button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>{backTarget && <button onClick={backTarget.action} title={backTarget.label} aria-label={backTarget.label} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50/50 hover:text-violet-600"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span></button>}<div className="relative hidden w-full max-w-md md:block"><Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, products, customers..." className="w-full rounded-xl border border-transparent bg-slate-100 py-2.5 pl-10 pr-4 text-xs outline-none transition focus:border-violet-200 focus:bg-white" /></div><div className="ml-auto flex items-center gap-2 sm:gap-3"><button onClick={exportReport} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex"><Download className="h-4 w-4" />Export report</button><button onClick={() => setActive('notifications')} className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"><Bell className="h-4 w-4" />{agency.unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{agency.unreadNotifications}</span>}</button><div className="h-7 w-px bg-slate-200" /><img src={currentUser.avatarUrl} alt={currentUser.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-violet-100" /><div className="hidden sm:block"><p className="text-xs font-semibold">{currentUser.name}</p><p className="mt-0.5 text-[10px] text-violet-600">{roleName}</p></div><ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" /></div></header>
      <main className="p-4 sm:p-6 lg:p-7">{!drill && <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-violet-600">Commerce HQ / {activeLabel}</p><h1 className="text-2xl font-bold tracking-tight text-slate-950">{active === 'dashboard' ? `Good morning, ${currentUser.name.split(' ')[0]}` : activeLabel}</h1><p className="mt-1 text-xs text-slate-500">{pageSubtitle}</p></div><div className="flex items-center gap-2"><Badge tone="green"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />All systems operational</Badge>{currentUser.role === 'superadmin' && <Badge tone="purple"><ShieldCheck className="mr-1 h-3 w-3" />Platform full access</Badge>}{currentUser.role === 'client' && <Badge tone="blue"><Store className="mr-1 h-3 w-3" />Website owner</Badge>}</div></div>}{drill ? <ClientWorkspaceView request={request} clientId={drill.clientId} projectId={drill.projectId} module={workspaceModule} onModuleChange={setWorkspaceModule} canSeeNotes={currentUser.role !== 'client'} canBrowseClients={currentUser.role !== 'client'} onOpenClient={openClient} onOpenProject={openProject} onBackToClients={() => { setDrill(null); setWorkspaceModule('overview'); }} onToast={showToast} /> : loading && !overview ? <div className="flex min-h-[50vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" /><p className="mt-3 text-xs text-slate-500">Loading secure workspace…</p></div></div> : renderModule()}</main>
    </div>
    {modal && modal !== 'handover' && <Modal title={`${editing.id ? 'Edit' : 'Create'} ${modalName}`} description={modal === 'admin' || modal === 'role' ? 'Access is limited to only the permissions assigned here.' : modal === 'note' ? 'Internal notes are visible to staff only, never to the client.' : 'Changes apply to the live commerce workspace.'} onClose={() => { setModal(null); setEditing({}); }}><form onSubmit={saveModal} className="space-y-4">
      {modal === 'admin' && <><div className="grid gap-4 sm:grid-cols-2"><label className="crm-label">Full name<input required className="crm-input" value={editing.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label><label className="crm-label">Email<input required type="email" className="crm-input" value={editing.email || ''} onChange={(event) => updateField('email', event.target.value)} /></label></div><label className="crm-label">Job title<input className="crm-input" value={editing.title || ''} onChange={(event) => updateField('title', event.target.value)} /></label>{editing.id && <label className="crm-label">Assigned role<select className="crm-input" value={editing.roleId || 'role-operations'} onChange={(event) => updateField('roleId', event.target.value)}>{bootstrap.roles.filter((role) => role.id !== 'role-super').map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select></label>}<div><p className="mb-2 text-xs font-medium text-slate-700">Custom permission overrides (optional)</p><div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">{ALL_PERMISSIONS.filter((permission) => !['roles:manage', 'security:manage'].includes(permission)).map((permission) => <label key={permission} className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={Boolean(editing.permissions?.includes(permission))} onChange={(event) => updateField('permissions', event.target.checked ? [...(editing.permissions || []), permission] : (editing.permissions || []).filter((item: string) => item !== permission))} className="accent-violet-600" />{PERMISSION_LABELS[permission]}</label>)}</div></div></>}
      {modal === 'role' && <><label className="crm-label">Role name<input required className="crm-input" value={editing.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label><label className="crm-label">Description<input className="crm-input" value={editing.description || ''} onChange={(event) => updateField('description', event.target.value)} /></label><div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">{ALL_PERMISSIONS.filter((permission) => !['roles:manage', 'security:manage'].includes(permission)).map((permission) => <label key={permission} className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={Boolean(editing.permissions?.includes(permission))} onChange={(event) => updateField('permissions', event.target.checked ? [...(editing.permissions || []), permission] : (editing.permissions || []).filter((item: string) => item !== permission))} className="accent-violet-600" />{PERMISSION_LABELS[permission]}</label>)}</div></>}
      {modal === 'product' && <><PhotoPicker value={editing.thumbnail} onChange={(url) => updateField('thumbnail', url)} /><label className="crm-label">Product name<input required className="crm-input" value={editing.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label>{!editing.id && <label className="crm-label">Brand<input className="crm-input" value={editing.brand || ''} onChange={(event) => updateField('brand', event.target.value)} /></label>}<div className="grid grid-cols-2 gap-4"><label className="crm-label">Price (INR)<input required type="number" min="1" className="crm-input" value={editing.basePrice || ''} onChange={(event) => updateField('basePrice', event.target.value)} /></label><label className="crm-label">Stock<input required type="number" min="0" className="crm-input" value={editing.totalStock ?? ''} onChange={(event) => updateField('totalStock', event.target.value)} /></label></div><label className="crm-label">Category<select className="crm-input" value={editing.category || categories[0]?.name} onChange={(event) => updateField('category', event.target.value)}>{categories.map((category) => <option key={category.id}>{category.name}</option>)}</select></label></>}
      {modal === 'coupon' && <><label className="crm-label">Coupon code<input required className="crm-input uppercase" value={editing.code || ''} onChange={(event) => updateField('code', event.target.value)} /></label><div className="grid grid-cols-2 gap-4"><label className="crm-label">Discount type<select className="crm-input" value={editing.discountType || 'percentage'} onChange={(event) => updateField('discountType', event.target.value)}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label><label className="crm-label">Discount value<input required type="number" className="crm-input" value={editing.discountValue || ''} onChange={(event) => updateField('discountValue', event.target.value)} /></label></div><label className="crm-label">Minimum order<input type="number" className="crm-input" value={editing.minimumOrder || ''} onChange={(event) => updateField('minimumOrder', event.target.value)} /></label></>}
      {modal === 'category' && <><label className="crm-label">Category name<input required className="crm-input" value={editing.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label><label className="crm-label">Description<textarea className="crm-input" rows={3} value={editing.description || ''} onChange={(event) => updateField('description', event.target.value)} /></label></>}
      {modal === 'client' && <><div className="grid gap-4 sm:grid-cols-2"><label className="crm-label">Company<input required className="crm-input" value={editing.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label><label className="crm-label">Contact name<input required className="crm-input" value={editing.contactName || ''} onChange={(event) => updateField('contactName', event.target.value)} /></label><label className="crm-label">Email<input required type="email" className="crm-input" value={editing.email || ''} onChange={(event) => updateField('email', event.target.value)} /></label><label className="crm-label">Phone<input required className="crm-input" value={editing.phone || ''} onChange={(event) => updateField('phone', event.target.value)} /></label><label className="crm-label">Website<input className="crm-input" value={editing.website || ''} onChange={(event) => updateField('website', event.target.value)} /></label><label className="crm-label">Industry<input required className="crm-input" value={editing.industry || ''} onChange={(event) => updateField('industry', event.target.value)} /></label></div><div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs font-semibold text-slate-700">Starter project (optional)</p><div className="grid gap-4 sm:grid-cols-2"><label className="crm-label">Project name<input className="crm-input" value={editing.projectName || ''} onChange={(event) => updateField('projectName', event.target.value)} /></label><label className="crm-label">Type<select className="crm-input" value={editing.projectType || 'website'} onChange={(event) => updateField('projectType', event.target.value)}>{PROJECT_TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label><label className="crm-label">Budget (INR)<input type="number" min="0" className="crm-input" value={editing.budget || ''} onChange={(event) => updateField('budget', event.target.value)} /></label></div><p className="text-[10px] text-slate-400">Creates the client login, isolated tenant and first project. Client permissions stay fixed in code.</p></div></>}
      {modal === 'project' && <><label className="crm-label">Project name<input required className="crm-input" value={editing.name || ''} onChange={(event) => updateField('name', event.target.value)} /></label><label className="crm-label">Description<textarea rows={2} className="crm-input" value={editing.description || ''} onChange={(event) => updateField('description', event.target.value)} /></label><div className="grid gap-4 sm:grid-cols-2">{!editing.id ? <><label className="crm-label">Client<select className="crm-input" value={editing.clientId || ''} onChange={(event) => updateField('clientId', event.target.value)}>{agency.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="crm-label">Type<select className="crm-input" value={editing.type || 'website'} onChange={(event) => updateField('type', event.target.value)}>{PROJECT_TYPES.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></label></> : <><label className="crm-label">Status<select className="crm-input" value={editing.status || 'planning'} onChange={(event) => updateField('status', event.target.value)}>{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label><label className="crm-label">Progress (%)<input type="number" min="0" max="100" className="crm-input" value={editing.progress ?? 0} onChange={(event) => updateField('progress', event.target.value)} /></label></>}<label className="crm-label">Deadline<input type="date" className="crm-input" value={(editing.deadline || '').slice(0, 10)} onChange={(event) => updateField('deadline', event.target.value)} /></label><label className="crm-label">Budget (INR)<input type="number" min="0" className="crm-input" value={editing.budget || ''} onChange={(event) => updateField('budget', event.target.value)} /></label></div>{isSuperAdmin && <div><p className="mb-2 text-xs font-medium text-slate-700">Assigned team</p><div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3">{bootstrap.admins.filter((admin) => admin.role === 'admin').map((admin) => <label key={admin.id} className="flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={Boolean(editing.assignedAdminIds?.includes(admin.id))} onChange={(event) => updateField('assignedAdminIds', event.target.checked ? [...(editing.assignedAdminIds || []), admin.id] : (editing.assignedAdminIds || []).filter((item: string) => item !== admin.id))} className="accent-violet-600" />{admin.name}</label>)}</div><p className="mt-1 text-[10px] text-slate-400">Admins only see clients and projects they are assigned to.</p></div>}</>}
      {modal === 'invoice' && <><label className="crm-label">Client<select className="crm-input" value={editing.clientId || ''} onChange={(event) => updateField('clientId', event.target.value)}>{agency.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="crm-label">Project<select className="crm-input" value={editing.projectId || ''} onChange={(event) => updateField('projectId', event.target.value)}><option value="">No project</option>{agency.projects.filter((project) => project.clientId === editing.clientId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><div className="grid grid-cols-2 gap-4"><label className="crm-label">Amount (INR)<input required type="number" min="1" className="crm-input" value={editing.amount || ''} onChange={(event) => updateField('amount', event.target.value)} /></label><label className="crm-label">Tax (%)<input type="number" min="0" className="crm-input" value={editing.taxPercent ?? 18} onChange={(event) => updateField('taxPercent', event.target.value)} /></label></div><label className="crm-label">Due date<input type="date" className="crm-input" value={(editing.dueDate || '').slice(0, 10)} onChange={(event) => updateField('dueDate', event.target.value)} /></label></>}
      {modal === 'note' && <><div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3">{clientNotes.length ? clientNotes.map((note: ClientNote) => <div key={note.id} className="rounded-lg bg-white p-3 text-xs shadow-sm"><div className="flex items-center justify-between"><p className="font-semibold text-slate-700">{note.authorName}</p><span className="text-[10px] text-slate-400">{shortDate(note.createdAt)}</span></div><p className="mt-1.5 leading-relaxed text-slate-600">{note.body}</p></div>) : <p className="text-xs text-slate-400">No internal notes yet.</p>}</div><label className="crm-label">Add internal note<textarea required rows={3} className="crm-input" value={editing.body || ''} onChange={(event) => updateField('body', event.target.value)} placeholder="Visible to Super Admin and assigned admins only" /></label></>}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModal(null)} className="crm-secondary">Cancel</button><button type="submit" className="crm-primary"><Check className="h-4 w-4" />{editing.id ? 'Save changes' : 'Create'}</button></div>
    </form></Modal>}
    {modal === 'handover' && handoverProject && <Modal title="Handover checklist" description={`${handoverProject.name} · ${handoverProject.handover.filter((item) => item.done).length}/${handoverProject.handover.length} steps complete`} onClose={() => { setModal(null); setEditing({}); }}>
      <div className="space-y-2">{handoverProject.handover.map((item) => <label key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700"><input type="checkbox" checked={item.done} onChange={() => toggleHandoverItem(handoverProject.id, item.id)} className="h-4 w-4 accent-violet-600" /><span className={item.done ? 'text-slate-400 line-through' : ''}>{item.label}</span>{item.doneAt && <span className="ml-auto text-[10px] text-slate-400">{shortDate(item.doneAt)}</span>}</label>)}</div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="max-w-[60%] text-[10px] text-slate-400">Completing the handover marks the project and client as completed, and notifies the client.</p><button onClick={() => completeHandover(handoverProject.id)} disabled={!isSuperAdmin} className="crm-primary disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />Complete handover</button></div>
    </Modal>}
  </div>;
};
