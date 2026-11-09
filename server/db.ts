import {
  Product,
  Category,
  Coupon,
  Order,
  Review,
  User,
  AdminStats,
  OrderStatus,
  AdminReview,
  AdminCustomer,
  FeaturedReview,
  InvoiceData,
} from '../src/types/ecommerce.ts';
import { transitionOrder } from '../src/utils/order-engine.ts';
import {
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_FEE,
  EXPRESS_SHIPPING_FEE,
  TAX_RATE,
} from '../src/utils/cart-calculator.ts';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from "../src/data/initialCatalog.ts";
export { INITIAL_CATEGORIES, INITIAL_PRODUCTS };

// Products and categories (including uploaded product photos) are snapshotted to
// disk so anything added from the CRM survives a server restart.
const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');

// Every store record is owned by a client tenant. The demo storefront belongs to
// the seeded Aureva tenant, so records created before multi-tenancy are tagged here.
export const DEFAULT_STORE_CLIENT_ID = 'ten-aureva';

function readSavedCatalog(): { products: Product[]; categories: Category[] } | null {
  if (!existsSync(CATALOG_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CATALOG_FILE, 'utf8'));
    if (!Array.isArray(parsed.products) || !Array.isArray(parsed.categories)) return null;
    return { products: parsed.products as Product[], categories: parsed.categories as Category[] };
  } catch (error) {
    console.error('Ignoring unreadable catalog snapshot:', error);
    return null;
  }
}

// Active coupons
export const INITIAL_COUPONS: Coupon[] = [
  {
    code: 'AUREVA10',
    discountType: 'percentage',
    discountValue: 10,
    minimumOrder: 999,
    maximumDiscount: 500,
    expiryDate: '2030-12-31T23:59:59Z',
    usageLimit: 5000,
    usedCount: 12,
    isActive: true,
    description: 'Extra 10% off orders over ₹999 (up to ₹500 off)',
  },
  {
    code: 'AUREVA15',
    discountType: 'percentage',
    discountValue: 15,
    minimumOrder: 2000,
    maximumDiscount: 1500,
    expiryDate: '2030-12-31T23:59:59Z',
    usageLimit: 500,
    usedCount: 38,
    isActive: true,
    description: '15% off orders over ₹2,000 (up to ₹1,500 off)',
  },
  {
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minimumOrder: 999,
    maximumDiscount: 300,
    expiryDate: '2030-12-31T23:59:59Z',
    usageLimit: 1000,
    usedCount: 82,
    isActive: true,
    description: '10% off your first purchase (up to ₹300 off)',
  },
  {
    code: 'SAVE500',
    discountType: 'fixed',
    discountValue: 500,
    minimumOrder: 2999,
    expiryDate: '2030-12-31T23:59:59Z',
    usageLimit: 200,
    usedCount: 14,
    isActive: true,
    description: '₹500 instant savings on orders over ₹2,999',
  },
  {
    code: 'FREESHIP',
    discountType: 'fixed',
    discountValue: 99,
    minimumOrder: 999,
    expiryDate: '2030-12-31T23:59:59Z',
    usageLimit: 500,
    usedCount: 45,
    isActive: true,
    description: 'Covers standard shipping on orders over ₹999',
  },
];

