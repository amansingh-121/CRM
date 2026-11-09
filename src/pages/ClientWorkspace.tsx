import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, ChevronRight, CircleDollarSign, CreditCard, Globe2, Layers, Lock,
  Package, Receipt, RotateCcw, Search, ShoppingBag, Star, Tag, Truck, Users,
} from 'lucide-react';
import type {
  ClientWorkspace, ClientWorkspaceProject, ProjectWorkspace, WebsiteCategory, WebsiteCoupon,
  WebsiteCustomer, WebsiteInvoice, WebsiteInventoryItem, WebsiteOrder, WebsitePayment, WebsiteReturn,
  WebsiteReview, WebsiteShipment, WorkspaceModule,
} from '../types/crm.ts';
import { formatPrice } from '../utils/currency.ts';

type Requester = (path: string, options?: RequestInit) => Promise<any>;
type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'purple' | 'blue';

interface ClientWorkspaceProps {
  request: Requester;
  clientId: string;
  projectId?: string;
  module?: WorkspaceModule;
  onModuleChange?: (module: WorkspaceModule) => void;
  canSeeNotes: boolean;
  canBrowseClients: boolean;
  onOpenClient: (clientId: string) => void;
  onOpenProject: (clientId: string, projectId: string) => void;
  onBackToClients: () => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  purple: 'bg-violet-50 text-violet-700',
  blue: 'bg-blue-50 text-blue-700',
};

const shortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const titleCase = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

