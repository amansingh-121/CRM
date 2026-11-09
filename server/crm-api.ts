import { NextFunction, Request, Response, Router } from 'express';
import { dbStore } from './db.ts';
import {
  ActivityLog,
  ALL_PERMISSIONS,
  CrmAdmin,
  LoginSession,
  Permission,
  RoleDefinition,
  SecuritySettings,
  WebsiteSettings,
} from '../src/types/crm.ts';
import { User } from '../src/types/ecommerce.ts';
import { pushNotification } from './agency-store.ts';

export const crmRouter = Router();

const CLIENT_PERMISSIONS: Permission[] = [
  'dashboard:view', 'products:manage', 'orders:manage', 'inventory:manage',
  'customers:manage', 'payments:manage', 'coupons:manage', 'categories:manage',
  'reports:view', 'website:manage', 'returns:manage', 'shipping:manage',
  'reviews:manage', 'activity:view',
];

const roles: RoleDefinition[] = [
  {
    id: 'role-super', name: 'Super Admin', description: 'Complete platform control with audited access.',
    permissions: ALL_PERMISSIONS, color: '#6d4aff', system: true,
  },
  {
    id: 'role-client', name: 'Client / Store Owner', description: 'Complete business and storefront control without platform security access.',
    permissions: CLIENT_PERMISSIONS, color: '#0891b2', system: true,
  },
  {
    id: 'role-operations', name: 'Operations Admin', description: 'Products, orders, fulfillment, customers and returns.',
    permissions: ['dashboard:view', 'admins:manage', 'products:manage', 'orders:manage', 'shipping:manage', 'returns:manage', 'customers:manage', 'inventory:manage', 'reports:view', 'activity:view'],
    color: '#2563eb', system: true,
  },
  {
    id: 'role-inventory', name: 'Inventory Manager', description: 'Catalog stock and category operations only.',
    permissions: ['dashboard:view', 'products:manage', 'inventory:manage', 'categories:manage'],
    color: '#059669',
  },
  {
    id: 'role-support', name: 'Customer Support', description: 'Customer care, reviews and return requests.',
    permissions: ['dashboard:view', 'customers:manage', 'orders:manage', 'returns:manage', 'reviews:manage'],
    color: '#d97706',
  },
];

const assignments = new Map<string, { roleId: string; title: string; permissions?: Permission[] }>([
  ['usr-superadmin', { roleId: 'role-super', title: 'Platform Owner' }],
  ['usr-client', { roleId: 'role-client', title: 'Website Owner' }],
  ['usr-admin-1', { roleId: 'role-operations', title: 'Operations Lead' }],
]);

function ensureStaff(email: string, name: string, roleId: string, title: string) {
  let user = dbStore.getUserByEmail(email);
  if (!user) user = dbStore.createUser({ name, email, role: 'admin' });
  assignments.set(user.id, { roleId, title });
}

ensureStaff('inventory@aureva.com', 'Priya Sharma', 'role-inventory', 'Inventory Manager');
ensureStaff('support@aureva.com', 'Kabir Mehta', 'role-support', 'Support Specialist');

let logs: ActivityLog[] = [
  { id: 'log-1', actorId: 'usr-superadmin', actorName: 'Aman Verma', actorRole: 'superadmin', action: 'Updated security policy', target: 'Two-factor authentication', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 18 * 60000).toISOString(), severity: 'critical' },
  { id: 'log-2', actorId: 'usr-admin-1', actorName: 'Rohit Sharma', actorRole: 'admin', action: 'Updated order status', target: 'ORD-2026-9043', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 52 * 60000).toISOString(), severity: 'info' },
  { id: 'log-3', actorId: 'usr-superadmin', actorName: 'Aman Verma', actorRole: 'superadmin', action: 'Changed admin permissions', target: 'Inventory Manager role', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 3 * 3600000).toISOString(), severity: 'warning' },
  { id: 'log-4', actorId: 'usr-admin-1', actorName: 'Rohit Sharma', actorRole: 'admin', action: 'Processed return request', target: 'ORD-2026-9042', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 6 * 3600000).toISOString(), severity: 'info' },
];

