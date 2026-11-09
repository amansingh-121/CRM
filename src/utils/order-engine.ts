import { Order, OrderStatus, OrderTimelineEvent } from '../types/ecommerce.ts';

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
};

/**
 * Checks if a status transition is permitted by workflow rules
 */
export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Generates next timeline event on order update
 */
export function createTimelineEvent(
  status: OrderStatus,
  note?: string,
  location?: string
): OrderTimelineEvent {
  const defaultMessages: Record<OrderStatus, string> = {
    Pending: 'Order placed and awaiting payment confirmation',
    Confirmed: 'Payment verified and order accepted by merchant',
    Processing: 'Package assembled and quality-checked at fulfillment hub',
    Shipped: 'Package dispatched via logistics carrier',
    'Out for Delivery': 'Courier is out for delivery to destination address',
    Delivered: 'Order successfully delivered and signed for',
    Cancelled: 'Order cancelled. Refund initiated if prepaid.',
    Returned: 'Return request processed and return pickup scheduled',
  };

  return {
    status,
    timestamp: new Date().toISOString(),
    message: note || defaultMessages[status] || `Status updated to ${status}`,
    location: location || 'Fulfillment Center #104',
  };
}

/**
 * Applies status update to an order with timeline history
 */
export function transitionOrder(
  order: Order,
  newStatus: OrderStatus,
  note?: string
): { success: boolean; updatedOrder: Order; error?: string } {
  if (!canTransitionOrderStatus(order.status, newStatus)) {
    return {
      success: false,
      updatedOrder: order,
      error: `Cannot transition order from '${order.status}' to '${newStatus}'.`,
    };
  }

  const newEvent = createTimelineEvent(newStatus, note);
  const updatedOrder: Order = {
    ...order,
    status: newStatus,
    updatedAt: new Date().toISOString(),
    timeline: [...order.timeline, newEvent],
  };

  if (newStatus === 'Cancelled') {
    updatedOrder.cancelReason = note || 'Customer requested cancellation';
    if (order.paymentStatus === 'Paid') {
      updatedOrder.paymentStatus = 'Refunded';
    }
  }

  if (newStatus === 'Returned') {
    updatedOrder.returnReason = note || 'Customer requested return';
    updatedOrder.paymentStatus = 'Refunded';
  }

  return {
    success: true,
    updatedOrder,
  };
}