function statusTone(value: string): Tone {
  const normalized = value.toLowerCase();
  if (['paid', 'delivered', 'active', 'completed', 'approved'].includes(normalized)) return 'green';
  if (['refunded'].includes(normalized)) return 'purple';
  if (['shipped', 'out for delivery', 'processing', 'confirmed', 'sent', 'in_progress', 'review'].includes(normalized)) return 'blue';
  if (['pending', 'requested', 'planning', 'handover', 'onboarding', 'draft'].includes(normalized)) return 'amber';
  if (['cancelled', 'returned', 'rejected', 'overdue', 'blocked', 'on_hold', 'paused'].includes(normalized)) return 'red';
  return 'neutral';
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

function Card({ title, subtitle, action, className = '', children }: {
  title?: string; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)] ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Metric({ label, value, hint, icon: Icon, tone }: {
  label: string; value: string; hint?: string; icon: React.ElementType; tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      {hint && <p className="mt-2 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-slate-500">{value}%</span>
    </div>
  );
}

function Breadcrumb({ clientName, projectName, canBrowseClients, onBackToClients, onOpenClient, clientId }: {
  clientName: string; projectName?: string; canBrowseClients: boolean;
  onBackToClients: () => void; onOpenClient: (clientId: string) => void; clientId: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-400">
      {canBrowseClients && (
        <>
          <button type="button" onClick={onBackToClients} className="inline-flex items-center gap-1 hover:text-violet-600">
            <ArrowLeft className="h-3.5 w-3.5" />Clients
          </button>
          <ChevronRight className="h-3 w-3" />
        </>
      )}
      {projectName ? (
        <button type="button" onClick={() => onOpenClient(clientId)} className="hover:text-violet-600">{clientName}</button>
      ) : (
        <span className="text-slate-700">{clientName}</span>
      )}
      {projectName && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-700">{projectName}</span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client portfolio (step 1 -> step 2)
// ---------------------------------------------------------------------------

function WebsiteCard({ clientId, project, onOpenProject }: {
  clientId: string; project: ClientWorkspaceProject; onOpenProject: (clientId: string, projectId: string) => void;
}) {
  const live = project.website.kind === 'live';
  const metrics = project.website.metrics;
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${live ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
          <Globe2 className="h-5 w-5" />
        </div>
        <Badge tone={live ? 'green' : 'purple'}>{live ? 'Live e-commerce' : 'Test site'}</Badge>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{project.name}</h3>
      <p className="mt-1 text-[11px] text-slate-500">{project.website.domain} · {titleCase(project.status)}</p>
      <Progress value={project.progress} className="mt-3" />
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50/80 p-3">
        {[
          ['Revenue', formatPrice(metrics.revenue)],
          ['Orders', String(metrics.orders)],
          ['Customers', String(metrics.customers)],
          ['Low stock', String(metrics.lowStock)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-xs font-semibold text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => onOpenProject(clientId, project.id)}
        className="crm-primary mt-4 w-full"
      >
        Open workspace <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function ClientPortfolio({ data, canSeeNotes, canBrowseClients, onOpenProject, onBackToClients }: {
  data: ClientWorkspace; canSeeNotes: boolean; canBrowseClients: boolean;
  onOpenProject: (clientId: string, projectId: string) => void; onBackToClients: () => void;
}) {
  const { client, projects, notes, invoices, totals } = data;
  return (
    <>
      <Breadcrumb clientName={client.name} canBrowseClients={canBrowseClients} onBackToClients={onBackToClients} onOpenClient={() => undefined} clientId={client.id} />

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-violet-600">Client portfolio</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{client.name}</h1>
            <Badge tone={statusTone(client.status)}>{titleCase(client.status)}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {client.industry} · {client.contactName} · {client.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="purple"><Globe2 className="mr-1 h-3 w-3" />{totals.websites} website(s)</Badge>
          <Badge tone="blue"><Lock className="mr-1 h-3 w-3" />Tenant {client.id}</Badge>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Websites" value={String(totals.websites)} hint="Projects in this client tenant" icon={Globe2} tone="bg-violet-100 text-violet-600" />
        <Metric label="Store revenue" value={formatPrice(totals.revenue)} hint="Paid orders across all websites" icon={CircleDollarSign} tone="bg-emerald-100 text-emerald-600" />
        <Metric label="Orders" value={String(totals.orders)} hint="All websites, current snapshot" icon={ShoppingBag} tone="bg-blue-100 text-blue-600" />
        <Metric label="Open returns" value={String(totals.openReturns)} hint={`${formatPrice(totals.invoiced)} agency billing`} icon={RotateCcw} tone="bg-amber-100 text-amber-600" />
      </div>

      <div className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Websites</h2>
            <p className="mt-1 text-xs text-slate-500">Pick a project to open its orders, inventory, customers, returns and invoices.</p>
          </div>
          <Badge>{projects.length} project(s)</Badge>
        </div>
        {projects.length ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <WebsiteCard key={project.id} clientId={client.id} project={project} onOpenProject={onOpenProject} />
            ))}
          </div>
        ) : (
          <Card><p className="px-5 py-10 text-center text-xs text-slate-400">No websites are assigned to your access scope yet.</p></Card>
        )}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Agency invoices"
          subtitle={`${invoices.length} invoice(s) billed to ${client.name}`}
          action={<Badge tone={invoices.some((invoice) => invoice.status !== 'paid') ? 'amber' : 'green'}>{formatPrice(totals.invoiced)}</Badge>}
        >
          {invoices.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => {
                    const project = projects.find((entry) => entry.id === invoice.projectId);
                    return (
                      <tr key={invoice.id}>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{invoice.number}</td>
                        <td className="px-4 py-3.5 text-slate-500">{project?.name || '—'}</td>
                        <td className="px-4 py-3.5 font-semibold">{formatPrice(invoice.total)}</td>
                        <td className="px-4 py-3.5 text-slate-500">{shortDate(invoice.dueDate)}</td>
                        <td className="px-5 py-3.5"><Badge tone={statusTone(invoice.status)}>{titleCase(invoice.status)}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-xs text-slate-400">No agency invoices for this client yet.</p>
          )}
        </Card>

        {canSeeNotes && (
          <Card title="Internal notes" subtitle="Staff only · hidden from the client">
            <div className="divide-y divide-slate-100">
              {notes.length ? notes.map((note) => (
                <div key={note.id} className="px-5 py-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">{note.authorName}</p>
                    <span className="text-[10px] text-slate-400">{shortDate(note.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{note.body}</p>
                </div>
              )) : <p className="px-5 py-8 text-center text-xs text-slate-400">No internal notes recorded.</p>}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Project (website) workspace (step 3)
// ---------------------------------------------------------------------------

function OrdersTable({ rows }: { rows: WebsiteOrder[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No orders on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Placed</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold text-slate-800">{order.orderNumber}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{order.items.length} item(s)</p>
              </td>
              <td className="px-4 py-3.5">
                <p className="font-medium text-slate-700">{order.customerName}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{order.customerEmail}</p>
              </td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(order.createdAt)}</td>
              <td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(order.total)}</td>
              <td className="px-4 py-3.5"><Badge tone={statusTone(order.paymentStatus)}>{order.paymentStatus}</Badge></td>
              <td className="px-5 py-3.5"><Badge tone={statusTone(order.status)}>{order.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ rows }: { rows: WebsiteInventoryItem[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No products in this website catalog yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => {
            const tone: Tone = item.stock === 0 ? 'red' : item.stock <= item.lowStockThreshold ? 'amber' : 'green';
            const label = item.stock === 0 ? 'Out of stock' : item.stock <= item.lowStockThreshold ? 'Low stock' : 'In stock';
            return (
              <tr key={item.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></div>
                    )}
                    <div>
                      <p className="max-w-[260px] truncate font-medium text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{item.sku}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{item.category}</td>
                <td className="px-4 py-3 font-semibold">{formatPrice(item.price)}</td>
                <td className="px-4 py-3 text-slate-700">{item.stock}</td>
                <td className="px-5 py-3"><Badge tone={tone}>{label}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CustomersTable({ rows }: { rows: WebsiteCustomer[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No customers on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">City</th>
            <th className="px-4 py-3 font-medium">Orders</th>
            <th className="px-4 py-3 font-medium">Lifetime spend</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((customer) => (
            <tr key={customer.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-[11px] font-semibold text-violet-600">
                    {customer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{customer.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{customer.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-slate-500">{customer.city}</td>
              <td className="px-4 py-3.5 text-slate-700">{customer.orders}</td>
              <td className="px-4 py-3.5 font-semibold">{formatPrice(customer.lifetimeSpend)}</td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(customer.joinedAt)}</td>
              <td className="px-5 py-3.5"><Badge tone={customer.status === 'blocked' ? 'red' : 'green'}>{titleCase(customer.status)}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReturnsTable({ rows }: { rows: WebsiteReturn[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No return requests on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Return</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Reason</th>
            <th className="px-4 py-3 font-medium">Refund</th>
            <th className="px-4 py-3 font-medium">Requested</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold text-slate-800">{item.id}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{item.customerName}</p>
              </td>
              <td className="px-4 py-3.5 text-slate-500">{item.orderNumber}</td>
              <td className="px-4 py-3.5 text-slate-700">{item.productName}</td>
              <td className="px-4 py-3.5"><p className="max-w-[220px] text-slate-500">{item.reason}</p></td>
              <td className="px-4 py-3.5 font-semibold">{item.refundAmount ? formatPrice(item.refundAmount) : '—'}</td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(item.requestedAt)}</td>
              <td className="px-5 py-3.5"><Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoicesTable({ rows }: { rows: WebsiteInvoice[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No invoices raised on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Invoice</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Issued</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5 font-semibold text-slate-800">{invoice.number}</td>
              <td className="px-4 py-3.5 text-slate-700">{invoice.customerName}</td>
              <td className="px-4 py-3.5 text-slate-500">{invoice.orderNumber}</td>
              <td className="px-4 py-3.5">
                <p className="font-semibold text-slate-800">{formatPrice(invoice.total)}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{formatPrice(invoice.amount)} + {formatPrice(invoice.tax)} GST</p>
              </td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(invoice.issuedAt)}</td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(invoice.dueDate)}</td>
              <td className="px-5 py-3.5"><Badge tone={statusTone(invoice.status)}>{titleCase(invoice.status)}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockTable({ rows }: { rows: WebsiteInventoryItem[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No stock records on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">SKU</th>
            <th className="px-4 py-3 font-medium">On hand</th>
            <th className="px-4 py-3 font-medium">Reorder at</th>
            <th className="px-4 py-3 font-medium">Stock value</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => {
            const tone: Tone = item.stock === 0 ? 'red' : item.stock <= item.lowStockThreshold ? 'amber' : 'green';
            const label = item.stock === 0 ? 'Out of stock' : item.stock <= item.lowStockThreshold ? 'Low stock' : 'In stock';
            return (
              <tr key={item.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <p className="max-w-[260px] truncate font-medium text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{item.category}</p>
                </td>
                <td className="px-4 py-3.5 text-[10px] text-slate-400">{item.sku}</td>
                <td className="px-4 py-3.5 text-slate-700">{item.stock}</td>
                <td className="px-4 py-3.5 text-slate-500">{item.lowStockThreshold}</td>
                <td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(item.price * item.stock)}</td>
                <td className="px-5 py-3.5"><Badge tone={tone}>{label}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ rows }: { rows: WebsitePayment[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No payments collected on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Initiated</th>
            <th className="px-4 py-3 font-medium">Settled</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((payment) => (
            <tr key={payment.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold text-slate-800">{payment.orderNumber}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{payment.method}</p>
              </td>
              <td className="px-4 py-3.5 text-slate-700">{payment.customerName}</td>
              <td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(payment.amount)}</td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(payment.createdAt)}</td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(payment.settledAt)}</td>
              <td className="px-5 py-3.5"><Badge tone={statusTone(payment.status)}>{payment.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShippingTable({ rows }: { rows: WebsiteShipment[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No shipments dispatched from this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Shipment</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Destination</th>
            <th className="px-4 py-3 font-medium">Carrier</th>
            <th className="px-4 py-3 font-medium">Expected</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((shipment) => (
            <tr key={shipment.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold text-slate-800">{shipment.orderNumber}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Booked {shortDate(shipment.createdAt)}</p>
              </td>
              <td className="px-4 py-3.5 text-slate-700">{shipment.customerName}</td>
              <td className="px-4 py-3.5 text-slate-500">{shipment.destination}</td>
              <td className="px-4 py-3.5 text-slate-500">{shipment.carrier}</td>
              <td className="px-4 py-3.5 text-slate-500">{shipment.expectedAt ? shortDate(shipment.expectedAt) : '—'}</td>
              <td className="px-5 py-3.5"><Badge tone={statusTone(shipment.status)}>{shipment.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouponsTable({ rows }: { rows: WebsiteCoupon[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No coupons configured on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Code</th>
            <th className="px-4 py-3 font-medium">Discount</th>
            <th className="px-4 py-3 font-medium">Min order</th>
            <th className="px-4 py-3 font-medium">Used</th>
            <th className="px-4 py-3 font-medium">Expires</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((coupon) => (
            <tr key={coupon.code} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold tracking-wide text-slate-800">{coupon.code}</p>
                <p className="mt-0.5 max-w-[280px] text-[10px] text-slate-400">{coupon.description}</p>
              </td>
              <td className="px-4 py-3.5 font-semibold text-slate-800">
                {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue)}
              </td>
              <td className="px-4 py-3.5 text-slate-500">{formatPrice(coupon.minimumOrder)}</td>
              <td className="px-4 py-3.5 text-slate-700">{coupon.usedCount}</td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(coupon.expiryDate)}</td>
              <td className="px-5 py-3.5"><Badge tone={coupon.status === 'active' ? 'green' : 'neutral'}>{titleCase(coupon.status)}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesTable({ rows }: { rows: WebsiteCategory[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No categories in this website catalog yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Products</th>
            <th className="px-4 py-3 font-medium">Units in stock</th>
            <th className="px-4 py-3 font-medium">Low stock</th>
            <th className="px-5 py-3 font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((category) => (
            <tr key={category.name} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Layers className="h-4 w-4" /></div>
                  <p className="font-medium text-slate-800">{category.name}</p>
                </div>
              </td>
              <td className="px-4 py-3.5 text-slate-700">{category.products}</td>
              <td className="px-4 py-3.5 text-slate-700">{category.stock}</td>
              <td className="px-4 py-3.5">{category.lowStock ? <Badge tone="amber">{category.lowStock} item(s)</Badge> : <span className="text-slate-400">—</span>}</td>
              <td className="px-5 py-3.5 font-semibold text-slate-800">{formatPrice(category.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsTable({ rows }: { rows: WebsiteReview[] }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-xs text-slate-400">No reviews on this website yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-xs">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Review</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((review) => (
            <tr key={review.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5 font-medium text-slate-800">{review.productName}</td>
              <td className="px-4 py-3.5 text-slate-700">{review.customerName}</td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <p className="font-medium text-slate-700">{review.title}</p>
                <p className="mt-0.5 max-w-[300px] text-[10px] text-slate-400">{review.comment}</p>
              </td>
              <td className="px-4 py-3.5 text-slate-500">{shortDate(review.createdAt)}</td>
              <td className="px-5 py-3.5"><Badge tone={review.status === 'published' ? 'green' : 'amber'}>{titleCase(review.status)}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectView({ data, canBrowseClients, activeModule, onModuleChange, onOpenClient, onBackToClients }: {
  data: ProjectWorkspace; canBrowseClients: boolean; activeModule: WorkspaceModule;
  onModuleChange: (module: WorkspaceModule) => void;
  onOpenClient: (clientId: string) => void; onBackToClients: () => void;
}) {
  const { client, project, website, agencyInvoices } = data;
  const [search, setSearch] = useState('');
  const tab = activeModule;
  const setTab = onModuleChange;
  // The sidebar can switch panels too, so clear the local search on every change.
  useEffect(() => { setSearch(''); }, [tab]);
  const query = search.trim().toLowerCase();
  const metrics = website.metrics;

  const filteredOrders = useMemo(
    () => website.orders.filter((order) => !query || `${order.orderNumber} ${order.customerName} ${order.status} ${order.paymentStatus}`.toLowerCase().includes(query)),
    [website.orders, query],
  );
  const filteredInventory = useMemo(
    () => website.inventory.filter((item) => !query || `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(query)),
    [website.inventory, query],
  );
  const filteredCustomers = useMemo(
    () => website.customers.filter((customer) => !query || `${customer.name} ${customer.email} ${customer.city}`.toLowerCase().includes(query)),
    [website.customers, query],
  );
  const filteredReturns = useMemo(
    () => website.returns.filter((item) => !query || `${item.id} ${item.orderNumber} ${item.customerName} ${item.productName} ${item.reason}`.toLowerCase().includes(query)),
    [website.returns, query],
  );
  const filteredInvoices = useMemo(
    () => website.invoices.filter((invoice) => !query || `${invoice.number} ${invoice.orderNumber} ${invoice.customerName} ${invoice.status}`.toLowerCase().includes(query)),
    [website.invoices, query],
  );
  const filteredPayments = useMemo(
    () => website.payments.filter((payment) => !query || `${payment.orderNumber} ${payment.customerName} ${payment.method} ${payment.status}`.toLowerCase().includes(query)),
    [website.payments, query],
  );
  const filteredShipping = useMemo(
    () => website.shipping.filter((shipment) => !query || `${shipment.orderNumber} ${shipment.customerName} ${shipment.destination} ${shipment.carrier} ${shipment.status}`.toLowerCase().includes(query)),
    [website.shipping, query],
  );
  const filteredCoupons = useMemo(
    () => website.coupons.filter((coupon) => !query || `${coupon.code} ${coupon.description} ${coupon.status}`.toLowerCase().includes(query)),
    [website.coupons, query],
  );
  const filteredCategories = useMemo(
    () => website.categories.filter((category) => !query || category.name.toLowerCase().includes(query)),
    [website.categories, query],
  );
  const filteredReviews = useMemo(
    () => website.reviews.filter((review) => !query || `${review.productName} ${review.customerName} ${review.title} ${review.comment}`.toLowerCase().includes(query)),
    [website.reviews, query],
  );

  const lowStock = website.inventory.filter((item) => item.stock <= item.lowStockThreshold);
  const live = website.kind === 'live';

  return (
    <>
      <Breadcrumb
        clientName={client.name}
        projectName={website.name}
        clientId={client.id}
        canBrowseClients={canBrowseClients}
        onBackToClients={onBackToClients}
        onOpenClient={onOpenClient}
      />

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${live ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-950">{website.name}</h1>
              <Badge tone={live ? 'green' : 'purple'}>{live ? 'Live e-commerce' : 'Test site'}</Badge>
              <Badge tone={statusTone(project.status)}>{titleCase(project.status)}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {website.domain} · {client.name} · Launched {shortDate(website.launchedAt)}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => onOpenClient(client.id)} className="crm-secondary">
          <ArrowLeft />Back to {client.name}
        </button>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-[11px] leading-relaxed text-violet-900">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Every number below belongs to <strong>{website.domain}</strong>. Orders, stock, customers, returns and
          invoices from any other client website are never queried on this workspace.
          {live ? ' Data is connected to the live storefront catalog and orders.' : ' This is a demo dataset isolated to this test site.'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Revenue" value={formatPrice(metrics.revenue)} hint={`${formatPrice(metrics.averageOrderValue)} average order`} icon={CircleDollarSign} tone="bg-emerald-100 text-emerald-600" />
        <Metric label="Orders" value={String(metrics.orders)} hint={`Last order ${shortDate(metrics.lastOrderAt)}`} icon={ShoppingBag} tone="bg-blue-100 text-blue-600" />
        <Metric label="Customers" value={String(metrics.customers)} hint="Registered on this website" icon={Users} tone="bg-violet-100 text-violet-600" />
        <Metric label="Open returns" value={String(metrics.openReturns)} hint={`${metrics.returns} total return(s)`} icon={RotateCcw} tone="bg-amber-100 text-amber-600" />
      </div>

      {tab !== 'overview' && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${tab}`}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-400"
            />
          </div>
          <p className="text-[11px] text-slate-400">Scoped to {website.domain}</p>
        </div>
      )}

      <div className="mt-4">
        {tab === 'overview' && (
          <div className="grid gap-5 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Recent orders"
              subtitle={`Latest transactions on ${website.domain}`}
              action={<button type="button" onClick={() => setTab('orders')} className="flex items-center gap-1 text-xs font-semibold text-violet-600">View all <ArrowRight className="h-3.5 w-3.5" /></button>}
            >
              <OrdersTable rows={website.orders.slice(0, 5)} />
            </Card>

            <Card title="Website snapshot" subtitle="Catalog and billing health">
              <div className="space-y-3 px-5 pb-5">
                {[
                  ['Average order value', formatPrice(metrics.averageOrderValue)],
                  ['Low stock items', String(metrics.lowStock)],
                  ['Outstanding invoices', formatPrice(metrics.outstandingInvoices)],
                  ['Agency billing', `${agencyInvoices.length} invoice(s)`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs last:border-0 last:pb-0">
                    <span className="text-slate-500">{label}</span>
                    <strong className="text-slate-800">{value}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Last synced</span>
                  <span>{new Date(website.lastSyncedAt).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </Card>

            <Card title="Low stock" subtitle="Products that need attention" action={<Badge tone={lowStock.length ? 'amber' : 'green'}>{lowStock.length} item(s)</Badge>}>
              {lowStock.length ? (
                <div className="space-y-1 px-3 pb-3">
                  {lowStock.slice(0, 4).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl p-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Package className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-800">{item.name}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{item.sku}</p>
                      </div>
                      <Badge tone={item.stock === 0 ? 'red' : 'amber'}>{item.stock} left</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="px-5 py-8 text-center text-xs text-slate-400">All products are healthy.</p>}
            </Card>

            <Card title="Recent returns" subtitle="Requests raised by this website's customers">
              {website.returns.length ? (
                <div className="divide-y divide-slate-100">
                  {website.returns.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><RotateCcw className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-slate-800">{item.productName}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">{item.orderNumber} · {item.customerName}</p>
                      </div>
                      <Badge tone={statusTone(item.status)}>{titleCase(item.status)}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="px-5 py-8 text-center text-xs text-slate-400">No returns recorded.</p>}
            </Card>

            <Card title="Agency billing" subtitle="Invoices raised for this project">
              {agencyInvoices.length ? (
                <div className="divide-y divide-slate-100">
                  {agencyInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{invoice.number}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Due {shortDate(invoice.dueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-800">{formatPrice(invoice.total)}</p>
                        <Badge tone={statusTone(invoice.status)}>{titleCase(invoice.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="px-5 py-8 text-center text-xs text-slate-400">No agency invoices billed to this project.</p>}
            </Card>
          </div>
        )}

        {tab === 'orders' && <Card title="Orders" subtitle={`${filteredOrders.length} order(s) on ${website.domain}`}><OrdersTable rows={filteredOrders} /></Card>}
        {tab === 'products' && <Card title="Products" subtitle={`${filteredInventory.length} product(s) in this website catalog`}><InventoryTable rows={filteredInventory} /></Card>}
        {tab === 'inventory' && <Card title="Inventory" subtitle={`${filteredInventory.length} SKU(s) tracked for ${website.domain}`}><StockTable rows={filteredInventory} /></Card>}
        {tab === 'customers' && <Card title="Customers" subtitle={`${filteredCustomers.length} customer(s) registered on ${website.domain}`}><CustomersTable rows={filteredCustomers} /></Card>}
        {tab === 'payments' && <Card title="Payments" subtitle={`${filteredPayments.length} payment(s) collected on ${website.domain}`}><PaymentsTable rows={filteredPayments} /></Card>}
        {tab === 'shipping' && <Card title="Shipping" subtitle={`${filteredShipping.length} shipment(s) fulfilled by this website`}><ShippingTable rows={filteredShipping} /></Card>}
        {tab === 'returns' && <Card title="Returns" subtitle={`${filteredReturns.length} return request(s) for this website`}><ReturnsTable rows={filteredReturns} /></Card>}
        {tab === 'coupons' && <Card title="Coupons" subtitle={`${filteredCoupons.length} discount code(s) on ${website.domain}`}><CouponsTable rows={filteredCoupons} /></Card>}
        {tab === 'categories' && <Card title="Categories" subtitle={`${filteredCategories.length} category group(s) in this website catalog`}><CategoriesTable rows={filteredCategories} /></Card>}
        {tab === 'reviews' && <Card title="Reviews" subtitle={`${filteredReviews.length} review(s) published on ${website.domain}`}><ReviewsTable rows={filteredReviews} /></Card>}
        {tab === 'invoices' && <Card title="Invoices" subtitle={`${filteredInvoices.length} invoice(s) generated from this website's orders`}><InvoicesTable rows={filteredInvoices} /></Card>}
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] text-slate-400">
        <Building2 className="h-3.5 w-3.5" />
        <span>{client.name} · {client.id} · {website.projectId} · data isolated per website</span>
        <Receipt className="ml-auto h-3.5 w-3.5" />
        <span>Billing and commerce records are never shared with other tenants.</span>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Loader that switches between the client portfolio and a website workspace
// ---------------------------------------------------------------------------

export const ClientWorkspaceView: React.FC<ClientWorkspaceProps> = ({
  request, clientId, projectId, module: activeModule, onModuleChange, canSeeNotes, canBrowseClients,
  onOpenClient, onOpenProject, onBackToClients, onToast,
}) => {
  const [clientData, setClientData] = useState<ClientWorkspace | null>(null);
  const [projectData, setProjectData] = useState<ProjectWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const path = projectId
      ? `/api/agency/projects/${projectId}/workspace`
      : `/api/agency/clients/${clientId}/workspace`;

    request(path)
      .then((data) => {
        if (cancelled) return;
        if (projectId) {
          setProjectData(data as ProjectWorkspace);
          setClientData(null);
        } else {
          setClientData(data as ClientWorkspace);
          setProjectData(null);
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        const message = caught instanceof Error ? caught.message : 'Unable to open this workspace.';
        setError(message);
        onToast(message, 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // The requester is re-created on every dashboard render, so the scope keys
    // and the retry counter are the only meaningful dependencies here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, projectId, reloadKey]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
          <p className="mt-3 text-xs text-slate-500">Loading isolated workspace…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-lg">
        <div className="p-6 text-center">
          <Lock className="mx-auto h-6 w-6 text-rose-500" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">This workspace is not available</h2>
          <p className="mt-1 text-xs text-slate-500">{error}</p>
          <div className="mt-5 flex items-center justify-center gap-2">
            {canBrowseClients && (
              <button type="button" onClick={onBackToClients} className="crm-secondary">Back to clients</button>
            )}
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="crm-primary">Try again</button>
          </div>
        </div>
      </Card>
    );
  }

  if (projectId && projectData) {
    return (
      <ProjectView
        key={projectData.project.id}
        data={projectData}
        canBrowseClients={canBrowseClients}
        activeModule={activeModule || 'overview'}
        onModuleChange={onModuleChange || (() => undefined)}
        onOpenClient={onOpenClient}
        onBackToClients={onBackToClients}
      />
    );
  }

  if (clientData) {
    return (
      <ClientPortfolio
        data={clientData}
        canSeeNotes={canSeeNotes}
        canBrowseClients={canBrowseClients}
        onOpenProject={onOpenProject}
        onBackToClients={onBackToClients}
      />
    );
  }

  return null;
};
