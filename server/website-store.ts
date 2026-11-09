import { dbStore } from './db.ts';
import type {
  AgencyInvoice,
  AgencyOverview,
  AgencyProject,
  WebsiteCategory,
  WebsiteCoupon,
  WebsiteCustomer,
  WebsiteInventoryItem,
  WebsiteInvoice,
  WebsiteMetrics,
  WebsiteOrder,
  WebsitePayment,
  WebsiteReturn,
  WebsiteReturnStatus,
  WebsiteReview,
  WebsiteShipment,
  WebsiteSummary,
  WebsiteWorkspace,
} from '../src/types/crm.ts';

// Each project is one website. Aureva's storefront is wired to the real
// catalog/orders in db.ts, every other demo project gets its own isolated
// synthetic dataset. Nothing here is ever shared between projects.
const LIVE_PROJECT_ID = 'prj-aureva-store';
const LIVE_DOMAIN = 'aureva.com';
const LIVE_LAUNCHED_AT = '2026-01-12T00:00:00Z';
const DAY_MS = 24 * 60 * 60 * 1000;

interface SeedProduct {
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  threshold: number;
}

interface SeedCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
  status?: 'active' | 'blocked';
}

interface SeedOrder {
  number: string;
  customerId: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  lines: { sku: string; quantity: number }[];
}

interface SeedReturn {
  id: string;
  orderNumber: string;
  customerId: string;
  productName: string;
  reason: string;
  status: WebsiteReturnStatus;
  refundAmount: number;
  requestedAt: string;
}

interface SeedCoupon {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  usedCount: number;
  expiryDate: string;
  status: 'active' | 'expired';
}

interface SeedReview {
  id: string;
  productName: string;
  customerId: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  status: 'published' | 'pending';
}

interface TestSiteSeed {
  domain: string;
  launchedAt: string;
  carrier: string;
  products: SeedProduct[];
  customers: SeedCustomer[];
  orders: SeedOrder[];
  returns: SeedReturn[];
  coupons: SeedCoupon[];
  reviews: SeedReview[];
}

