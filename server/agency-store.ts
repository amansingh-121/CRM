import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbStore, DEFAULT_STORE_CLIENT_ID } from './db.ts';
import type { User } from '../src/types/ecommerce.ts';
import type {
  AgencyClient,
  AgencyInvoice,
  AgencyProject,
  ClientNote,
  CrmNotification,
  HandoverItem,
  InvoiceStatus,
  NotificationKind,
  ProjectStatus,
  ProjectType,
} from '../src/types/crm.ts';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const AGENCY_FILE = path.join(DATA_DIR, 'agency.json');

const HANDOVER_TEMPLATE = [
  'Requirements and scope signed off',
  'Design approved by client',
  'Content and copy received',
  'Build deployed to production',
  'Domain, DNS and SSL configured',
  'Analytics and tracking installed',
  'Client training session completed',
  'Credentials and documentation handed over',
];

interface AgencyState {
  clients: AgencyClient[];
  projects: AgencyProject[];
  invoices: AgencyInvoice[];
  notes: ClientNote[];
  notifications: CrmNotification[];
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildHandover(doneCount = 0): HandoverItem[] {
  return HANDOVER_TEMPLATE.map((label, index) => ({
    id: `ho-${index + 1}`,
    label,
    done: index < doneCount,
    doneAt: index < doneCount ? new Date().toISOString() : undefined,
  }));
}

function ensureClientUser(email: string, name: string, phone: string): User {
  const existing = dbStore.getUserByEmail(email);
  if (existing) {
    if (existing.role !== 'client') dbStore.updateUser(existing.id, { role: 'client' });
    return existing;
  }
  return dbStore.createUser({ name, email, phone, role: 'client' });
}

function seedState(): AgencyState {
  const luminaUser = ensureClientUser('hello@luminainteriors.in', 'Meera Kapoor', '+91 98200 77441');
  const northwindUser = ensureClientUser('ops@northwindstudios.in', 'Rahul Mehta', '+91 99300 22118');

  const clients: AgencyClient[] = [
    {
      id: 'ten-aureva', name: 'Aureva Commerce', contactName: 'Aarav Malhotra', email: 'client@aureva.com',
      phone: '+91 98100 44556', website: 'https://aureva.com', industry: 'Luxury retail',
      status: 'active', ownerId: 'usr-client', createdAt: '2026-01-08T09:00:00Z',
    },
    {
      id: 'ten-lumina', name: 'Lumina Interiors', contactName: luminaUser.name, email: luminaUser.email,
      phone: '+91 98200 77441', website: 'https://luminainteriors.in', industry: 'Interior design',
      status: 'handover', ownerId: luminaUser.id, createdAt: '2026-02-12T10:15:00Z',
    },
    {
      id: 'ten-northwind', name: 'Northwind Studios', contactName: northwindUser.name, email: northwindUser.email,
      phone: '+91 99300 22118', website: 'https://northwindstudios.in', industry: 'Media production',
      status: 'onboarding', ownerId: northwindUser.id, createdAt: '2026-03-04T08:30:00Z',
    },
  ];

  const projects: AgencyProject[] = [
    {
      id: 'prj-aureva-store', clientId: 'ten-aureva', name: 'Aureva Storefront v2',
      description: 'Replatform the storefront with category-led merchandising and the new CRM.',
      type: 'website', status: 'in_progress', progress: 65,
      startDate: '2026-01-12T00:00:00Z', deadline: daysFromNow(30), budget: 480000,
      assignedAdminIds: ['usr-admin-1'], handover: buildHandover(2),
      createdAt: '2026-01-12T00:00:00Z', updatedAt: new Date().toISOString(),
    },
    {
      id: 'prj-lumina-site', clientId: 'ten-lumina', name: 'Lumina Portfolio Website',
      description: 'Editorial portfolio site with project gallery and enquiry funnel.',
      type: 'website', status: 'handover', progress: 90,
      startDate: '2026-02-15T00:00:00Z', deadline: daysFromNow(10), budget: 260000,
      assignedAdminIds: ['usr-admin-1'], handover: buildHandover(7),
      createdAt: '2026-02-15T00:00:00Z', updatedAt: new Date().toISOString(),
    },
    {
      id: 'prj-northwind-app', clientId: 'ten-northwind', name: 'Northwind Studio Store',
      description: 'Demo storefront for Northwind Studios: merch, workshop seats and digital downloads.',
      type: 'website', status: 'planning', progress: 15,
      startDate: '2026-03-08T00:00:00Z', deadline: daysFromNow(60), budget: 720000,
      assignedAdminIds: [], handover: buildHandover(0),
      createdAt: '2026-03-08T00:00:00Z', updatedAt: new Date().toISOString(),
    },
  ];

  const invoices: AgencyInvoice[] = [
    {
      id: 'inv-1001', clientId: 'ten-aureva', projectId: 'prj-aureva-store', number: 'INV-2026-1001',
      amount: 250000, taxPercent: 18, total: 295000, status: 'paid',
      issuedAt: '2026-02-01T00:00:00Z', dueDate: '2026-02-15T00:00:00Z', paidAt: '2026-02-12T00:00:00Z',
    },
    {
      id: 'inv-1002', clientId: 'ten-aureva', projectId: 'prj-aureva-store', number: 'INV-2026-1002',
      amount: 150000, taxPercent: 18, total: 177000, status: 'sent',
      issuedAt: '2026-10-01T00:00:00Z', dueDate: daysFromNow(14),
    },
    {
      id: 'inv-1003', clientId: 'ten-lumina', projectId: 'prj-lumina-site', number: 'INV-2026-1003',
      amount: 260000, taxPercent: 18, total: 306800, status: 'sent',
      issuedAt: '2026-09-20T00:00:00Z', dueDate: daysFromNow(-3),
    },
  ];

  const notes: ClientNote[] = [
    {
      id: 'note-1', clientId: 'ten-aureva', authorId: 'usr-superadmin', authorName: 'Aman Verma',
      body: 'Client wants festive campaign banners live before Diwali. Keep the CMS draft hidden from the storefront.',
      createdAt: '2026-10-20T09:40:00Z',
    },
    {
      id: 'note-2', clientId: 'ten-lumina', authorId: 'usr-admin-1', authorName: 'Rohit Sharma',
      body: 'Handover pending only on DNS transfer; credentials pack is ready in the shared drive.',
      createdAt: '2026-10-26T12:10:00Z',
    },
  ];

  const notifications: CrmNotification[] = [
    {
      id: 'ntf-1', title: 'New order received', body: 'ORD-2026-9043 · ₹12,480 awaiting fulfilment.',
      kind: 'order', scope: 'staff', clientId: 'ten-aureva', createdAt: '2026-10-30T09:20:00Z', readBy: [],
    },
    {
      id: 'ntf-2', title: 'Refund approval requested', body: 'Admin raised a refund for ORD-2026-9042, needs Super Admin sign-off.',
      kind: 'refund', scope: 'staff', clientId: 'ten-aureva', createdAt: '2026-10-30T11:05:00Z', readBy: [],
    },
    {
      id: 'ntf-3', title: 'Northwind onboarding started', body: 'Booking app scope drafted, waiting on brand assets from the client.',
      kind: 'client', scope: 'staff', clientId: 'ten-northwind', createdAt: '2026-10-29T15:30:00Z', readBy: ['usr-superadmin'],
    },
    {
      id: 'ntf-4', title: 'Project progress updated', body: 'Aureva Storefront v2 moved to 65% complete.',
      kind: 'project', scope: 'client', clientId: 'ten-aureva', createdAt: '2026-10-28T10:00:00Z', readBy: [],
    },
  ];

  return { clients, projects, invoices, notes, notifications };
}

function loadState(): AgencyState {
  if (!existsSync(AGENCY_FILE)) return seedState();
  try {
    const parsed = JSON.parse(readFileSync(AGENCY_FILE, 'utf8'));
    if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.invoices)) {
      return seedState();
    }
    const loaded: AgencyState = {
      clients: parsed.clients,
      projects: parsed.projects,
      invoices: parsed.invoices,
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
    // Client logins live in the in-memory user store, so re-link them by email
    // after a restart to keep tenant ownership intact.
    loaded.clients.forEach((client: AgencyClient) => {
      if (client.ownerId && dbStore.getUserById(client.ownerId)) return;
      const owner = ensureClientUser(client.email, client.contactName, client.phone);
      client.ownerId = owner.id;
    });
    return loaded;
  } catch (error) {
    console.error('Ignoring unreadable agency snapshot:', error);
    return seedState();
  }
}

