import { Router } from 'express';
import { getActor, hasPermission, recordAudit, requireStaff } from './crm-api.ts';
import { dbStore } from './db.ts';
import * as agency from './agency-store.ts';
import { getAgencyOverview, getWebsiteSummary, getWebsiteWorkspace } from './website-store.ts';
import { addActivity, DEPARTMENT_BLUEPRINTS, getWorkflowsFor, listActivities, setStep } from './departments-store.ts';
import type { User } from '../src/types/ecommerce.ts';
import type { ClientStatus, DepartmentId, InvoiceStatus, ProjectStatus, ProjectType } from '../src/types/crm.ts';

export const agencyRouter = Router();

const CLIENT_STATUSES: ClientStatus[] = ['onboarding', 'active', 'paused', 'handover', 'completed'];
const PROJECT_STATUSES: ProjectStatus[] = ['planning', 'in_progress', 'review', 'handover', 'completed', 'on_hold'];
const PROJECT_TYPES: ProjectType[] = ['website', 'application', 'branding', 'marketing'];
const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue'];

agencyRouter.use(requireStaff);

function currentActor(req: Parameters<typeof getActor>[0]): User {
  return getActor(req)!;
}

function canWriteProjects(actor: User): boolean {
  return actor.role === 'superadmin' || hasPermission(actor, 'customers:manage');
}

// Admins may only touch projects they are staffed on; Super Admin can touch anything.
function projectWriteAllowed(actor: User, project: { assignedAdminIds: string[] }): boolean {
  if (actor.role === 'superadmin') return true;
  return canWriteProjects(actor) && project.assignedAdminIds.includes(actor.id);
}

function staffAdminIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => String(id))
    .filter((id) => dbStore.getUserById(id)?.role === 'admin');
}

// ---------------------------------------------------------------- bootstrap

agencyRouter.get('/bootstrap', (req, res) => {
  res.json(agency.getAgencyBootstrap(currentActor(req)));
});

// Dashboard roll-up: every client project the actor can see is added together.
agencyRouter.get('/overview', (req, res) => {
  const bootstrap = agency.getAgencyBootstrap(currentActor(req));
  res.json({ overview: getAgencyOverview(bootstrap.projects, bootstrap.invoices, bootstrap.clients) });
});

// -------------------------------------------------------------- departments

// Sales, accounts, onboarding, support and fulfilment all read the same board:
// one workflow per client, scoped to the clients the actor may access.
agencyRouter.get('/departments', (req, res) => {
  const actor = currentActor(req);
  const bootstrap = agency.getAgencyBootstrap(actor);
  const clients = bootstrap.clients.map((client) => ({
    clientId: client.id,
    clientName: client.name,
    contactName: client.contactName,
    status: client.status,
    projects: bootstrap.projects.filter((project) => project.clientId === client.id).length,
    workflows: getWorkflowsFor(client.id),
  }));
  res.json({
    departments: DEPARTMENT_BLUEPRINTS,
    clients,
    activities: listActivities({ clientIds: clients.map((client) => client.clientId), limit: 60 }),
  });
});

agencyRouter.patch('/clients/:id/workflow/:department/:stepId', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Only agency staff can update department boards.' });
  }
  const client = agency.findClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  if (!agency.canAccessClient(actor, client.id)) {
    return res.status(403).json({ error: 'You are not assigned to this client.' });
  }
  const department = req.params.department as DepartmentId;
  if (!DEPARTMENT_BLUEPRINTS.some((entry) => entry.id === department)) {
    return res.status(400).json({ error: 'Unknown department.' });
  }
  const done = Boolean(req.body?.done);
  const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
  const result = setStep({
    clientId: client.id,
    department,
    stepId: req.params.stepId,
    done,
    note,
    actor: { id: actor.id, name: actor.name },
  });
  if (!result) return res.status(404).json({ error: 'Workflow step not found.' });
  recordAudit(req, 'Updated department workflow', `${client.name} · ${department}`);
  res.json(result);
});

