export type Role = 'customer' | 'admin' | 'client' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
  savedAddresses: Address[];
  createdAt: string;
  isActive?: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  color?: string;
  colorHex?: string;
  size?: string;
  priceModifier: number; // + or - relative to base price
  stock: number;
}

export interface ProductSpecification {
  group: string;
  items: { key: string; value: string }[];
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  helpfulCount: number;
  isApproved?: boolean;
}

export interface FeaturedReview extends Review {
  productName: string;
  productSlug: string;
  productImage: string;
}

export interface AdminReview extends Review {
  productName: string;
  productSlug: string;
}

export interface AdminCustomer extends User {
  orderCount: number;
  lifetimeSpend: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: string;
  gstin: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  sku: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  originalPrice: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  totalStock: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  images: string[];
  thumbnail: string;
  variants: ProductVariant[];
  specifications: ProductSpecification[];
  tags: string[];
  inStock: boolean;
  createdAt: string;
  clientId?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  productCount: number;
  subcategories: string[];
}

export interface CartItem {
  id: string; // unique cart line id
  productId: string;
  product: Product;
  variantId?: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  maximumDiscount?: number;
  expiryDate: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  description: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export type PaymentMethod =
  | 'Credit / Debit Card'
  | 'UPI / Instant Pay'
  | 'Net Banking'
  | 'Cash on Delivery (COD)';

export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded' | 'Failed';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  message: string;
  location?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  deliveryMethod: 'standard' | 'express';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  tax: number;
  total: number;
  trackingNumber: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  cancelReason?: string;
  returnReason?: string;
  clientId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'security' | 'system';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface AdminStats {
  totalRevenue: number;
  todaySales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  deliveredOrders: number;
  lowStockCount: number;
  recentOrders: Order[];
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  salesByCategory: { category: string; amount: number; percentage: number }[];
}