// Preloaded user reviews
export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-01',
    productId: 'prod-elec-5',
    userId: 'usr-customer-1',
    userName: 'Marcus Vance',
    rating: 5,
    title: 'Flawless sound stage and all-day comfort',
    comment:
      'I use these 8+ hours daily for sound mixing and client calls. The 50mm planar drivers deliver startling detail across mid-tones, and the memory foam lambskin pads never fatigue the ears. Worth every rupee.',
    verifiedPurchase: true,
    createdAt: '2026-02-14T11:20:00Z',
    helpfulCount: 24,
  },
  {
    id: 'rev-02',
    productId: 'prod-elec-5',
    userId: 'usr-customer-2',
    userName: 'Elena Rostova',
    rating: 5,
    title: 'The build quality is in a league of its own',
    comment:
      'Solid construction with zero plastic creaking. Battery life is easily 40+ hours on a single charge. The companion packaging and carrying case are equally immaculate.',
    verifiedPurchase: true,
    createdAt: '2026-02-20T16:45:00Z',
    helpfulCount: 19,
  },
  {
    id: 'rev-03',
    productId: 'prod-elec-3',
    userId: 'usr-customer-3',
    userName: 'David Sterling',
    rating: 5,
    title: 'Exceptional horological value',
    comment:
      'Gaining approximately +3 seconds a day, well within chronometer expectations. The domed sapphire crystal and sunburst dial catch natural light brilliantly.',
    verifiedPurchase: true,
    createdAt: '2026-02-18T09:15:00Z',
    helpfulCount: 31,
  },
  {
    id: 'rev-04',
    productId: 'prod-home-1',
    userId: 'usr-customer-4',
    userName: 'Chloe Nguyen',
    rating: 5,
    title: 'Stunning organic sculpture for the reading corner',
    comment:
      'The texture of the chamotte clay feels like a museum piece. The matte sandstone finish pairs beautifully with dried stems and catches the afternoon light.',
    verifiedPurchase: true,
    createdAt: '2026-02-24T18:00:00Z',
    helpfulCount: 14,
  },
  {
    id: 'rev-05',
    productId: 'prod-elec-1',
    userId: 'usr-customer-5',
    userName: 'Julian Vance',
    rating: 5,
    title: 'Commuter earbuds that disappear in the ear',
    comment:
      'The graphene drivers give acoustic guitars and vocals real separation. Hybrid ANC silences the metro roar instantly, and the case is small enough for a jacket pocket.',
    verifiedPurchase: true,
    createdAt: '2026-02-19T13:40:00Z',
    helpfulCount: 18,
  },
  {
    id: 'rev-06',
    productId: 'prod-elec-1',
    userId: 'usr-customer-6',
    userName: 'Samantha Brooks',
    rating: 4,
    title: 'Excellent ANC and a pocketable case',
    comment:
      'Battery easily lasts a full work week with the case. The touch controls are a little sensitive when adjusting the fit, but the sound and noise cancellation are superb.',
    verifiedPurchase: true,
    createdAt: '2026-02-21T09:15:00Z',
    helpfulCount: 22,
  },
  {
    id: 'rev-07',
    productId: 'prod-fash-6',
    userId: 'usr-customer-7',
    userName: 'Liam Callahan',
    rating: 5,
    title: 'Completely impervious to torrential rain',
    comment:
      'Tested during a stormy weekend in Mumbai. Water beads off the storm-resistant gabardine immediately, and the deep storm vent prevents overheating during city walking.',
    verifiedPurchase: true,
    createdAt: '2026-02-23T15:30:00Z',
    helpfulCount: 16,
  },
  {
    id: 'rev-08',
    productId: 'prod-home-5',
    userId: 'usr-customer-8',
    userName: 'Chef Kenji Mori',
    rating: 5,
    title: 'A serving board that looks like sculpture',
    comment:
      'The travertine is hefty and cool to the touch, and the fluted edge catches light beautifully. Sealed perfectly for cheese service and easy to wipe clean.',
    verifiedPurchase: true,
    createdAt: '2026-02-15T19:00:00Z',
    helpfulCount: 35,
  },
  {
    id: 'rev-09',
    productId: 'prod-beau-1',
    userId: 'usr-customer-9',
    userName: 'Matilda Larsson',
    rating: 5,
    title: 'Skin looks calmer by morning',
    comment:
      'The blue tansy and squalane blend absorbs quickly without any greasy film. After two weeks my redness has visibly faded and my skin feels far more comfortable.',
    verifiedPurchase: true,
    createdAt: '2026-02-25T11:10:00Z',
    helpfulCount: 12,
  },
];