const state: AgencyState = loadState();

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(AGENCY_FILE, JSON.stringify(state), 'utf8');
  } catch (error) {
    console.error('Unable to persist agency snapshot:', error);
  }
}

// ---------------------------------------------------------------- access scope

export function visibleClientIds(actor: User): string[] | 'all' {
  if (actor.role === 'superadmin') return 'all';
  if (actor.role === 'client') {
    return state.clients.filter((client) => client.ownerId === actor.id).map((client) => client.id);
  }
  const assigned = new Set(
    state.projects.filter((project) => project.assignedAdminIds.includes(actor.id)).map((project) => project.clientId),
  );
  return [...assigned];
}

export function canAccessClient(actor: User, clientId: string): boolean {
  const scope = visibleClientIds(actor);
  return scope === 'all' || scope.includes(clientId);
}

// Project-level scope. Admins only reach websites they are staffed on, clients
// only websites of the tenant they own, Super Admin sees every project.
export function visibleProjects(actor: User): AgencyProject[] {
  const scope = visibleClientIds(actor);
  const inScope = (clientId: string) => scope === 'all' || scope.includes(clientId);
  return state.projects.filter((project) => {
    if (!inScope(project.clientId)) return false;
    if (actor.role === 'admin') return project.assignedAdminIds.includes(actor.id);
    return true;
  });
}