const TEST_SITES: Record<string, TestSiteSeed> = {
  // Dummy test site #1: Lumina Interiors demo shop.
  'prj-lumina-site': {
    domain: 'demo.luminainteriors.in',
    launchedAt: '2026-04-18T00:00:00Z',
    carrier: 'Delhivery',
    products: [
      { name: 'Aurelia Lounge Chair', sku: 'LUM-CH-01', category: 'Seating', price: 42900, stock: 6, threshold: 4 },
      { name: 'Halden Oak Side Table', sku: 'LUM-TB-02', category: 'Tables', price: 18500, stock: 12, threshold: 5 },
      { name: 'Sora Pendant Light', sku: 'LUM-LT-03', category: 'Lighting', price: 9600, stock: 3, threshold: 5 },
      { name: 'Kaya Wool Rug 5x8', sku: 'LUM-RG-04', category: 'Rugs', price: 26400, stock: 8, threshold: 4 },
      { name: 'Terra Ceramic Vase Set', sku: 'LUM-DC-05', category: 'Decor', price: 3800, stock: 0, threshold: 6 },
      { name: 'Loom Cushion Cover', sku: 'LUM-TX-06', category: 'Textiles', price: 1450, stock: 22, threshold: 10 },
    ],
    customers: [
      { id: 'lum-c1', name: 'Nisha Rao', email: 'nisha.rao@example.com', phone: '+91 98200 11221', city: 'Mumbai', joinedAt: '2026-06-02T09:10:00Z' },
      { id: 'lum-c2', name: 'Vikram Sethi', email: 'vikram.sethi@example.com', phone: '+91 98110 33445', city: 'New Delhi', joinedAt: '2026-07-19T13:25:00Z' },
      { id: 'lum-c3', name: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '+91 90080 55221', city: 'Bengaluru', joinedAt: '2026-08-11T11:40:00Z' },
      { id: 'lum-c4', name: 'Farah Khan', email: 'farah.khan@example.com', phone: '+91 98220 66778', city: 'Pune', joinedAt: '2026-09-05T16:05:00Z' },
    ],
    orders: [
      { number: 'LUM-2026-4101', customerId: 'lum-c1', createdAt: '2026-09-12T11:20:00Z', status: 'Returned', paymentStatus: 'Refunded', paymentMethod: 'UPI / Instant Pay', lines: [{ sku: 'LUM-LT-03', quantity: 1 }] },
      { number: 'LUM-2026-4102', customerId: 'lum-c1', createdAt: '2026-10-24T10:05:00Z', status: 'Delivered', paymentStatus: 'Paid', paymentMethod: 'UPI / Instant Pay', lines: [{ sku: 'LUM-CH-01', quantity: 1 }, { sku: 'LUM-TX-06', quantity: 2 }] },
      { number: 'LUM-2026-4103', customerId: 'lum-c2', createdAt: '2026-10-26T16:40:00Z', status: 'Shipped', paymentStatus: 'Paid', paymentMethod: 'Credit / Debit Card', lines: [{ sku: 'LUM-TB-02', quantity: 1 }, { sku: 'LUM-LT-03', quantity: 1 }] },
      { number: 'LUM-2026-4104', customerId: 'lum-c3', createdAt: '2026-10-28T09:15:00Z', status: 'Processing', paymentStatus: 'Pending', paymentMethod: 'Cash on Delivery (COD)', lines: [{ sku: 'LUM-RG-04', quantity: 1 }] },
      { number: 'LUM-2026-4105', customerId: 'lum-c4', createdAt: '2026-10-29T18:30:00Z', status: 'Confirmed', paymentStatus: 'Paid', paymentMethod: 'Net Banking', lines: [{ sku: 'LUM-DC-05', quantity: 1 }, { sku: 'LUM-TX-06', quantity: 1 }] },
    ],
    returns: [
      { id: 'RET-LUM-201', orderNumber: 'LUM-2026-4101', customerId: 'lum-c1', productName: 'Sora Pendant Light', reason: 'Shade arrived with a dent', status: 'refunded', refundAmount: 9600, requestedAt: '2026-09-18T12:00:00Z' },
      { id: 'RET-LUM-202', orderNumber: 'LUM-2026-4104', customerId: 'lum-c3', productName: 'Kaya Wool Rug 5x8', reason: 'Size smaller than expected', status: 'requested', refundAmount: 0, requestedAt: '2026-10-29T08:10:00Z' },
    ],
    coupons: [
      { code: 'LUMWELCOME10', description: '10% off the first order above ₹5,000', discountType: 'percentage', discountValue: 10, minimumOrder: 5000, usedCount: 14, expiryDate: '2026-12-31T23:59:59Z', status: 'active' },
      { code: 'LUMFEST2500', description: 'Flat ₹2,500 off festive orders above ₹25,000', discountType: 'fixed', discountValue: 2500, minimumOrder: 25000, usedCount: 3, expiryDate: '2026-11-30T23:59:59Z', status: 'active' },
      { code: 'LUMSPRING15', description: 'Spring clearance 15% off', discountType: 'percentage', discountValue: 15, minimumOrder: 10000, usedCount: 41, expiryDate: '2026-05-31T23:59:59Z', status: 'expired' },
    ],
    reviews: [
      { id: 'rev-lum-01', productName: 'Aurelia Lounge Chair', customerId: 'lum-c1', rating: 5, title: 'Worth every rupee', comment: 'The upholstery is beautiful and the chair is surprisingly light. Delivered in 4 days.', createdAt: '2026-10-26T09:20:00Z', status: 'published' },
      { id: 'rev-lum-02', productName: 'Sora Pendant Light', customerId: 'lum-c2', rating: 4, title: 'Great light, dented shade', comment: 'Light quality is warm and even. Shade had a small dent, support replaced it quickly.', createdAt: '2026-09-20T12:45:00Z', status: 'published' },
      { id: 'rev-lum-03', productName: 'Terra Ceramic Vase Set', customerId: 'lum-c4', rating: 2, title: 'Arrived chipped', comment: 'Two of the three vases were chipped on arrival. Waiting on the return pickup.', createdAt: '2026-10-29T16:10:00Z', status: 'pending' },
    ],
  },
  // Dummy test site #2: Northwind Studios demo shop.
  'prj-northwind-app': {
    domain: 'demo.northwindstudios.in',
    launchedAt: '2026-05-06T00:00:00Z',
    carrier: 'BlueDart',
    products: [
      { name: 'Northwind Studio Tee', sku: 'NW-AP-01', category: 'Apparel', price: 1490, stock: 40, threshold: 10 },
      { name: 'Director Hoodie', sku: 'NW-AP-02', category: 'Apparel', price: 3490, stock: 9, threshold: 12 },
      { name: 'Field Cap', sku: 'NW-AC-03', category: 'Accessories', price: 990, stock: 25, threshold: 8 },
      { name: 'Cinematic LUT Pack', sku: 'NW-DG-04', category: 'Digital', price: 2499, stock: 999, threshold: 0 },
      { name: 'Lighting Workshop Seat', sku: 'NW-WS-05', category: 'Workshops', price: 6990, stock: 4, threshold: 6 },
      { name: 'Behind the Scenes Zine', sku: 'NW-PR-06', category: 'Print', price: 890, stock: 0, threshold: 6 },
    ],
    customers: [
      { id: 'nw-c1', name: 'Rohan Das', email: 'rohan.das@example.com', phone: '+91 98300 77112', city: 'Kolkata', joinedAt: '2026-05-20T10:15:00Z' },
      { id: 'nw-c2', name: 'Meghna Shah', email: 'meghna.shah@example.com', phone: '+91 98250 44331', city: 'Ahmedabad', joinedAt: '2026-06-14T14:50:00Z' },
      { id: 'nw-c3', name: 'Ibrahim Qureshi', email: 'ibrahim.q@example.com', phone: '+91 90000 88211', city: 'Hyderabad', joinedAt: '2026-08-30T09:35:00Z' },
      { id: 'nw-c4', name: 'Tanya Bose', email: 'tanya.bose@example.com', phone: '+91 98670 22119', city: 'Mumbai', joinedAt: '2026-09-22T17:40:00Z' },
    ],
    orders: [
      { number: 'NW-2026-2200', customerId: 'nw-c2', createdAt: '2026-09-30T13:05:00Z', status: 'Cancelled', paymentStatus: 'Refunded', paymentMethod: 'UPI / Instant Pay', lines: [{ sku: 'NW-WS-05', quantity: 1 }] },
      { number: 'NW-2026-2201', customerId: 'nw-c1', createdAt: '2026-10-18T10:20:00Z', status: 'Delivered', paymentStatus: 'Paid', paymentMethod: 'Credit / Debit Card', lines: [{ sku: 'NW-AP-01', quantity: 2 }, { sku: 'NW-AC-03', quantity: 1 }] },
      { number: 'NW-2026-2202', customerId: 'nw-c2', createdAt: '2026-10-21T15:45:00Z', status: 'Delivered', paymentStatus: 'Paid', paymentMethod: 'UPI / Instant Pay', lines: [{ sku: 'NW-DG-04', quantity: 1 }, { sku: 'NW-PR-06', quantity: 2 }] },
      { number: 'NW-2026-2203', customerId: 'nw-c3', createdAt: '2026-10-25T09:30:00Z', status: 'Out for Delivery', paymentStatus: 'Paid', paymentMethod: 'Net Banking', lines: [{ sku: 'NW-AP-02', quantity: 1 }] },
      { number: 'NW-2026-2204', customerId: 'nw-c4', createdAt: '2026-10-27T17:10:00Z', status: 'Processing', paymentStatus: 'Pending', paymentMethod: 'Cash on Delivery (COD)', lines: [{ sku: 'NW-WS-05', quantity: 1 }, { sku: 'NW-AP-01', quantity: 1 }] },
    ],
    returns: [
      { id: 'RET-NW-101', orderNumber: 'NW-2026-2200', customerId: 'nw-c2', productName: 'Lighting Workshop Seat', reason: 'Schedule clash, could not attend', status: 'refunded', refundAmount: 6990, requestedAt: '2026-10-02T11:00:00Z' },
      { id: 'RET-NW-102', orderNumber: 'NW-2026-2201', customerId: 'nw-c1', productName: 'Northwind Studio Tee', reason: 'Print runs small, needs a larger size', status: 'requested', refundAmount: 0, requestedAt: '2026-10-26T14:20:00Z' },
    ],
    coupons: [
      { code: 'STUDIO10', description: '10% off studio apparel above ₹2,000', discountType: 'percentage', discountValue: 10, minimumOrder: 2000, usedCount: 8, expiryDate: '2026-12-15T23:59:59Z', status: 'active' },
      { code: 'SHIPFREE', description: 'Flat ₹500 off orders above ₹1,500', discountType: 'fixed', discountValue: 500, minimumOrder: 1500, usedCount: 22, expiryDate: '2026-12-31T23:59:59Z', status: 'active' },
      { code: 'LUT20', description: '20% off the LUT pack — workshop launch', discountType: 'percentage', discountValue: 20, minimumOrder: 5000, usedCount: 55, expiryDate: '2026-08-31T23:59:59Z', status: 'expired' },
    ],
    reviews: [
      { id: 'rev-nw-01', productName: 'Northwind Studio Tee', customerId: 'nw-c1', rating: 5, title: 'Perfect fit', comment: 'Heavy cotton, holds shape after washes. Bought a second one already.', createdAt: '2026-10-20T11:05:00Z', status: 'published' },
      { id: 'rev-nw-02', productName: 'Cinematic LUT Pack', customerId: 'nw-c2', rating: 4, title: 'Great starting point', comment: 'Neutral grade looks clean on log footage. Would love a night variant.', createdAt: '2026-10-23T08:30:00Z', status: 'published' },
      { id: 'rev-nw-03', productName: 'Director Hoodie', customerId: 'nw-c3', rating: 3, title: 'Sizing runs large', comment: 'Ordered M, fits like L. Fabric is good though.', createdAt: '2026-10-26T19:00:00Z', status: 'pending' },
    ],
  },
};