// Preloaded realistic sample orders for admin & customer accounts
export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-9041',
    orderNumber: 'ORD-2026-9041',
    userId: 'usr-alex',
    customerName: 'Alex Thorne',
    customerEmail: 'alex@aureva.com',
    customerPhone: '+91 98200 12345',
    shippingAddress: {
      id: 'addr-default-1',
      fullName: 'Alex Thorne',
      phone: '+91 98200 12345',
      street: 'Bandra Kurla Complex, Unit 1204',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      country: 'India',
      isDefault: true,
    },
    deliveryMethod: 'standard',
    paymentMethod: 'Credit / Debit Card',
    paymentStatus: 'Paid',
    status: 'Shipped',
    items: [
      {
        productId: 'prod-elec-5',
        productName: 'Aureva Studio ANC Over-Ear Headphones',
        productImage:
          '/images/1505740420928-5e560c06d30e.jpg',
        variantName: 'Matte Charcoal',
        unitPrice: 4499,
        quantity: 1,
        subtotal: 4499,
      },
    ],
    subtotal: 4499,
    discount: 674.85,
    couponCode: 'AUREVA15',
    shippingFee: 0,
    tax: 688.35,
    total: 4512.5,
    trackingNumber: 'FX-849201934IN',
    timeline: [
      {
        status: 'Pending',
        timestamp: '2026-02-25T14:10:00Z',
        message: 'Order placed by customer',
      },
      {
        status: 'Confirmed',
        timestamp: '2026-02-25T14:12:00Z',
        message: 'Payment confirmed via Stripe (Auth: #9201)',
      },
      {
        status: 'Processing',
        timestamp: '2026-02-26T09:30:00Z',
        message: 'Package boxed and sealed at the Aureva Mumbai fulfilment centre',
      },
      {
        status: 'Shipped',
        timestamp: '2026-02-27T08:00:00Z',
        message: 'In transit with Blue Dart Express. Estimated arrival in 2 business days.',
        location: 'Bhiwandi, MH Hub',
      },
    ],
    createdAt: '2026-02-25T14:10:00Z',
    updatedAt: '2026-02-27T08:00:00Z',
  },
  {
    id: 'ord-8832',
    orderNumber: 'ORD-2026-8832',
    userId: 'usr-alex',
    customerName: 'Alex Thorne',
    customerEmail: 'alex@aureva.com',
    customerPhone: '+91 98200 12345',
    shippingAddress: {
      id: 'addr-default-1',
      fullName: 'Alex Thorne',
      phone: '+91 98200 12345',
      street: 'Bandra Kurla Complex, Unit 1204',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400051',
      country: 'India',
      isDefault: true,
    },
    deliveryMethod: 'express',
    paymentMethod: 'UPI / Instant Pay',
    paymentStatus: 'Paid',
    status: 'Delivered',
    items: [
      {
        productId: 'prod-sport-1',
        productName: 'Align Pro Cork Yoga Mat 6mm',
        productImage:
          '/images/1601925260368-ae2f83cf8b7f.jpg',
        variantName: 'Natural Cork & Obsidian Black',
        unitPrice: 2499,
        quantity: 1,
        subtotal: 2499,
      },
    ],
    subtotal: 2499,
    discount: 249.9,
    couponCode: 'WELCOME10',
    shippingFee: 199,
    tax: 404.84,
    total: 2852.94,
    trackingNumber: 'BD-1Z9999999999IN',
    timeline: [
      { status: 'Pending', timestamp: '2026-02-10T10:00:00Z', message: 'Order submitted' },
      { status: 'Confirmed', timestamp: '2026-02-10T10:05:00Z', message: 'Payment authorized' },
      { status: 'Processing', timestamp: '2026-02-10T14:00:00Z', message: 'Processed at hub' },
      { status: 'Shipped', timestamp: '2026-02-11T09:00:00Z', message: 'Dispatched via Express' },
      { status: 'Out for Delivery', timestamp: '2026-02-12T08:30:00Z', message: 'Courier en route' },
      { status: 'Delivered', timestamp: '2026-02-12T13:45:00Z', message: 'Package handed to resident' },
    ],
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-12T13:45:00Z',
  },
  {
    id: 'ord-9104',
    orderNumber: 'ORD-2026-9104',
    userId: 'usr-customer-2',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@example.com',
    customerPhone: '+91 98765 43210',
    shippingAddress: {
      id: 'addr-2',
      fullName: 'Elena Rostova',
      phone: '+91 98765 43210',
      street: '12 Marine Drive, Apartment 8B',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400020',
      country: 'India',
    },
    deliveryMethod: 'standard',
    paymentMethod: 'Credit / Debit Card',
    paymentStatus: 'Paid',
    status: 'Processing',
    items: [
      {
        productId: 'prod-elec-3',
        productName: 'Chronova Heritage Automatic Watch',
        productImage:
          '/images/1523275335684-37898b6baf30.jpg',
        variantName: 'Brushed Silver 41mm',
        unitPrice: 5499,
        quantity: 1,
        subtotal: 5499,
      },
    ],
    subtotal: 5499,
    discount: 500,
    couponCode: 'SAVE500',
    shippingFee: 0,
    tax: 899.82,
    total: 5898.82,
    trackingNumber: 'FX-910248102IN',
    timeline: [
      { status: 'Pending', timestamp: '2026-02-27T11:00:00Z', message: 'Order submitted' },
      { status: 'Confirmed', timestamp: '2026-02-27T11:02:00Z', message: 'Payment authorized' },
      { status: 'Processing', timestamp: '2026-02-27T14:30:00Z', message: 'Undergoing quality inspection' },
    ],
    createdAt: '2026-02-27T11:00:00Z',
    updatedAt: '2026-02-27T14:30:00Z',
  },
];