agencyRouter.post('/clients/:id/activity', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Only agency staff can log department updates.' });
  }
  const client = agency.findClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  if (!agency.canAccessClient(actor, client.id)) {
    return res.status(403).json({ error: 'You are not assigned to this client.' });
  }
  const department = req.body?.department as DepartmentId;
  if (!DEPARTMENT_BLUEPRINTS.some((entry) => entry.id === department)) {
    return res.status(400).json({ error: 'Unknown department.' });
  }
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Write what happened before saving.' });

  const activity = addActivity({ clientId: client.id, department, message, actor: { id: actor.id, name: actor.name } });
  recordAudit(req, 'Logged department update', client.name);
  res.status(201).json({ activity });
});

// ------------------------------------------------------------------ clients

agencyRouter.get('/clients', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Clients can only access their own tenant.' });
  }
  res.json({ clients: agency.getClientsForAdmin(actor) });
});

// Portfolio view: the client plus summary metrics for every website the actor
// may open. Only projects inside the actor's scope are ever returned.
agencyRouter.get('/clients/:id/workspace', (req, res) => {
  const actor = currentActor(req);
  const client = agency.findClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });
  if (!agency.canAccessClient(actor, client.id)) {
    return res.status(403).json({ error: 'This client belongs to another tenant.' });
  }

  const bootstrap = agency.getAgencyBootstrap(actor);
  const projects = agency
    .visibleProjects(actor)
    .filter((project) => project.clientId === client.id)
    .map((project) => ({ ...project, website: getWebsiteSummary(project) }));
  const invoices = bootstrap.invoices.filter((invoice) => invoice.clientId === client.id);
  const totals = projects.reduce(
    (accumulator, project) => ({
      websites: accumulator.websites + 1,
      revenue: accumulator.revenue + project.website.metrics.revenue,
      orders: accumulator.orders + project.website.metrics.orders,
      customers: accumulator.customers + project.website.metrics.customers,
      openReturns: accumulator.openReturns + project.website.metrics.openReturns,
      invoiced: accumulator.invoiced,
    }),
    {
      websites: 0,
      revenue: 0,
      orders: 0,
      customers: 0,
      openReturns: 0,
      invoiced: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
    },
  );

  return res.json({
    client,
    projects,
    notes: actor.role === 'client' ? [] : bootstrap.notes.filter((note) => note.clientId === client.id),
    invoices,
    totals: {
      ...totals,
      revenue: Number(totals.revenue.toFixed(2)),
      invoiced: Number(totals.invoiced.toFixed(2)),
    },
  });
});

agencyRouter.post('/clients', (req, res) => {
  const actor = currentActor(req);
  if (actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Admin can onboard clients.' });
  }
  const { name, contactName, email, phone, website, industry, projectName, projectType, budget } = req.body || {};
  if (!name || !contactName || !email || !phone || !industry) {
    return res.status(400).json({ error: 'Company, contact name, email, phone and industry are required.' });
  }
  if (agency.getClientsForAdmin(actor).some((client) => client.email.toLowerCase() === String(email).toLowerCase())) {
    return res.status(409).json({ error: 'A client with this email already exists.' });
  }
  const existingUser = dbStore.getUserByEmail(String(email));
  if (existingUser && !['customer', 'client'].includes(existingUser.role)) {
    return res.status(400).json({ error: 'This email belongs to a staff account. Use a client email.' });
  }
  if (projectType && !PROJECT_TYPES.includes(projectType)) {
    return res.status(400).json({ error: 'Unknown project type.' });
  }

  const result = agency.createClient({
    name: String(name),
    contactName: String(contactName),
    email: String(email),
    phone: String(phone),
    website: website ? String(website) : undefined,
    industry: String(industry),
    projectName: projectName ? String(projectName) : undefined,
    projectType: projectType as ProjectType | undefined,
    budget: budget === undefined ? undefined : Number(budget),
  });
  recordAudit(req, 'Onboarded client', result.client.name, 'warning');
  return res.status(201).json(result);
});