// Invoices are generated from the website's own orders (18% GST split), so a
// workspace never sees another website's billing records.
function invoicesFor(orders: WebsiteOrder[]): WebsiteInvoice[] {
  return orders
    .filter((order) => order.status !== 'Cancelled' && order.paymentStatus !== 'Refunded')
    .map((order) => {
      const total = Number(order.total.toFixed(2));
      const tax = Number((total - total / 1.18).toFixed(2));
      const amount = Number((total - tax).toFixed(2));
      const dueDate = new Date(new Date(order.createdAt).getTime() + 14 * DAY_MS).toISOString();
      const paid = order.paymentStatus === 'Paid';
      const overdue = !paid && new Date(dueDate).getTime() < Date.now();
      return {
        id: `wsinv-${order.id}`,
        number: `INV-${order.orderNumber}`,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        amount,
        tax,
        total,
        status: paid ? 'paid' : overdue ? 'overdue' : 'sent',
        issuedAt: order.createdAt,
        dueDate,
        paidAt: paid ? new Date(new Date(order.createdAt).getTime() + DAY_MS).toISOString() : undefined,
      } satisfies WebsiteInvoice;
    });
}

function paymentsFor(orders: WebsiteOrder[]): WebsitePayment[] {
  return orders.map((order) => ({
    id: `pay-${order.id}`,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    method: order.paymentMethod,
    status: order.paymentStatus,
    amount: order.total,
    createdAt: order.createdAt,
    settledAt: order.paymentStatus === 'Paid'
      ? new Date(new Date(order.createdAt).getTime() + 3 * 60 * 60 * 1000).toISOString()
      : undefined,
  }));
}