// In-Memory Database Store with thread-safe mutated state
class InMemoryStore {
  private products: Product[];
  private categories: Category[];
  private coupons: Coupon[] = [...INITIAL_COUPONS];
  private reviews: Review[] = [...INITIAL_REVIEWS];
  private orders: Order[];
  private newsletterSubscribers: { email: string; subscribedAt: string }[] = [];
  constructor() {
    const savedCatalog = readSavedCatalog();
    this.products = (savedCatalog?.products || [...INITIAL_PRODUCTS]).map((product) => ({
      ...product,
      clientId: product.clientId || DEFAULT_STORE_CLIENT_ID,
    }));
    this.categories = savedCatalog?.categories || [...INITIAL_CATEGORIES];
    this.orders = INITIAL_ORDERS.map((order) => ({
      ...order,
      clientId: order.clientId || DEFAULT_STORE_CLIENT_ID,
    }));
  }
  private users: User[] = [
    {
      id: 'usr-superadmin',
      name: 'Aman Verma',
      email: 'superadmin@aureva.com',
      phone: '+91 98000 11223',
      role: 'superadmin',
      avatarUrl: '/images/1581783342308-f792dbdd27c5.jpg',
      savedAddresses: [],
      createdAt: '2026-01-01T00:00:00Z',
      isActive: true,
    },
    {
      id: 'usr-client',
      name: 'Aarav Malhotra',
      email: 'client@aureva.com',
      phone: '+91 98100 44556',
      role: 'client',
      avatarUrl: '/images/1590658268037-6bf12165a8df.jpg',
      savedAddresses: [],
      createdAt: '2026-01-01T00:00:00Z',
      isActive: true,
    },
    {
      id: 'usr-alex',
      name: 'Alex Thorne',
      email: 'alex@aureva.com',
      phone: '+91 98200 12345',
      role: 'customer',
      avatarUrl: '/images/1534528741775-53994a69daeb.jpg',
      savedAddresses: [
        {
          id: 'addr-default-1',
          fullName: 'Alex Thorne',
          phone: '+91 98200 12345',
          street: 'Bandra Kurla Complex, Unit 1204',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400051',
          country: 'India',
          isDefault: true,
        },
        {
          id: 'addr-alt-2',
          fullName: 'Alex Thorne',
          phone: '+91 98200 12345',
          street: 'Indiranagar, 100 Feet Road, Flat 302',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'India',
          isDefault: false,
        },
      ],
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr-admin-1',
      name: 'Rohit Sharma',
      email: 'admin@aureva.com',
      phone: '+91 98111 77788',
      role: 'admin',
      avatarUrl: '/images/1580489944761-15a19d654956.jpg',
      savedAddresses: [],
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr-customer-2',
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '+91 98765 43210',
      role: 'customer',
      avatarUrl: '/images/1494790108377-be9c29b29330.jpg',
      savedAddresses: [
        {
          id: 'addr-2',
          fullName: 'Elena Rostova',
          phone: '+91 98765 43210',
          street: '12 Marine Drive, Apartment 8B',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400020',
          country: 'India',
          isDefault: true,
        },
      ],
      createdAt: '2026-01-12T00:00:00Z',
    },
  ];

  // PRODUCTS
  getProducts(filters?: {
    search?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStockOnly?: boolean;
    sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popular';
    limit?: number;
    page?: number;
  }) {
    let result = [...this.products];

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters?.category && filters.category !== 'all') {
      result = result.filter(
        (p) =>
          p.category.toLowerCase() === filters.category!.toLowerCase() ||
          p.slug.toLowerCase().includes(filters.category!.toLowerCase())
      );
    }

