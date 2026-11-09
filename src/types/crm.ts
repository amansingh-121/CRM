import { User } from './ecommerce.ts';

export type Permission =
  | 'dashboard:view'
  | 'admins:manage'
  | 'roles:manage'
  | 'products:manage'
  | 'orders:manage'
  | 'inventory:manage'
  | 'customers:manage'
  | 'payments:manage'
  | 'coupons:manage'
  | 'categories:manage'
  | 'reports:view'
  | 'website:manage'
  | 'activity:view'
  | 'security:manage'
  | 'returns:manage'
  | 'shipping:manage'
  | 'reviews:manage';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  color: string;
  system?: boolean;
}

export interface CrmAdmin extends User {
  roleId: string;
  title: string;
  lastActive: string;
  permissions: Permission[];
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  ipAddress: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface LoginSession {
  id: string;
  userId: string;
  userName: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface SecuritySettings {
  twoFactorRequired: boolean;
  approvalForRefunds: boolean;
  approvalForAdminChanges: boolean;
  sessionTimeout: number;
  failedLoginLimit: number;
}

export interface WebsiteSettings {
  storeName: string;
  supportEmail: string;
  announcement: string;
  heroTitle: string;
  maintenanceMode: boolean;
}

export interface CrmBootstrap {
  actorId: string;
  admins: CrmAdmin[];
  roles: RoleDefinition[];
  logs: ActivityLog[];
  sessions: LoginSession[];
  security: SecuritySettings;
  website: WebsiteSettings;
  permissions: Permission[];
}

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view', 'admins:manage', 'roles:manage', 'products:manage',
  'orders:manage', 'inventory:manage', 'customers:manage', 'payments:manage',
  'coupons:manage', 'categories:manage', 'reports:view', 'website:manage',
  'activity:view', 'security:manage', 'returns:manage',
  'shipping:manage', 'reviews:manage',
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  'dashboard:view': 'Dashboard',
  'admins:manage': 'Staff management',
  'roles:manage': 'Roles & permissions',
  'products:manage': 'Products',
  'orders:manage': 'Orders',
  'inventory:manage': 'Inventory',
  'customers:manage': 'Customers',
  'payments:manage': 'Payments & refunds',
  'coupons:manage': 'Coupons',
  'categories:manage': 'Categories',
  'reports:view': 'Reports',
  'website:manage': 'Website content',
  'activity:view': 'Activity logs',
  'security:manage': 'Security',
  'returns:manage': 'Returns',
  'shipping:manage': 'Shipping',
  'reviews:manage': 'Reviews',
};

// ----------------------------------------------------------------------------
// Multi-tenant agency layer: every record below carries a clientId so tenants
// stay isolated. Super Admin sees all tenants, admins only assigned projects,
// clients only their own tenant.
// ----------------------------------------------------------------------------

export type ClientStatus = 'onboarding' | 'active' | 'paused' | 'handover' | 'completed';

export interface AgencyClient {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  industry: string;
  status: ClientStatus;
  ownerId?: string;
  createdAt: string;
  handoverCompletedAt?: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'handover' | 'completed' | 'on_hold';

export type ProjectType = 'website' | 'application' | 'branding' | 'marketing';

export interface HandoverItem {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
}

export interface AgencyProject {
  id: string;
  clientId: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  deadline: string;
  budget: number;
  assignedAdminIds: string[];
  handover: HandoverItem[];
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface AgencyInvoice {
  id: string;
  clientId: string;
  projectId?: string;
  number: string;
  amount: number;
  taxPercent: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export type NotificationKind = 'order' | 'refund' | 'project' | 'invoice' | 'client';

export interface CrmNotification {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  scope: 'staff' | 'client';
  clientId?: string;
  createdAt: string;
  readBy: string[];
}

export interface AgencyBootstrap {
  clients: AgencyClient[];
  projects: AgencyProject[];
  invoices: AgencyInvoice[];
  notes: ClientNote[];
  notifications: CrmNotification[];
  unreadNotifications: number;
}

// ----------------------------------------------------------------------------
// Website (project) workspaces. A project is one website, and every record
// below is addressed by that project, so a workspace can only ever read the
// commerce data of its own website. Nothing is shared across clients.
// ----------------------------------------------------------------------------

export type WebsiteKind = 'live' | 'test';
export type WebsiteReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

export interface WebsiteOrderLine {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface WebsiteOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  items: WebsiteOrderLine[];
}

export interface WebsiteInventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  image?: string;
  updatedAt: string;
}

export interface WebsiteCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  orders: number;
  lifetimeSpend: number;
  joinedAt: string;
  status: 'active' | 'blocked';
}

export interface WebsiteReturn {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  reason: string;
  status: WebsiteReturnStatus;
  refundAmount: number;
  requestedAt: string;
}

export interface WebsiteInvoice {
  id: string;
  number: string;
  customerName: string;
  orderNumber: string;
  amount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

// Storefront panels that only exist inside an opened website workspace.
export type WorkspaceModule =
  | 'overview' | 'orders' | 'products' | 'inventory' | 'customers'
  | 'payments' | 'shipping' | 'returns' | 'coupons' | 'categories' | 'reviews'
  | 'invoices';

export interface WebsitePayment {
  id: string;
  orderNumber: string;
  customerName: string;
  method: string;
  status: string;
  amount: number;
  createdAt: string;
  settledAt?: string;
}

export interface WebsiteShipment {
  id: string;
  orderNumber: string;
  customerName: string;
  destination: string;
  carrier: string;
  status: string;
  createdAt: string;
  expectedAt?: string;
}

export interface WebsiteCoupon {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  usedCount: number;
  expiryDate: string;
  status: 'active' | 'expired';
}

export interface WebsiteCategory {
  name: string;
  products: number;
  stock: number;
  lowStock: number;
  revenue: number;
}

export interface WebsiteReview {
  id: string;
  productName: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  status: 'published' | 'pending';
}

export interface WebsiteMetrics {
  revenue: number;
  orders: number;
  customers: number;
  returns: number;
  openReturns: number;
  averageOrderValue: number;
  lowStock: number;
  outstandingInvoices: number;
  lastOrderAt?: string;
}

export interface WebsiteSummary {
  kind: WebsiteKind;
  domain: string;
  launchedAt: string;
  metrics: WebsiteMetrics;
}

export interface WebsiteWorkspace extends WebsiteSummary {
  projectId: string;
  clientId: string;
  name: string;
  orders: WebsiteOrder[];
  inventory: WebsiteInventoryItem[];
  customers: WebsiteCustomer[];
  returns: WebsiteReturn[];
  invoices: WebsiteInvoice[];
  payments: WebsitePayment[];
  shipping: WebsiteShipment[];
  coupons: WebsiteCoupon[];
  categories: WebsiteCategory[];
  reviews: WebsiteReview[];
  lastSyncedAt: string;
}

export interface ClientWorkspaceProject extends AgencyProject {
  website: WebsiteSummary;
}

export interface ClientWorkspace {
  client: AgencyClient;
  projects: ClientWorkspaceProject[];
  notes: ClientNote[];
  invoices: AgencyInvoice[];
  totals: {
    websites: number;
    revenue: number;
    orders: number;
    customers: number;
    openReturns: number;
    invoiced: number;
  };
}

export interface ProjectWorkspace {
  client: AgencyClient;
  project: AgencyProject;
  website: WebsiteWorkspace;
  agencyInvoices: AgencyInvoice[];
}

// Agency-wide roll-up. Every client project is added together, so the dashboard
// never reports one website's slice as if it were the company total.
export interface AgencyOverviewClient {
  clientId: string;
  clientName: string;
  projects: number;
  invoiced: number;
  collected: number;
  share: number;
}

export interface AgencyOverviewMonth {
  month: string;
  revenue: number;
}

export interface AgencyOverviewCategory {
  category: string;
  revenue: number;
  percentage: number;
}

export interface AgencyOverviewLowStock {
  projectId: string;
  projectName: string;
  clientName: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
}

export interface AgencyOverviewOrder {
  projectId: string;
  projectName: string;
  clientName: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface AgencyOverviewCustomer {
  projectId: string;
  projectName: string;
  clientName: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  orders: number;
  lifetimeSpend: number;
  status: 'active' | 'blocked';
}

export interface AgencyOverview {
  clients: number;
  projects: number;
  billedClients: number;
  revenue: number;
  collected: number;
  outstanding: number;
  storefrontRevenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
  openReturns: number;
  monthly: AgencyOverviewMonth[];
  byClient: AgencyOverviewClient[];
  salesByCategory: AgencyOverviewCategory[];
  lowStock: AgencyOverviewLowStock[];
  recentOrders: AgencyOverviewOrder[];
  allOrders: AgencyOverviewOrder[];
  allCustomers: AgencyOverviewCustomer[];
}

// ------------------------------------------------------------- departments
// Sales, accounts, onboarding, support and fulfilment all work on the same
// client records; each department ticks its own stages so the agency sees the
// full workflow instead of scattered notes.
export type DepartmentId = 'sales' | 'accounts' | 'onboarding' | 'support' | 'fulfilment';

export interface DepartmentStep {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
  doneBy?: string;
  note?: string;
}

export interface DepartmentBlueprint {
  id: DepartmentId;
  label: string;
  description: string;
  steps: { id: string; label: string }[];
}

export interface ClientDepartmentWorkflow {
  clientId: string;
  department: DepartmentId;
  steps: DepartmentStep[];
  updatedAt: string;
}

export interface DepartmentActivity {
  id: string;
  clientId: string;
  department: DepartmentId;
  message: string;
  actorId: string;
  actorName: string;
  createdAt: string;
}

export interface AgencyDepartmentClient {
  clientId: string;
  clientName: string;
  contactName: string;
  status: ClientStatus;
  projects: number;
  workflows: Record<DepartmentId, ClientDepartmentWorkflow>;
}

export interface DepartmentsPayload {
  departments: DepartmentBlueprint[];
  clients: AgencyDepartmentClient[];
  activities: DepartmentActivity[];
}
