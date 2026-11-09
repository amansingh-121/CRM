import { Router, Request, Response } from 'express';
import { dbStore } from './db.ts';
import { agencyRouter } from './agency-api.ts';
import { storeClientIdFor } from './agency-store.ts';
import {
  crmRouter,
  getActor,
  recordAudit,
  requireAnyPermission,
  requireCrmAccess,
} from './crm-api.ts';

export const apiRouter = Router();
apiRouter.use('/crm', crmRouter);
apiRouter.use('/agency', agencyRouter);

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------

// The CRM only accepts staff and client accounts. Customer storefront accounts
// are rejected here so the CRM stays fully independent from the shop.
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = dbStore.getUserByEmail(email.trim().toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'No CRM account exists for this email.' });
  }
  if (user.role === 'customer') {
    return res.status(403).json({ error: 'Customer accounts cannot access the CRM.' });
  }
  if (user.isActive === false) {
    return res.status(403).json({ error: 'This account has been deactivated.' });
  }

  return res.json({ user, token: `jwt-demo-${user.id}` });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({ user: actor });
});

// ----------------------------------------------------
// CATALOG ENDPOINTS
// ----------------------------------------------------

apiRouter.get('/products', (req: Request, res: Response) => {
  const { search, category, subcategory, brand, minPrice, maxPrice, minRating, inStockOnly, sort, page, limit } = req.query;

  const result = dbStore.getProducts({
    search: search ? String(search) : undefined,
    category: category ? String(category) : undefined,
    subcategory: subcategory ? String(subcategory) : undefined,
    brand: brand ? String(brand) : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    inStockOnly: inStockOnly === 'true',
    sort: sort as any,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 24,
  });

  return res.json(result);
});

apiRouter.get('/categories', (_req: Request, res: Response) => {
  return res.json({ categories: dbStore.getCategories() });
});

// ----------------------------------------------------
// ORDER ENDPOINTS
// ----------------------------------------------------

apiRouter.get('/orders', (req: Request, res: Response) => {
  const actor = getActor(req);
  if (!actor) return res.status(401).json({ error: 'Sign in to view orders.' });
  const requestedUserId = req.query.userId ? String(req.query.userId) : undefined;
  const userId = actor.role === 'customer' ? actor.id : requestedUserId;
  return res.json({ orders: dbStore.getOrders(userId) });
});

apiRouter.patch('/orders/:id/status', requireAnyPermission('orders:manage', 'shipping:manage', 'returns:manage'), (req: Request, res: Response) => {
  const { status, note } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const result = dbStore.updateOrderStatus(req.params.id, status, note);
  if (!result.success || !result.updatedOrder) {
    return res.status(400).json({ error: result.error || 'Failed to update order' });
  }
  recordAudit(req, 'Updated order status', `${result.updatedOrder.orderNumber} → ${status}`);
  return res.json({ order: result.updatedOrder });
});

// ----------------------------------------------------
// ADMIN SUITE ENDPOINTS
// ----------------------------------------------------

apiRouter.use('/admin', requireCrmAccess, (req: Request, _res: Response, next) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    const moduleName = req.path.split('/').filter(Boolean)[0] || 'commerce';
    recordAudit(req, `${req.method} ${moduleName}`, req.path, req.method === 'DELETE' ? 'critical' : 'info');
  }
  next();
});

apiRouter.get('/admin/stats', (_req: Request, res: Response) => {
  return res.json({ stats: dbStore.getAdminStats() });
});

apiRouter.post('/admin/products', (req: Request, res: Response) => {
  const productData = req.body;
  if (!productData.name || !productData.basePrice) {
    return res.status(400).json({ error: 'Product name and base price are required' });
  }
  if (typeof productData.thumbnail === 'string' && productData.thumbnail.length > 5_000_000) {
    return res.status(400).json({ error: 'Product photo is too large. Use an image under 3 MB.' });
  }
  const created = dbStore.createProduct({ ...productData, clientId: storeClientIdFor(getActor(req)!) });
  return res.status(201).json({ product: created });
});

apiRouter.put('/admin/products/:id', (req: Request, res: Response) => {
  if (typeof req.body.thumbnail === 'string' && req.body.thumbnail.length > 5_000_000) {
    return res.status(400).json({ error: 'Product photo is too large. Use an image under 3 MB.' });
  }
  const updated = dbStore.updateProduct(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Product not found' });
  }
  return res.json({ product: updated });
});

apiRouter.delete('/admin/products/:id', (req: Request, res: Response) => {
  const ok = dbStore.deleteProduct(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Product not found' });
  }
  return res.json({ success: true });
});

apiRouter.get('/admin/coupons', (_req: Request, res: Response) => {
  return res.json({ coupons: dbStore.getCoupons() });
});

apiRouter.post('/admin/coupons', (req: Request, res: Response) => {
  const coupon = req.body;
  if (!coupon.code || !coupon.discountValue) {
    return res.status(400).json({ error: 'Coupon code and value are required' });
  }
  return res.status(201).json({ coupon: dbStore.createCoupon(coupon) });
});

apiRouter.put('/admin/coupons/:code', (req: Request, res: Response) => {
  const updated = dbStore.updateCoupon(req.params.code, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Coupon not found' });
  }
  return res.json({ coupon: updated });
});

apiRouter.get('/admin/customers', (_req: Request, res: Response) => {
  return res.json({ customers: dbStore.getCustomers() });
});

apiRouter.put('/admin/customers/:id/toggle', (req: Request, res: Response) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be a boolean' });
  }
  const user = dbStore.toggleUserActive(req.params.id, isActive);
  if (!user) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  return res.json({ user });
});

apiRouter.post('/admin/categories', (req: Request, res: Response) => {
  const { name, description, imageUrl, subcategories } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const created = dbStore.createCategory({
    name,
    slug,
    description: description || '',
    imageUrl: imageUrl || undefined,
    productCount: 0,
    subcategories: Array.isArray(subcategories) ? subcategories : [],
  });
  return res.status(201).json({ category: created });
});

apiRouter.put('/admin/categories/:id', (req: Request, res: Response) => {
  const updates = { ...req.body };
  if (updates.name) {
    updates.slug = String(updates.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
  const updated = dbStore.updateCategory(req.params.id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Category not found' });
  }
  return res.json({ category: updated });
});

apiRouter.delete('/admin/categories/:id', (req: Request, res: Response) => {
  const result = dbStore.deleteCategory(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error || 'Failed to delete category' });
  }
  return res.json({ success: true });
});

apiRouter.get('/admin/reviews', (_req: Request, res: Response) => {
  const reviews = dbStore.getAllReviews();
  return res.json({ reviews, count: reviews.length });
});

apiRouter.post('/admin/reviews/:id/moderate', (req: Request, res: Response) => {
  const action = req.query.action || req.body.action;
  if (!['approve', 'reject', 'delete'].includes(String(action))) {
    return res.status(400).json({ error: 'Action must be approve, reject or delete' });
  }

  const result = dbStore.moderateReview(req.params.id, action as 'approve' | 'reject' | 'delete');
  if (!result.success) {
    return res.status(404).json({ error: result.error || 'Review not found' });
  }
  return res.json({ review: result.review });
});