export function canAccessProject(actor: User, projectId: string): AgencyProject | undefined {
  return visibleProjects(actor).find((project) => project.id === projectId);
}

export function storeClientIdFor(actor: User): string {
  if (actor.role === 'client') {
    const owned = state.clients.find((client) => client.ownerId === actor.id);
    if (owned) return owned.id;
  }
  return DEFAULT_STORE_CLIENT_ID;
}

function notificationVisible(actor: User, notification: CrmNotification): boolean {
  if (actor.role === 'superadmin') return true;
  const scope = visibleClientIds(actor);
  const inScope = (clientId?: string) => scope === 'all' || Boolean(clientId && scope.includes(clientId));
  if (actor.role === 'client') return notification.scope === 'client' && inScope(notification.clientId);
  return notification.scope === 'staff' && (!notification.clientId || inScope(notification.clientId));
}

// ------------------------------------------------------------------- bootstrap

export function getAgencyBootstrap(actor: User) {
  const scope = visibleClientIds(actor);
  const inScope = (clientId?: string) => scope === 'all' || Boolean(clientId && scope.includes(clientId));
  const clients = state.clients.filter((client) => inScope(client.id));
  const projects = state.projects.filter((project) => inScope(project.clientId));
  const invoices = state.invoices.filter((invoice) => inScope(invoice.clientId));
  const notes = actor.role === 'client' ? [] : state.notes.filter((note) => inScope(note.clientId));
  const notifications = state.notifications
    .filter((notification) => notificationVisible(actor, notification))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    clients,
    projects,
    invoices,
    notes,
    notifications,
    unreadNotifications: notifications.filter((notification) => !notification.readBy.includes(actor.id)).length,
  };
}

// -------------------------------------------------------------------- mutations

export function pushNotification(input: {
  title: string;
  body: string;
  kind: NotificationKind;
  scope: 'staff' | 'client';
  clientId?: string;
}) {
  state.notifications.unshift({
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title,
    body: input.body,
    kind: input.kind,
    scope: input.scope,
    clientId: input.clientId,
    createdAt: new Date().toISOString(),
    readBy: [],
  });
  persist();
}