    if (filters?.subcategory && filters.subcategory !== 'all') {
      result = result.filter(
        (p) => p.subcategory.toLowerCase() === filters.subcategory!.toLowerCase()
      );
    }

    if (filters?.brand && filters.brand !== 'all') {
      result = result.filter((p) => p.brand.toLowerCase() === filters.brand!.toLowerCase());
    }

    if (filters?.minPrice !== undefined) {
      result = result.filter((p) => p.basePrice >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined) {
      result = result.filter((p) => p.basePrice <= filters.maxPrice!);
    }

    if (filters?.minRating !== undefined) {
      result = result.filter((p) => p.rating >= filters.minRating!);
    }

    if (filters?.inStockOnly) {
      result = result.filter((p) => p.inStock && p.totalStock > 0);
    }

    // Sorting
    switch (filters?.sort) {
      case 'price-asc':
        result.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-desc':
        result.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'popular':
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    const total = result.length;
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const paginated = result.slice((page - 1) * limit, page * limit);

    return {
      products: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  getProductById(idOrSlug: string): Product | undefined {
    return this.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  }

  private saveCatalog() {
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(CATALOG_FILE, JSON.stringify({ products: this.products, categories: this.categories }), 'utf8');
    } catch (error) {
      console.error('Unable to persist catalog snapshot:', error);
    }
  }

  createProduct(productData: Omit<Product, 'id' | 'createdAt'>): Product {
    const id = `prod-${Date.now()}`;
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newProduct: Product = {
      ...productData,
      id,
      slug,
      createdAt: new Date().toISOString(),
      inStock: productData.totalStock > 0,
    };

    this.products.unshift(newProduct);
    this.saveCatalog();
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    const existing = this.products[index];
    const updated: Product = {
      ...existing,
      ...updates,
      id: existing.id,
      inStock: (updates.totalStock ?? existing.totalStock) > 0,
    };
    this.products[index] = updated;
    this.saveCatalog();
    return updated;
  }

  deleteProduct(id: string): boolean {
    const prevLen = this.products.length;
    this.products = this.products.filter((p) => p.id !== id);
    const removed = this.products.length < prevLen;
    if (removed) this.saveCatalog();
    return removed;
  }

  // CATEGORIES
  getCategories(): Category[] {
    return this.categories.map((category) => ({
      ...category,
      productCount: this.products.filter((product) => product.category === category.name).length,
    }));
  }

  createCategory(category: Omit<Category, 'id'>): Category {
    const newCat: Category = {
      ...category,
      id: `cat-${Date.now()}`,
      productCount: 0,
    };
    this.categories.push(newCat);
    this.saveCatalog();
    return newCat;
  }

  updateCategory(id: string, updates: Partial<Category>): Category | undefined {
    const index = this.categories.findIndex((category) => category.id === id);
    if (index === -1) return undefined;

    const existing = this.categories[index];
    const updated: Category = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    this.categories[index] = updated;

    if (updates.name && updates.name !== existing.name) {
      this.products = this.products.map((product) =>
        product.category === existing.name ? { ...product, category: updates.name! } : product
      );
    }
    this.saveCatalog();
    return updated;
  }

  deleteCategory(id: string): { success: boolean; error?: string } {
    const category = this.categories.find((entry) => entry.id === id);
    if (!category) return { success: false, error: 'Category not found.' };

    const productCount = this.products.filter((product) => product.category === category.name).length;
    if (productCount > 0) {
      return {
        success: false,
        error: `Move or delete the ${productCount} product(s) in ${category.name} before removing this category.`,
      };
    }

    this.categories = this.categories.filter((entry) => entry.id !== id);
    this.saveCatalog();
    return { success: true };
  }

  // COUPONS
  getCoupons(): Coupon[] {
    return this.coupons;
  }

  getActiveCoupons(): Coupon[] {
    const now = Date.now();
    return this.coupons.filter((coupon) => {
      if (!coupon.isActive) return false;
      if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < now) return false;
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
      return true;
    });
  }

  getCoupon(code: string): Coupon | undefined {
    return this.coupons.find(
      (c) => c.code.toUpperCase() === code.trim().toUpperCase() && c.isActive
    );
  }

  createCoupon(coupon: Coupon): Coupon {
    const normalized: Coupon = {
      ...coupon,
      code: coupon.code.trim().toUpperCase(),
    };
    const existingIdx = this.coupons.findIndex(
      (c) => c.code.toUpperCase() === normalized.code.toUpperCase()
    );
    if (existingIdx !== -1) {
      this.coupons[existingIdx] = normalized;
    } else {
      this.coupons.push(normalized);
    }
    return normalized;
  }

  updateCoupon(code: string, updates: Partial<Coupon>): Coupon | undefined {
    const index = this.coupons.findIndex(
      (coupon) => coupon.code.toUpperCase() === code.trim().toUpperCase()
    );
    if (index === -1) return undefined;

    const existing = this.coupons[index];
    const updated: Coupon = {
      ...existing,
      ...updates,
      code: (updates.code || existing.code).trim().toUpperCase(),
    };
    this.coupons[index] = updated;
    return updated;
  }

  deleteCoupon(code: string): boolean {
    const prevLength = this.coupons.length;
    this.coupons = this.coupons.filter(
      (coupon) => coupon.code.toUpperCase() !== code.trim().toUpperCase()
    );
    return this.coupons.length < prevLength;
  }

  // ORDERS
  getOrders(userId?: string): Order[] {
    if (userId) {
      return this.orders.filter((o) => o.userId === userId);
    }
    return this.orders;
  }

  getOrderById(idOrNumber: string): Order | undefined {
    return this.orders.find((o) => o.id === idOrNumber || o.orderNumber === idOrNumber);
  }

  createOrder(orderPayload: {
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: any;
    deliveryMethod: 'standard' | 'express';
    paymentMethod: any;
    items: { productId: string; variantId?: string; quantity: number }[];
    couponCode?: string;
  }): { success: boolean; order?: Order; error?: string } {
    // 1. Validate items & stock server-side
    const resolvedItems: any[] = [];
    let subtotal = 0;

    for (const reqItem of orderPayload.items) {
      const product = this.getProductById(reqItem.productId);
      if (!product) {
        return { success: false, error: `Product ID '${reqItem.productId}' not found.` };
      }

      let unitPrice = product.basePrice;
      let variantName: string | undefined;

      if (reqItem.variantId) {
        const variant = product.variants.find((v) => v.id === reqItem.variantId);
        if (!variant) {
          return { success: false, error: `Variant not found for product ${product.name}.` };
        }
        if (variant.stock < reqItem.quantity) {
          return {
            success: false,
            error: `Insufficient stock for '${product.name} (${variant.name})'. Available: ${variant.stock}.`,
          };
        }
        unitPrice = product.basePrice + variant.priceModifier;
        variantName = variant.name;
        // Deduct variant stock
        variant.stock -= reqItem.quantity;
      } else {
        if (product.totalStock < reqItem.quantity) {
          return {
            success: false,
            error: `Insufficient stock for '${product.name}'. Available: ${product.totalStock}.`,
          };
        }
      }

      // Deduct total product stock
      product.totalStock = Math.max(0, product.totalStock - reqItem.quantity);
      product.inStock = product.totalStock > 0;

      const itemSubtotal = unitPrice * reqItem.quantity;
      subtotal += itemSubtotal;

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        productImage: product.thumbnail || product.images[0] || '',
        variantName,
        unitPrice,
        quantity: reqItem.quantity,
        subtotal: itemSubtotal,
      });
    }