let sessions: LoginSession[] = [
  { id: 'session-1', userId: 'usr-superadmin', userName: 'Aman Verma', device: 'Chrome · Windows', location: 'Mumbai, IN', lastActive: new Date().toISOString(), current: true },
  { id: 'session-2', userId: 'usr-admin-1', userName: 'Rohit Sharma', device: 'Safari · macOS', location: 'Bengaluru, IN', lastActive: new Date(Date.now() - 24 * 60000).toISOString(), current: false },
  { id: 'session-3', userId: 'usr-superadmin', userName: 'Aman Verma', device: 'Safari · iPhone', location: 'Mumbai, IN', lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), current: false },
];

let security: SecuritySettings = {
  twoFactorRequired: true,
  approvalForRefunds: true,
  approvalForAdminChanges: true,
  sessionTimeout: 30,
  failedLoginLimit: 5,
};

let website: WebsiteSettings = {
  storeName: 'Aureva Commerce',
  supportEmail: 'care@aureva.com',
  announcement: 'Complimentary shipping on orders over ₹2,999',
  heroTitle: 'Considered pieces for modern living.',
  maintenanceMode: false,
};

export function getActor(req: Request): User | undefined {
  const authorization = req.headers.authorization || '';
  const tokenId = authorization.startsWith('Bearer ') ? authorization.slice(7).replace('jwt-demo-', '') : '';
  const userId = tokenId || String(req.headers['x-user-id'] || '');
  const user = userId ? dbStore.getUserById(userId) : undefined;
  return user?.isActive === false ? undefined : user;
}

export function getPermissions(user: User): Permission[] {
  if (user.role === 'superadmin') return ALL_PERMISSIONS;
  if (user.role === 'client') return CLIENT_PERMISSIONS;
  if (user.role !== 'admin') return [];
  const assignment = assignments.get(user.id);
  if (assignment?.permissions) return assignment.permissions;
  return roles.find((role) => role.id === assignment?.roleId)?.permissions || [];
}

export function hasPermission(user: User | undefined, permission: Permission): boolean {
  return Boolean(user && (user.role === 'superadmin' || getPermissions(user).includes(permission)));
}

function rolePermissions(roleId: string): Permission[] {
  return roles.find((role) => role.id === roleId)?.permissions || [];
}

// Staff can hand out access only up to the level they already hold, so admins
// with 'admins:manage' cannot escalate privileges beyond their own account.
function canGrant(actor: User, permissions: Permission[]): boolean {
  if (actor.role === 'superadmin') return true;
  const owned = getPermissions(actor);
  return permissions.every((permission) => owned.includes(permission));
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  const actor = getActor(req);
  if (!actor || actor.role === 'customer') return res.status(403).json({ error: 'Staff access is required.' });
  (req as Request & { actor?: User }).actor = actor;
  return next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const actor = getActor(req);
    if (!hasPermission(actor, permission)) return res.status(403).json({ error: `Missing permission: ${permission}` });
    return next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const actor = getActor(req);
    if (!actor || !permissions.some((permission) => hasPermission(actor, permission))) {
      return res.status(403).json({ error: 'Your assigned role does not allow this action.' });
    }
    return next();
  };
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const actor = getActor(req);
  if (actor?.role !== 'superadmin') return res.status(403).json({ error: 'Only Super Admin can perform this action.' });
  return next();
}

export function recordAudit(req: Request, action: string, target: string, severity: ActivityLog['severity'] = 'info') {
  const actor = getActor(req);
  if (!actor) return;
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    target,
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    severity,
  });
}

export function requireCrmAccess(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase();
  let permission: Permission = 'dashboard:view';
  if (path.includes('products')) permission = req.method === 'PUT' && Object.keys(req.body || {}).every((key) => ['totalStock', 'inStock'].includes(key)) ? 'inventory:manage' : 'products:manage';
  else if (path.includes('coupons')) permission = 'coupons:manage';
  else if (path.includes('customers')) permission = 'customers:manage';
  else if (path.includes('categories')) permission = 'categories:manage';
  else if (path.includes('reviews')) permission = 'reviews:manage';
  return requireAnyPermission(permission)(req, res, next);
}