export function createClient(input: {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  industry: string;
  projectName?: string;
  projectType?: ProjectType;
  budget?: number;
}): { client: AgencyClient; project?: AgencyProject } {
  const existingClient = state.clients.find((client) => client.email.toLowerCase() === input.email.toLowerCase());
  if (existingClient) return { client: existingClient };
  const owner = ensureClientUser(input.email, input.contactName, input.phone);
  const client: AgencyClient = {
    id: `ten-${Date.now()}`,
    name: input.name,
    contactName: input.contactName,
    email: input.email,
    phone: input.phone,
    website: input.website,
    industry: input.industry,
    status: 'onboarding',
    ownerId: owner.id,
    createdAt: new Date().toISOString(),
  };
  state.clients.unshift(client);

  let project: AgencyProject | undefined;
  if (input.projectName) {
    project = {
      id: `prj-${Date.now()}`,
      clientId: client.id,
      name: input.projectName,
      description: `${input.projectType || 'website'} engagement for ${input.name}`,
      type: input.projectType || 'website',
      status: 'planning',
      progress: 5,
      startDate: new Date().toISOString(),
      deadline: daysFromNow(45),
      budget: Number(input.budget || 0),
      assignedAdminIds: [],
      handover: buildHandover(0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.projects.unshift(project);
  }

  state.notes.unshift({
    id: `note-${Date.now()}`,
    clientId: client.id,
    authorId: 'system',
    authorName: 'Onboarding',
    body: `Client account created for ${client.contactName} (${client.email}). Permissions scoped to the client tenant.`,
    createdAt: new Date().toISOString(),
  });

  pushNotification({
    title: 'New client onboarded',
    body: `${client.name} was onboarded${project ? ` with project ${project.name}` : ''}.`,
    kind: 'client',
    scope: 'staff',
    clientId: client.id,
  });
  persist();
  return { client, project };
}

export function updateClient(id: string, updates: Partial<AgencyClient>): AgencyClient | undefined {
  const client = state.clients.find((entry) => entry.id === id);
  if (!client) return undefined;
  Object.assign(client, updates, { id: client.id });
  persist();
  return client;
}

export function createProject(input: {
  clientId: string;
  name: string;
  description?: string;
  type?: ProjectType;
  deadline?: string;
  budget?: number;
  assignedAdminIds?: string[];
}): AgencyProject | undefined {
  if (!state.clients.some((client) => client.id === input.clientId)) return undefined;
  const project: AgencyProject = {
    id: `prj-${Date.now()}`,
    clientId: input.clientId,
    name: input.name,
    description: input.description || '',
    type: input.type || 'website',
    status: 'planning',
    progress: 0,
    startDate: new Date().toISOString(),
    deadline: input.deadline || daysFromNow(45),
    budget: Number(input.budget || 0),
    assignedAdminIds: input.assignedAdminIds || [],
    handover: buildHandover(0),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.projects.unshift(project);
  pushNotification({
    title: 'New project created',
    body: `${project.name} was added to the pipeline.`,
    kind: 'project',
    scope: 'staff',
    clientId: input.clientId,
  });
  persist();
  return project;
}

export function updateProject(
  id: string,
  updates: Partial<Pick<AgencyProject, 'name' | 'description' | 'status' | 'progress' | 'deadline' | 'budget' | 'assignedAdminIds'>>,
): AgencyProject | undefined {
  const project = state.projects.find((entry) => entry.id === id);
  if (!project) return undefined;
  const previousStatus = project.status;
  const previousProgress = project.progress;
  Object.assign(project, updates, {
    id: project.id,
    clientId: project.clientId,
    progress: Math.min(100, Math.max(0, Number(updates.progress ?? project.progress))),
    updatedAt: new Date().toISOString(),
  });
  if (updates.status || (updates.progress !== undefined && updates.progress !== previousProgress)) {
    pushNotification({
      title: 'Project update',
      body: `${project.name} is now ${project.status.replace('_', ' ')} · ${project.progress}% complete.`,
      kind: 'project',
      scope: 'client',
      clientId: project.clientId,
    });
    if (previousStatus !== project.status) {
      pushNotification({
        title: 'Project status changed',
        body: `${project.name} moved from ${previousStatus.replace('_', ' ')} to ${project.status.replace('_', ' ')}.`,
        kind: 'project',
        scope: 'staff',
        clientId: project.clientId,
      });
    }
  }
  persist();
  return project;
}

export function toggleHandoverItem(projectId: string, itemId: string): AgencyProject | undefined {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return undefined;
  const item = project.handover.find((entry) => entry.id === itemId);
  if (!item) return undefined;
  item.done = !item.done;
  item.doneAt = item.done ? new Date().toISOString() : undefined;
  project.updatedAt = new Date().toISOString();
  if (project.progress === 100 || project.status === 'completed') {
    // keep handover edits in sync with completed projects
    project.progress = 100;
  }
  persist();
  return project;
}

export function completeHandover(projectId: string): AgencyProject | undefined {
  const project = state.projects.find((entry) => entry.id === projectId);
  if (!project) return undefined;
  const now = new Date().toISOString();
  project.handover = project.handover.map((item) => ({ ...item, done: true, doneAt: item.doneAt || now }));
  project.status = 'completed';
  project.progress = 100;
  project.updatedAt = now;
  const client = state.clients.find((entry) => entry.id === project.clientId);
  if (client) {
    client.status = 'completed';
    client.handoverCompletedAt = now;
  }
  pushNotification({
    title: 'Project handed over',
    body: `${project.name} is complete and handed over to the client.`,
    kind: 'project',
    scope: 'client',
    clientId: project.clientId,
  });
  persist();
  return project;
}

export function createInvoice(input: {
  clientId: string;
  projectId?: string;
  amount: number;
  taxPercent?: number;
  dueDate?: string;
}): AgencyInvoice | undefined {
  if (!state.clients.some((client) => client.id === input.clientId)) return undefined;
  const amount = Number(input.amount || 0);
  const taxPercent = Number(input.taxPercent ?? 18);
  const total = Number((amount + (amount * taxPercent) / 100).toFixed(2));
  const sequence = String(state.invoices.length + 1001).slice(-4);
  const invoice: AgencyInvoice = {
    id: `inv-${Date.now()}`,
    clientId: input.clientId,
    projectId: input.projectId,
    number: `INV-${new Date().getFullYear()}-${sequence}`,
    amount,
    taxPercent,
    total,
    status: 'draft',
    issuedAt: new Date().toISOString(),
    dueDate: input.dueDate || daysFromNow(15),
  };
  state.invoices.unshift(invoice);
  persist();
  return invoice;
}

export function setInvoiceStatus(id: string, status: InvoiceStatus): AgencyInvoice | undefined {
  const invoice = state.invoices.find((entry) => entry.id === id);
  if (!invoice) return undefined;
  invoice.status = status;
  if (status === 'paid') invoice.paidAt = new Date().toISOString();
  if (status === 'sent') {
    pushNotification({
      title: 'Invoice sent',
      body: `${invoice.number} for ₹${invoice.total.toLocaleString('en-IN')} was shared with the client.`,
      kind: 'invoice',
      scope: 'client',
      clientId: invoice.clientId,
    });
  }
  if (status === 'paid') {
    pushNotification({
      title: 'Invoice paid',
      body: `${invoice.number} was settled (₹${invoice.total.toLocaleString('en-IN')}).`,
      kind: 'invoice',
      scope: 'staff',
      clientId: invoice.clientId,
    });
  }
  persist();
  return invoice;
}

export function addNote(clientId: string, actor: User, body: string): ClientNote | undefined {
  if (!state.clients.some((client) => client.id === clientId)) return undefined;
  const note: ClientNote = {
    id: `note-${Date.now()}`,
    clientId,
    authorId: actor.id,
    authorName: actor.name,
    body,
    createdAt: new Date().toISOString(),
  };
  state.notes.unshift(note);
  persist();
  return note;
}

export function markNotificationRead(id: string, actor: User) {
  const notification = state.notifications.find((entry) => entry.id === id);
  if (!notification) return false;
  if (!notification.readBy.includes(actor.id)) notification.readBy.push(actor.id);
  persist();
  return true;
}

export function markAllNotificationsRead(actor: User) {
  state.notifications
    .filter((notification) => notificationVisible(actor, notification))
    .forEach((notification) => {
      if (!notification.readBy.includes(actor.id)) notification.readBy.push(actor.id);
    });
  persist();
  return true;
}

export function findProject(id: string) {
  return state.projects.find((project) => project.id === id);
}

export function findClient(id: string) {
  return state.clients.find((client) => client.id === id);
}

export function getClientsForAdmin(actor: User) {
  const scope = visibleClientIds(actor);
  return state.clients.filter((client) => scope === 'all' || scope.includes(client.id));
}

export function listAdmins() {
  return dbStore.getUsers().filter((user) => user.role === 'admin');
}