    // 2. Validate coupon
    let discount = 0;
    if (orderPayload.couponCode) {
      const coupon = this.getCoupon(orderPayload.couponCode);
      if (coupon && subtotal >= coupon.minimumOrder) {
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
            discount = coupon.maximumDiscount;
          }
        } else {
          discount = Math.min(coupon.discountValue, subtotal);
        }
        coupon.usedCount += 1;
      }
    }

    const shippingFee =
      orderPayload.deliveryMethod === 'express'
        ? EXPRESS_SHIPPING_FEE
        : subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : STANDARD_SHIPPING_FEE;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
    const total = Number((discountedSubtotal + shippingFee + tax).toFixed(2));

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const trackingNumber = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const isCod = String(orderPayload.paymentMethod).includes('Cash on Delivery');

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      clientId: DEFAULT_STORE_CLIENT_ID,
      userId: orderPayload.userId,
      customerName: orderPayload.customerName,
      customerEmail: orderPayload.customerEmail,
      customerPhone: orderPayload.customerPhone,
      shippingAddress: orderPayload.shippingAddress,
      deliveryMethod: orderPayload.deliveryMethod,
      paymentMethod: orderPayload.paymentMethod,
      paymentStatus: isCod ? 'Pending' : 'Paid',
      status: 'Confirmed',
      items: resolvedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discount.toFixed(2)),
      couponCode: orderPayload.couponCode,
      shippingFee,
      tax,
      total,
      trackingNumber,
      timeline: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          message: isCod
            ? 'Order placed. Payment will be collected on delivery.'
            : 'Order created and payment authorized.',
        },
        {
          status: 'Confirmed',
          timestamp: new Date().toISOString(),
          message: 'Order accepted by the Aureva fulfilment network.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    return { success: true, order: newOrder };
  }

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string
  ): { success: boolean; updatedOrder?: Order; error?: string } {
    const order = this.getOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    const result = transitionOrder(order, newStatus, note);
    if (result.success) {
      const index = this.orders.findIndex((o) => o.id === order.id);
      if (index !== -1) {
        this.orders[index] = result.updatedOrder;
      }
    }
    return result;
  }

  // REVIEWS
  getReviews(productId: string): Review[] {
    return this.reviews.filter(
      (review) => review.productId === productId && review.isApproved !== false
    );
  }

  getFeaturedReviews(limit = 6): FeaturedReview[] {
    return [...this.reviews]
      .filter((review) => review.isApproved !== false)
      .sort(
        (a, b) =>
          b.helpfulCount - a.helpfulCount ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit)
      .map((review) => {
        const product = this.getProductById(review.productId);
        return {
          ...review,
          productName: product?.name || 'Aureva Collection',
          productSlug: product?.slug || '',
          productImage: product?.thumbnail || product?.images[0] || '',
        };
      });
  }

  getAllReviews(): AdminReview[] {
    return this.reviews.map((review) => {
      const product = this.getProductById(review.productId);
      return {
        ...review,
        productName: product?.name || 'Product removed',
        productSlug: product?.slug || '',
      };
    });
  }

  addReview(
    productId: string,
    review: Omit<Review, 'id' | 'productId' | 'createdAt' | 'helpfulCount'>
  ): Review {
    const newRev: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      productId,
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
      isApproved: true,
    };
    this.reviews.unshift(newRev);
    this.recalculateProductRating(productId);
    return newRev;
  }

  moderateReview(
    reviewId: string,
    action: 'approve' | 'reject' | 'delete'
  ): { success: boolean; review?: Review; error?: string } {
    const review = this.reviews.find((entry) => entry.id === reviewId);
    if (!review) return { success: false, error: 'Review not found.' };

    if (action === 'delete') {
      this.reviews = this.reviews.filter((entry) => entry.id !== reviewId);
      this.recalculateProductRating(review.productId);
      return { success: true, review };
    }

    review.isApproved = action === 'approve';
    this.recalculateProductRating(review.productId);
    return { success: true, review };
  }

  private recalculateProductRating(productId: string): void {
    const approvedReviews = this.reviews.filter(
      (review) => review.productId === productId && review.isApproved !== false
    );
    const average =
      approvedReviews.reduce((sum, review) => sum + review.rating, 0) /
      (approvedReviews.length || 1);
    const product = this.getProductById(productId);
    if (product) {
      product.rating = approvedReviews.length ? Number(average.toFixed(1)) : 0;
      product.reviewCount = approvedReviews.length;
    }
  }

  // USERS
  getUsers(): User[] {
    return this.users;
  }

  getCustomers(): AdminCustomer[] {
    return this.users.map((user) => {
      const userOrders = this.orders.filter((order) => order.userId === user.id);
      return {
        ...user,
        isActive: user.isActive !== false,
        orderCount: userOrders.length,
        lifetimeSpend: Number(
          userOrders
            .filter((order) => order.paymentStatus === 'Paid')
            .reduce((sum, order) => sum + order.total, 0)
            .toFixed(2)
        ),
      };
    });
  }

  toggleUserActive(id: string, isActive: boolean): User | undefined {
    const user = this.users.find((entry) => entry.id === id);
    if (!user) return undefined;
    user.isActive = isActive;
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.find((entry) => entry.id === id);
    if (!user) return undefined;
    Object.assign(user, updates, { id: user.id });
    return user;
  }

  deleteUser(id: string): boolean {
    const previousLength = this.users.length;
    this.users = this.users.filter((entry) => entry.id !== id);
    return this.users.length < previousLength;
  }

  updatePaymentStatus(id: string, paymentStatus: Order['paymentStatus']): Order | undefined {
    const order = this.orders.find((entry) => entry.id === id);
    if (!order) return undefined;
    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    return order;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(userData: Omit<User, 'id' | 'createdAt' | 'savedAddresses'> & { password?: string }): User {
    // Client onboarding can create several accounts in the same millisecond, so
    // a bare timestamp id would collide and make two people share one record.
    const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newUser: User = {
      id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role || 'customer',
      avatarUrl: '/images/1534528741775-53994a69daeb.jpg',
      savedAddresses: [],
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    this.users.push(newUser);
    return newUser;
  }

  // NEWSLETTER
  subscribeNewsletter(email: string): { success: boolean; message: string } {
    const normalized = email.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    if (!isValid) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    const exists = this.newsletterSubscribers.some((entry) => entry.email === normalized);
    if (exists) {
      return { success: true, message: 'You are already part of the Aureva Society.' };
    }

    this.newsletterSubscribers.push({
      email: normalized,
      subscribedAt: new Date().toISOString(),
    });
    return { success: true, message: 'Welcome to the Aureva Society. Watch your inbox for private drops.' };
  }

  // INVOICES
  getInvoice(orderIdOrNumber: string): InvoiceData | undefined {
    const order = this.getOrderById(orderIdOrNumber);
    if (!order) return undefined;

    return {
      invoiceNumber: `INV-${order.orderNumber.replace(/^ORD-/, '')}`,
      orderNumber: order.orderNumber,
      issuedAt: order.createdAt,
      gstin: '27AAACA1234A1Z5',
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      couponCode: order.couponCode,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    };
  }

  // ADMIN ANALYTICS
  getAdminStats(): AdminStats {
    const totalRevenue = Number(
      this.orders
        .filter((o) => o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + o.total, 0)
        .toFixed(2)
    );

    const todayDateStr = new Date().toISOString().slice(0, 10);
    const todaySales = Number(
      this.orders
        .filter(
          (o) =>
            o.paymentStatus === 'Paid' &&
            o.createdAt.startsWith(todayDateStr)
        )
        .reduce((sum, o) => sum + o.total, 0)
        .toFixed(2)
    );

    const totalOrders = this.orders.length;
    const pendingOrders = this.orders.filter(
      (o) => o.status === 'Pending' || o.status === 'Processing'
    ).length;
    const deliveredOrders = this.orders.filter((o) => o.status === 'Delivered').length;
    const lowStockCount = this.products.filter((p) => p.totalStock <= 15).length;

    // Monthly revenue simulation (last five months, INR)
    const monthlyRevenue = [
      { revenue: 1420000, orders: 48 },
      { revenue: 2180000, orders: 74 },
      { revenue: 3840000, orders: 128 },
      { revenue: 2690000, orders: 86 },
      { revenue: 3240000, orders: 104 },
    ].map((entry, index, list) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (list.length - 1 - index));
      return {
        month: date.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
        ...entry,
      };
    });

    // Sales by category
    const salesByCategory = [
      { category: 'Electronics', amount: 4820000, percentage: 42 },
      { category: 'Fashion', amount: 3510000, percentage: 31 },
      { category: 'Home', amount: 1890000, percentage: 17 },
      { category: 'Beauty', amount: 700000, percentage: 6 },
      { category: 'Sports', amount: 460000, percentage: 4 },
    ];

    return {
      totalRevenue,
      todaySales,
      totalOrders,
      totalCustomers: this.users.length,
      totalProducts: this.products.length,
      pendingOrders,
      deliveredOrders,
      lowStockCount,
      recentOrders: this.orders.slice(0, 5),
      monthlyRevenue,
      salesByCategory,
    };
  }
}

export const dbStore = new InMemoryStore();