function adminView(user: User): CrmAdmin {
  const assignment = assignments.get(user.id) || { roleId: 'role-operations', title: 'Store Admin' };
  return {
    ...user,
    roleId: user.role === 'superadmin' ? 'role-super' : user.role === 'client' ? 'role-client' : assignment.roleId,
    title: user.role === 'superadmin' ? 'Platform Owner' : user.role === 'client' ? 'Website Owner' : assignment.title,
    lastActive: user.id === 'usr-superadmin' ? new Date().toISOString() : '2026-10-30T09:30:00Z',
    permissions: getPermissions(user),
  };
}

crmRouter.use(requireStaff);

crmRouter.get('/bootstrap', (req, res) => {
  const actor = getActor(req)!;
  const canViewAllLogs = actor.role === 'superadmin';
  const canViewTeam = actor.role === 'superadmin' || hasPermission(actor, 'admins:manage');
  const staffUsers = dbStore.getUsers().filter((user) => user.role !== 'customer');
  res.json({
    actorId: actor.id,
    admins: (canViewTeam ? staffUsers : staffUsers.filter((user) => user.id === actor.id)).map(adminView),
    roles,
    logs: canViewAllLogs ? logs : logs.filter((log) => log.actorId === actor.id),
    sessions: actor.role === 'superadmin' ? sessions : sessions.filter((session) => session.userId === actor.id),
    security,
    website,
    permissions: getPermissions(actor),
  });
});

crmRouter.post('/admins', requirePermission('admins:manage'), (req, res) => {
  const actor = getActor(req)!;
  const { name, email, phone, roleId, title, permissions } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
  if (dbStore.getUserByEmail(email)) return res.status(409).json({ error: 'A user with this email already exists.' });
  const targetRoleId = roleId || 'role-operations';
  if (!roles.some((role) => role.id === targetRoleId)) return res.status(400).json({ error: 'Assign a valid role.' });
  if (actor.role !== 'superadmin' && ['role-super', 'role-client'].includes(targetRoleId)) {
    return res.status(403).json({ error: 'Only Super Admin can assign this role.' });
  }
  const grant = Array.isArray(permissions) ? permissions.filter((item): item is Permission => ALL_PERMISSIONS.includes(item)) : [];
  const effective = grant.length ? grant : rolePermissions(targetRoleId);
  if (!canGrant(actor, effective)) return res.status(403).json({ error: 'You cannot grant permissions beyond your own access.' });
  const user = dbStore.createUser({ name, email, phone, role: 'admin' });
  assignments.set(user.id, {
    roleId: targetRoleId,
    title: title || roles.find((role) => role.id === targetRoleId)?.name || 'Admin',
    permissions: grant.length ? grant : undefined,
  });
  recordAudit(req, 'Created admin account', email, 'warning');
  res.status(201).json({ admin: adminView(user) });
});

crmRouter.patch('/admins/:id', requirePermission('admins:manage'), (req, res) => {
  const actor = getActor(req)!;
  const target = dbStore.getUserById(req.params.id);
  if (!target || target.role === 'customer') return res.status(404).json({ error: 'Admin not found.' });
  if (target.role === 'superadmin') return res.status(403).json({ error: 'The Super Admin account is protected.' });
  if (actor.role !== 'superadmin' && target.role !== 'admin') return res.status(403).json({ error: 'You can only manage admin accounts.' });
  const { name, email, phone, roleId, title, isActive, permissions } = req.body;
  if (actor.id === target.id && (roleId || permissions || isActive === false)) return res.status(403).json({ error: 'You cannot change your own access level.' });
  if (roleId && !roles.some((role) => role.id === roleId)) return res.status(400).json({ error: 'Assign a valid role.' });
  if (roleId === 'role-super') return res.status(403).json({ error: 'Admins cannot be promoted to Super Admin.' });
  if (actor.role !== 'superadmin' && roleId === 'role-client') return res.status(403).json({ error: 'Only Super Admin can assign this role.' });
  const current = assignments.get(target.id);
  const nextRoleId = roleId || current?.roleId || 'role-operations';
  const nextPermissions = Array.isArray(permissions) ? permissions.filter((item): item is Permission => ALL_PERMISSIONS.includes(item)) : current?.permissions;
  const currentPermissions = getPermissions(target);
  const elevated = (nextPermissions || rolePermissions(nextRoleId)).filter((permission) => !currentPermissions.includes(permission));
  if (!canGrant(actor, elevated)) return res.status(403).json({ error: 'You cannot grant permissions beyond your own access.' });
  const updated = dbStore.updateUser(target.id, { name, email, phone, isActive });
  assignments.set(target.id, {
    roleId: nextRoleId,
    title: title || current?.title || 'Store Admin',
    permissions: nextPermissions,
  });
  recordAudit(req, isActive === false ? 'Suspended admin account' : 'Updated admin access', target.email, 'warning');
  res.json({ admin: adminView(updated!) });
});