const SHIPMENT_STATUS: Record<string, string> = {
  Pending: 'Awaiting dispatch',
  Confirmed: 'Label created',
  Processing: 'Label created',
  Shipped: 'In transit',
  'Out for Delivery': 'Out for delivery',
  Delivered: 'Delivered',
  Cancelled: 'Not shipped',
  Returned: 'Returned to origin',
};

function shippingFor(orders: WebsiteOrder[], customers: WebsiteCustomer[], carrier: string): WebsiteShipment[] {
  const cityByEmail = new Map(customers.map((customer) => [customer.email, customer.city]));
  return orders.map((order) => ({
    id: `ship-${order.id}`,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    destination: cityByEmail.get(order.customerEmail) || '—',
    carrier,
    status: SHIPMENT_STATUS[order.status] || 'Label created',
    createdAt: order.createdAt,
    expectedAt: order.status === 'Delivered'
      ? undefined
      : new Date(new Date(order.createdAt).getTime() + 5 * DAY_MS).toISOString(),
  }));
}

function categoriesFor(inventory: WebsiteInventoryItem[], orders: WebsiteOrder[]): WebsiteCategory[] {
  const groups = new Map<string, WebsiteCategory>();
  for (const item of inventory) {
    const entry = groups.get(item.category) || { name: item.category, products: 0, stock: 0, lowStock: 0, revenue: 0 };
    entry.products += 1;
    entry.stock += item.stock;
    if (item.stock <= item.lowStockThreshold) entry.lowStock += 1;
    groups.set(item.category, entry);
  }
  for (const order of orders) {
    if (order.status === 'Cancelled') continue;
    for (const line of order.items) {
      const item = inventory.find((entry) => entry.name === line.productName);
      const group = item && groups.get(item.category);
      if (group) group.revenue = Number((group.revenue + line.subtotal).toFixed(2));
    }
  }
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue);
}

