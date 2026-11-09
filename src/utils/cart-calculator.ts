import { CartItem, Coupon } from '../types/ecommerce.ts';

export interface OrderPricingSummary {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  appliedCoupon?: Coupon;
  couponError?: string;
  qualifiesForFreeShipping: boolean;
  freeShippingGap: number;
}

export const FREE_SHIPPING_THRESHOLD = 2999;
export const STANDARD_SHIPPING_FEE = 99;
export const EXPRESS_SHIPPING_FEE = 199;
export const TAX_RATE = 0.18; // 18% GST

/**
 * Calculates raw subtotal of items in cart
 */
export function calculateSubtotal(items: CartItem[]): number {
  if (!items || items.length === 0) return 0;
  return Number(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)
  );
}

/**
 * Validates a coupon against a subtotal
 */
export function validateCoupon(
  coupon: Coupon | null | undefined,
  subtotal: number
): { valid: boolean; discountAmount: number; error?: string } {
  if (!coupon) {
    return { valid: false, discountAmount: 0 };
  }

  if (!coupon.isActive) {
    return { valid: false, discountAmount: 0, error: 'This coupon is no longer active.' };
  }

  const now = new Date();
  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
    return { valid: false, discountAmount: 0, error: 'This coupon has expired.' };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discountAmount: 0, error: 'This coupon has reached its usage limit.' };
  }

  if (subtotal < coupon.minimumOrder) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order amount of ₹${coupon.minimumOrder.toLocaleString('en-IN')} required for code ${coupon.code}.`,
    };
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
    }
  } else {
    // Fixed amount discount
    discount = Math.min(coupon.discountValue, subtotal);
  }

  return {
    valid: true,
    discountAmount: Number(discount.toFixed(2)),
  };
}

/**
 * Calculates complete order pricing breakdown
 */
export function calculateOrderPricing(
  items: CartItem[],
  deliveryMethod: 'standard' | 'express' = 'standard',
  coupon?: Coupon | null
): OrderPricingSummary {
  const subtotal = calculateSubtotal(items);
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const freeShippingGap = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  let shippingFee = 0;
  if (subtotal > 0) {
    if (deliveryMethod === 'express') {
      shippingFee = EXPRESS_SHIPPING_FEE;
    } else {
      shippingFee = qualifiesForFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
    }
  }

  let discount = 0;
  let couponError: string | undefined;
  let appliedCoupon: Coupon | undefined;

  if (coupon && subtotal > 0) {
    const couponValidation = validateCoupon(coupon, subtotal);
    if (couponValidation.valid) {
      discount = couponValidation.discountAmount;
      appliedCoupon = coupon;
    } else {
      couponError = couponValidation.error;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const tax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const total = Number((discountedSubtotal + shippingFee + tax).toFixed(2));

  return {
    subtotal,
    discount,
    shippingFee,
    tax,
    total,
    appliedCoupon,
    couponError,
    qualifiesForFreeShipping,
    freeShippingGap: Number(freeShippingGap.toFixed(2)),
  };
}