agencyRouter.patch('/clients/:id', (req, res) => {
  const actor = currentActor(req);
  if (actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Admin can update client records.' });
  }
  const client = agency.findClient(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const { status, name, contactName, phone, website, industry } = req.body || {};
  if (status && !CLIENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Unknown client status.' });
  }
  const updated = agency.updateClient(client.id, {
    status: status || client.status,
    name: name ? String(name) : client.name,
    contactName: contactName ? String(contactName) : client.contactName,
    phone: phone ? String(phone) : client.phone,
    website: website === undefined ? client.website : String(website),
    industry: industry ? String(industry) : client.industry,
  });
  recordAudit(req, 'Updated client record', client.name);
  res.json({ client: updated });
});

// ---------------------------------------------------------- internal notes

agencyRouter.get('/clients/:id/notes', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Internal notes are visible to staff only.' });
  }
  const bootstrap = agency.getAgencyBootstrap(actor);
  if (!agency.canAccessClient(actor, req.params.id)) {
    return res.status(403).json({ error: 'You are not assigned to this client.' });
  }
  res.json({ notes: bootstrap.notes.filter((note) => note.clientId === req.params.id) });
});

agencyRouter.post('/clients/:id/notes', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Internal notes are visible to staff only.' });
  }
  if (!canWriteProjects(actor) || !agency.canAccessClient(actor, req.params.id)) {
    return res.status(403).json({ error: 'You are not assigned to this client.' });
  }
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Note text is required.' });
  const note = agency.addNote(req.params.id, actor, body);
  if (!note) return res.status(404).json({ error: 'Client not found.' });
  recordAudit(req, 'Added internal client note', agency.findClient(req.params.id)?.name || req.params.id);
  res.status(201).json({ note });
});

// ----------------------------------------------------------------- projects

agencyRouter.get('/projects', (req, res) => {
  res.json({ projects: agency.getAgencyBootstrap(currentActor(req)).projects });
});

// Website workspace: orders, inventory, customers, returns and invoices are all
// derived from this project (website) only, so no other tenant data can leak.
agencyRouter.get('/projects/:id/workspace', (req, res) => {
  const actor = currentActor(req);
  const project = agency.findProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Website not found.' });
  if (!agency.canAccessProject(actor, project.id)) {
    return res.status(403).json({ error: 'This website belongs to another client tenant.' });
  }
  const client = agency.findClient(project.clientId);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const agencyInvoices = agency
    .getAgencyBootstrap(actor)
    .invoices.filter((invoice) => invoice.projectId === project.id);

  return res.json({
    client,
    project,
    website: getWebsiteWorkspace(project),
    agencyInvoices,
  });
});

agencyRouter.post('/projects', (req, res) => {
  const actor = currentActor(req);
  if (!canWriteProjects(actor)) {
    return res.status(403).json({ error: 'Your role cannot create projects.' });
  }
  const { clientId, name, description, type, deadline, budget, assignedAdminIds } = req.body || {};
  if (!clientId || !agency.findClient(clientId)) {
    return res.status(404).json({ error: 'Client not found.' });
  }
  if (!agency.canAccessClient(actor, clientId)) {
    return res.status(403).json({ error: 'You are not assigned to this client.' });
  }
  if (!name) return res.status(400).json({ error: 'Project name is required.' });
  if (type && !PROJECT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Unknown project type.' });
  }

  let team = staffAdminIds(assignedAdminIds);
  if (actor.role === 'admin' && !team.includes(actor.id)) team = [...team, actor.id];
  const project = agency.createProject({
    clientId,
    name: String(name),
    description: description ? String(description) : undefined,
    type: type as ProjectType | undefined,
    deadline: deadline ? String(deadline) : undefined,
    budget: budget === undefined ? undefined : Number(budget),
    assignedAdminIds: team,
  });
  recordAudit(req, 'Created client project', project?.name || String(name));
  res.status(201).json({ project });
});