function metricsFor(
  orders: WebsiteOrder[],
  customers: WebsiteCustomer[],
  inventory: WebsiteInventoryItem[],
  returns: WebsiteReturn[],
  invoices: WebsiteInvoice[],
): WebsiteMetrics {
  const revenue = Number(
    orders.filter((order) => order.paymentStatus === 'Paid').reduce((sum, order) => sum + order.total, 0).toFixed(2),
  );
  const lastOrderAt = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt;
  return {
    revenue,
    orders: orders.length,
    customers: customers.length,
    returns: returns.length,
    openReturns: returns.filter((item) => item.status === 'requested' || item.status === 'approved').length,
    averageOrderValue: orders.length ? Number((revenue / orders.length).toFixed(2)) : 0,
    lowStock: inventory.filter((item) => item.stock <= item.lowStockThreshold).length,
    outstandingInvoices: Number(
      invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.total, 0).toFixed(2),
    ),
    lastOrderAt,
  };
}

function buildTestWorkspace(project: AgencyProject, seed: TestSiteSeed): WebsiteWorkspace {
  const inventory: WebsiteInventoryItem[] = seed.products.map((product) => ({
    id: `item-${product.sku}`,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    stock: product.stock,
    lowStockThreshold: product.threshold,
    updatedAt: '2026-10-30T07:30:00Z',
  }));

  const seedCustomers = new Map(seed.customers.map((customer) => [customer.id, customer]));

  const orders: WebsiteOrder[] = seed.orders.map((order) => {
    const customer = seedCustomers.get(order.customerId)!;
    const items = order.lines.map((line) => {
      const product = seed.products.find((entry) => entry.sku === line.sku)!;
      return {
        productName: product.name,
        quantity: line.quantity,
        unitPrice: product.price,
        subtotal: product.price * line.quantity,
      };
    });
    return {
      id: `wsord-${order.number.toLowerCase()}`,
      orderNumber: order.number,
      customerName: customer.name,
      customerEmail: customer.email,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)),
      items,
    };
  });

  const customers: WebsiteCustomer[] = seed.customers.map((customer) => {
    const own = orders.filter((order) => order.customerEmail === customer.email);
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      orders: own.length,
      lifetimeSpend: Number(
        own.filter((order) => order.paymentStatus === 'Paid').reduce((sum, order) => sum + order.total, 0).toFixed(2),
      ),
      joinedAt: customer.joinedAt,
      status: customer.status || 'active',
    };
  });

  const returns: WebsiteReturn[] = seed.returns.map((item) => {
    const customer = seedCustomers.get(item.customerId)!;
    return {
      id: item.id,
      orderNumber: item.orderNumber,
      customerName: customer.name,
      productName: item.productName,
      reason: item.reason,
      status: item.status,
      refundAmount: item.refundAmount,
      requestedAt: item.requestedAt,
    };
  });

  const invoices = invoicesFor(orders);
  const coupons: WebsiteCoupon[] = seed.coupons.map((coupon) => ({ ...coupon }));
  const reviews: WebsiteReview[] = seed.reviews.map((review) => ({
    id: review.id,
    productName: review.productName,
    customerName: seedCustomers.get(review.customerId)?.name || 'Guest',
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    createdAt: review.createdAt,
    status: review.status,
  }));

  return {
    projectId: project.id,
    clientId: project.clientId,
    name: project.name,
    kind: 'test',
    domain: seed.domain,
    launchedAt: seed.launchedAt,
    orders,
    inventory,
    customers,
    returns,
    invoices,
    payments: paymentsFor(orders),
    shipping: shippingFor(orders, customers, seed.carrier),
    coupons,
    categories: categoriesFor(inventory, orders),
    reviews,
    metrics: metricsFor(orders, customers, inventory, returns, invoices),
    lastSyncedAt: new Date().toISOString(),
  };
}