crmRouter.delete('/admins/:id', requirePermission('admins:manage'), (req, res) => {
  const actor = getActor(req)!;
  const target = dbStore.getUserById(req.params.id);
  if (!target) return res.status(404).json({ error: 'Admin not found.' });
  if (target.role === 'superadmin' || target.id === actor.id) return res.status(403).json({ error: 'This account cannot be deleted.' });
  if (actor.role !== 'superadmin' && target.role !== 'admin') return res.status(403).json({ error: 'You can only manage admin accounts.' });
  dbStore.deleteUser(target.id);
  assignments.delete(target.id);
  recordAudit(req, 'Deleted admin account', target.email, 'critical');
  res.json({ success: true });
});

crmRouter.post('/roles', requireSuperAdmin, (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name || !Array.isArray(permissions)) return res.status(400).json({ error: 'Role name and permissions are required.' });
  const role: RoleDefinition = { id: `role-${Date.now()}`, name, description: description || 'Custom staff role', permissions: permissions.filter((item: Permission) => ALL_PERMISSIONS.includes(item)), color: '#7c3aed' };
  roles.push(role);
  recordAudit(req, 'Created access role', name, 'warning');
  res.status(201).json({ role });
});

crmRouter.patch('/roles/:id', requireSuperAdmin, (req, res) => {
  const role = roles.find((entry) => entry.id === req.params.id);
  if (!role) return res.status(404).json({ error: 'Role not found.' });
  if (role.id === 'role-super') return res.status(403).json({ error: 'Super Admin permissions cannot be changed.' });
  const { name, description, permissions } = req.body;
  if (name) role.name = name;
  if (description) role.description = description;
  if (Array.isArray(permissions)) role.permissions = permissions.filter((item: Permission) => ALL_PERMISSIONS.includes(item));
  recordAudit(req, 'Changed role permissions', role.name, 'warning');
  res.json({ role });
});

crmRouter.put('/security', requirePermission('security:manage'), (req, res) => {
  security = { ...security, ...req.body };
  recordAudit(req, 'Updated security configuration', 'Platform security', 'critical');
  res.json({ security });
});

crmRouter.put('/website', requirePermission('website:manage'), (req, res) => {
  website = { ...website, ...req.body };
  recordAudit(req, 'Updated website settings', website.storeName);
  res.json({ website });
});

crmRouter.delete('/sessions/:id', requirePermission('security:manage'), (req, res) => {
  const session = sessions.find((entry) => entry.id === req.params.id);
  sessions = sessions.filter((entry) => entry.id !== req.params.id);
  recordAudit(req, 'Revoked login session', session?.device || req.params.id, 'warning');
  res.json({ success: true });
});

crmRouter.post('/orders/:id/refund', requirePermission('payments:manage'), (req, res) => {
  const order = dbStore.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const actor = getActor(req)!;
  if (security.approvalForRefunds && actor.role === 'admin') {
    recordAudit(req, 'Requested refund approval', order.orderNumber, 'warning');
    pushNotification({
      title: 'Refund approval requested',
      body: `${actor.name} raised a refund for ${order.orderNumber}. Super Admin sign-off is required.`,
      kind: 'refund',
      scope: 'staff',
      clientId: order.clientId,
    });
    return res.status(202).json({ order, message: 'Refund sent for Super Admin approval.' });
  }
  const updated = dbStore.updatePaymentStatus(order.id, 'Refunded');
  recordAudit(req, 'Processed payment refund', order.orderNumber, 'critical');
  res.json({ order: updated, message: 'Refund processed successfully.' });
});