agencyRouter.patch('/projects/:id', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Clients cannot edit project delivery data.' });
  }
  const project = agency.findProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!projectWriteAllowed(actor, project)) {
    return res.status(403).json({ error: 'You are not staffed on this project.' });
  }

  const { name, description, status, progress, deadline, budget, assignedAdminIds } = req.body || {};
  if (status && !PROJECT_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Unknown project status.' });
  }
  if (progress !== undefined && (Number.isNaN(Number(progress)) || Number(progress) < 0 || Number(progress) > 100)) {
    return res.status(400).json({ error: 'Progress must be between 0 and 100.' });
  }

  const updated = agency.updateProject(project.id, {
    name: name ? String(name) : project.name,
    description: description === undefined ? project.description : String(description),
    status: status || project.status,
    progress: progress === undefined ? project.progress : Number(progress),
    deadline: deadline ? String(deadline) : project.deadline,
    budget: budget === undefined ? project.budget : Number(budget),
    assignedAdminIds:
      actor.role === 'superadmin' && assignedAdminIds !== undefined
        ? staffAdminIds(assignedAdminIds)
        : project.assignedAdminIds,
  });
  recordAudit(req, 'Updated project delivery', project.name);
  res.json({ project: updated });
});

agencyRouter.patch('/projects/:id/handover/:itemId', (req, res) => {
  const actor = currentActor(req);
  if (actor.role === 'client') {
    return res.status(403).json({ error: 'Clients cannot edit the handover checklist.' });
  }
  const project = agency.findProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!projectWriteAllowed(actor, project)) {
    return res.status(403).json({ error: 'You are not staffed on this project.' });
  }
  const updated = agency.toggleHandoverItem(project.id, req.params.itemId);
  if (!updated) return res.status(404).json({ error: 'Checklist item not found.' });
  recordAudit(req, 'Updated handover checklist', project.name);
  res.json({ project: updated });
});

agencyRouter.post('/projects/:id/handover/complete', (req, res) => {
  const actor = currentActor(req);
  if (actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Admin can sign off a handover.' });
  }
  const project = agency.findProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  const updated = agency.completeHandover(project.id);
  recordAudit(req, 'Completed project handover', project.name, 'critical');
  res.json({ project: updated });
});

// ----------------------------------------------------------------- invoices

agencyRouter.get('/invoices', (req, res) => {
  res.json({ invoices: agency.getAgencyBootstrap(currentActor(req)).invoices });
});

agencyRouter.post('/invoices', (req, res) => {
  const actor = currentActor(req);
  if (actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Admin can raise invoices.' });
  }
  const { clientId, projectId, amount, taxPercent, dueDate } = req.body || {};
  if (!clientId || !agency.findClient(clientId)) {
    return res.status(404).json({ error: 'Client not found.' });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invoice amount must be greater than zero.' });
  }
  const invoice = agency.createInvoice({
    clientId,
    projectId: projectId ? String(projectId) : undefined,
    amount: Number(amount),
    taxPercent: taxPercent === undefined ? undefined : Number(taxPercent),
    dueDate: dueDate ? String(dueDate) : undefined,
  });
  recordAudit(req, 'Raised client invoice', invoice?.number || 'New invoice');
  return res.status(201).json({ invoice });
});

agencyRouter.patch('/invoices/:id', (req, res) => {
  const actor = currentActor(req);
  if (actor.role !== 'superadmin') {
    return res.status(403).json({ error: 'Only Super Admin can update invoices.' });
  }
  const { status } = req.body || {};
  if (!INVOICE_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Unknown invoice status.' });
  }
  const invoice = agency
    .getAgencyBootstrap(actor)
    .invoices.find((entry) => entry.id === req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });
  const updated = agency.setInvoiceStatus(invoice.id, status);
  recordAudit(req, 'Updated invoice status', invoice.number);
  res.json({ invoice: updated });
});

// ------------------------------------------------------------ notifications

agencyRouter.get('/notifications', (req, res) => {
  const bootstrap = agency.getAgencyBootstrap(currentActor(req));
  res.json({ notifications: bootstrap.notifications, unread: bootstrap.unreadNotifications });
});

agencyRouter.post('/notifications/read-all', (req, res) => {
  const actor = currentActor(req);
  agency.markAllNotificationsRead(actor);
  res.json({ success: true });
});

agencyRouter.post('/notifications/:id/read', (req, res) => {
  const actor = currentActor(req);
  const ok = agency.markNotificationRead(req.params.id, actor);
  if (!ok) return res.status(404).json({ error: 'Notification not found.' });
  res.json({ success: true });
});