// The real e-commerce website reads live storefront data from dbStore, which is
// the same source the CRM catalog modules use.
function buildLiveWorkspace(project: AgencyProject): WebsiteWorkspace {
  const rawOrders = dbStore.getOrders();

  const orders: WebsiteOrder[] = rawOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  }));

  const inventory: WebsiteInventoryItem[] = dbStore.getProducts({ limit: 500 }).products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.basePrice,
    stock: product.totalStock,
    lowStockThreshold: 15,
    image: product.thumbnail,
    updatedAt: product.createdAt,
  }));

  const customers: WebsiteCustomer[] = dbStore
    .getCustomers()
    .filter((user) => user.role === 'customer')
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '—',
      city: user.savedAddresses.find((address) => address.isDefault)?.city || user.savedAddresses[0]?.city || '—',
      orders: user.orderCount,
      lifetimeSpend: user.lifetimeSpend,
      joinedAt: user.createdAt,
      status: user.isActive === false ? 'blocked' : 'active',
    }));

  const returns: WebsiteReturn[] = rawOrders
    .filter((order) => order.status === 'Returned' || order.paymentStatus === 'Refunded')
    .map((order) => ({
      id: `ret-${order.id}`,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      productName: order.items.map((item) => item.productName).join(', ') || 'Order items',
      reason: order.returnReason || 'Customer return',
      status: order.paymentStatus === 'Refunded' ? 'refunded' : 'requested',
      refundAmount: order.paymentStatus === 'Refunded' ? order.total : 0,
      requestedAt: order.updatedAt,
    }));

  const invoices = invoicesFor(orders);

  // Coupons and reviews come from the live storefront records, not from a
  // shared agency pool, so this workspace only ever shows Aureva's own data.
  const coupons: WebsiteCoupon[] = dbStore.getCoupons().map((coupon) => ({
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    usedCount: coupon.usedCount,
    expiryDate: coupon.expiryDate,
    status: coupon.isActive && new Date(coupon.expiryDate).getTime() > Date.now() ? 'active' : 'expired',
  }));

  const reviews: WebsiteReview[] = dbStore.getAllReviews().map((review) => ({
    id: review.id,
    productName: review.productName,
    customerName: review.userName,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    createdAt: review.createdAt,
    status: review.isApproved === false ? 'pending' : 'published',
  }));

  return {
    projectId: project.id,
    clientId: project.clientId,
    name: project.name,
    kind: 'live',
    domain: LIVE_DOMAIN,
    launchedAt: LIVE_LAUNCHED_AT,
    orders,
    inventory,
    customers,
    returns,
    invoices,
    payments: paymentsFor(orders),
    shipping: shippingFor(orders, customers, 'Aureva Express'),
    coupons,
    categories: categoriesFor(inventory, orders),
    reviews,
    metrics: metricsFor(orders, customers, inventory, returns, invoices),
    lastSyncedAt: new Date().toISOString(),
  };
}

function buildEmptyWorkspace(project: AgencyProject): WebsiteWorkspace {
  return {
    projectId: project.id,
    clientId: project.clientId,
    name: project.name,
    kind: 'test',
    domain: 'not-connected',
    launchedAt: project.startDate,
    orders: [],
    inventory: [],
    customers: [],
    returns: [],
    invoices: [],
    payments: [],
    shipping: [],
    coupons: [],
    categories: [],
    reviews: [],
    metrics: metricsFor([], [], [], [], []),
    lastSyncedAt: new Date().toISOString(),
  };
}

export function getWebsiteWorkspace(project: AgencyProject): WebsiteWorkspace {
  if (project.id === LIVE_PROJECT_ID) return buildLiveWorkspace(project);
  const seed = TEST_SITES[project.id];
  return seed ? buildTestWorkspace(project, seed) : buildEmptyWorkspace(project);
}

export function getWebsiteSummary(project: AgencyProject): WebsiteSummary {
  const workspace = getWebsiteWorkspace(project);
  return {
    kind: workspace.kind,
    domain: workspace.domain,
    launchedAt: workspace.launchedAt,
    metrics: workspace.metrics,
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Agency dashboard roll-up: every visible client project is added together, so
// the headline numbers match the per-client totals shown in the Clients table.
export function getAgencyOverview(
  projects: AgencyProject[],
  invoices: AgencyInvoice[],
  clients: { id: string; name: string }[],
): AgencyOverview {
  const round = (value: number) => Number(value.toFixed(2));
  const workspaces = projects.map((project) => ({ project, workspace: getWebsiteWorkspace(project) }));
  const clientName = (clientId: string) => clients.find((client) => client.id === clientId)?.name || 'Unassigned client';

  const revenue = round(invoices.reduce((sum, invoice) => sum + invoice.total, 0));
  const collected = round(
    invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0),
  );
  const storefrontRevenue = round(workspaces.reduce((sum, entry) => sum + entry.workspace.metrics.revenue, 0));
  const orders = workspaces.reduce((sum, entry) => sum + entry.workspace.metrics.orders, 0);
  const customers = workspaces.reduce((sum, entry) => sum + entry.workspace.metrics.customers, 0);
  const openReturns = workspaces.reduce((sum, entry) => sum + entry.workspace.metrics.openReturns, 0);

  // Billing trend for the last 12 months, so every invoice raised in that
  // window is represented and the chart total equals the headline figure.
  const buckets: string[] = [];
  const now = new Date();
  for (let back = 11; back >= 0; back -= 1) {
    buckets.push(monthKey(new Date(now.getFullYear(), now.getMonth() - back, 1)));
  }
  const monthly = buckets.map((key) => ({
    month: `${MONTH_LABELS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`,
    revenue: 0,
  }));
  const bucketIndex = new Map(buckets.map((key, index) => [key, index]));
  for (const invoice of invoices) {
    const index = bucketIndex.get(monthKey(new Date(invoice.issuedAt)));
    if (index === undefined) continue;
    monthly[index].revenue = round(monthly[index].revenue + invoice.total);
  }

  const byClient = clients
    .map((client) => {
      const own = invoices.filter((invoice) => invoice.clientId === client.id);
      const invoiced = round(own.reduce((sum, invoice) => sum + invoice.total, 0));
      return {
        clientId: client.id,
        clientName: client.name,
        projects: projects.filter((project) => project.clientId === client.id).length,
        invoiced,
        collected: round(own.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0)),
        share: revenue ? Number(((invoiced / revenue) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.invoiced - a.invoiced);

  const categoryTotals = new Map<string, number>();
  for (const { workspace } of workspaces) {
    for (const category of workspace.categories) {
      categoryTotals.set(category.name, round((categoryTotals.get(category.name) || 0) + category.revenue));
    }
  }
  const categoryTotal = [...categoryTotals.values()].reduce((sum, value) => sum + value, 0);
  const salesByCategory = [...categoryTotals.entries()]
    .map(([category, amount]) => ({
      category,
      revenue: amount,
      percentage: categoryTotal ? Number(((amount / categoryTotal) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const lowStock = workspaces
    .flatMap(({ project, workspace }) =>
      workspace.inventory
        .filter((item) => item.stock <= item.lowStockThreshold)
        .map((item) => ({
          projectId: project.id,
          projectName: project.name,
          clientName: clientName(project.clientId),
          name: item.name,
          sku: item.sku,
          stock: item.stock,
          threshold: item.lowStockThreshold,
        })),
    )
    .sort((a, b) => a.stock - a.threshold - (b.stock - b.threshold))
    .slice(0, 6);

  const allOrders = workspaces
    .flatMap(({ project, workspace }) =>
      workspace.orders.map((order) => ({
        projectId: project.id,
        projectName: project.name,
        clientName: clientName(project.clientId),
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
      })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const allCustomers = workspaces
    .flatMap(({ project, workspace }) =>
      workspace.customers.map((customer) => ({
        projectId: project.id,
        projectName: project.name,
        clientName: clientName(project.clientId),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        orders: customer.orders,
        lifetimeSpend: customer.lifetimeSpend,
        status: customer.status,
      })),
    )
    .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);

  return {
    clients: clients.length,
    projects: projects.length,
    billedClients: byClient.filter((client) => client.invoiced > 0).length,
    revenue,
    collected,
    outstanding: round(revenue - collected),
    storefrontRevenue,
    orders,
    customers,
    averageOrderValue: orders ? round(storefrontRevenue / orders) : 0,
    openReturns,
    monthly,
    byClient,
    salesByCategory,
    lowStock,
    recentOrders: allOrders.slice(0, 6),
    allOrders,
    allCustomers,
  };
}
