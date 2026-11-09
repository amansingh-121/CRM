import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, Check, CheckCircle2, Circle, Clock, Globe2, Loader2, PhoneCall, Search,
  Send, ShoppingBag, Users,
} from 'lucide-react';
import type {
  AgencyOverview,
  AgencyOverviewCustomer,
  AgencyOverviewOrder,
  DepartmentActivity,
  DepartmentId,
  DepartmentsPayload,
  WorkspaceModule,
} from '../types/crm.ts';
import { formatPrice } from '../utils/currency.ts';

type Requester = (path: string, options?: RequestInit) => Promise<any>;
type Toast = (message: string, type?: 'success' | 'error' | 'info') => void;

const shortDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const shortDateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

function Progress({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return <div className="flex items-center gap-2">
    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${percent === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${percent}%` }} /></div>
    <span className="text-[10px] font-semibold text-slate-500">{done}/{total}</span>
  </div>;
}

function Stat({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: React.ElementType; tone: string }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    <p className="mt-4 text-xs font-medium text-slate-500">{label}</p>
    <div className="mt-1 text-xl font-bold tracking-tight text-slate-950">{value}</div>
    <p className="mt-2 text-[11px] text-slate-400">{hint}</p>
  </div>;
}

// ---------------------------------------------------------------------------
// Department desk: one workflow per client for the selected department.
// ---------------------------------------------------------------------------

export function DepartmentWorkspace({ department, request, canEdit, onToast, onOpenClient }: {
  department: DepartmentId;
  request: Requester;
  canEdit: boolean;
  onToast: Toast;
  onOpenClient: (clientId: string) => void;
}) {
  const [data, setData] = useState<DepartmentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [activityDraft, setActivityDraft] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      setData(await request('/api/agency/departments'));
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Unable to load department board', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setExpanded(null);
    setDraftNote('');
    setActivityDraft('');
    load();
  }, [department]);

  const blueprint = data?.departments.find((entry) => entry.id === department);
  const rows = useMemo(() => (data?.clients || []).map((client) => {
    const workflow = client.workflows[department];
    const steps = workflow?.steps || [];
    const done = steps.filter((step) => step.done).length;
    return {
      client,
      workflow,
      steps,
      done,
      total: steps.length,
      stage: steps.find((step) => !step.done)?.label || 'Completed',
    };
  }), [data, department]);

  const totalSteps = rows.reduce((sum, row) => sum + row.total, 0);
  const doneSteps = rows.reduce((sum, row) => sum + row.done, 0);
  const completed = rows.filter((row) => row.total > 0 && row.done === row.total).length;
  const lastUpdate = [...rows].sort((a, b) => (b.workflow?.updatedAt || '').localeCompare(a.workflow?.updatedAt || ''))[0]?.workflow?.updatedAt;
  const activities = (data?.activities || []).filter((activity) => activity.department === department);

  const toggleStep = async (clientId: string, stepId: string, done: boolean) => {
    if (!canEdit) return;
    setBusy(stepId);
    try {
      await request(`/api/agency/clients/${clientId}/workflow/${department}/${stepId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: !done, note: draftNote }),
      });
      onToast(!done ? 'Stage marked done' : 'Stage reopened');
      setDraftNote('');
      await load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Update failed', 'error');
    } finally {
      setBusy('');
    }
  };

  const logActivity = async (clientId: string) => {
    const message = activityDraft.trim();
    if (!message) return onToast('Write what happened first', 'error');
    setBusy('activity');
    try {
      await request(`/api/agency/clients/${clientId}/activity`, {
        method: 'POST',
        body: JSON.stringify({ department, message }),
      });
      onToast('Update logged');
      setActivityDraft('');
      await load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Could not log update', 'error');
    } finally {
      setBusy('');
    }
  };

  return <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Stat label="Clients on this desk" value={String(rows.length)} hint={`${completed} workflow(s) completed`} icon={Users} tone="bg-violet-100 text-violet-600" />
      <Stat label="Stages completed" value={`${doneSteps}/${totalSteps}`} hint={blueprint?.description || 'Department checklist'} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" />
      <Stat label="Last activity" value={lastUpdate ? shortDate(lastUpdate) : '—'} hint={canEdit ? 'Every tick is saved with your name' : 'Read-only for client logins'} icon={Clock} tone="bg-blue-100 text-blue-600" />
    </div>

    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{blueprint?.label || 'Department'} workflow</h2>
          <p className="mt-1 text-xs text-slate-500">{blueprint?.description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{rows.length} client(s)</span>
      </div>
      {loading ? <p className="px-5 py-10 text-center text-xs text-slate-400">Loading workflow…</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-5 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Projects</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Current stage</th>
            <th className="px-4 py-3 font-medium">Last update</th>
            <th className="px-5 py-3 text-right font-medium">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ client, workflow, steps, done, total, stage }) => <React.Fragment key={client.clientId}>
              <tr className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-800">{client.clientName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{client.contactName} · {client.status}</p>
                </td>
                <td className="px-4 py-3.5 text-slate-500">{client.projects}</td>
                <td className="px-4 py-3.5"><Progress done={done} total={total} /></td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${done === total ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {done === total ? <BadgeCheck className="h-3 w-3" /> : <Circle className="h-3 w-3" />}{stage}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-slate-500">{shortDate(workflow?.updatedAt)}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onOpenClient(client.clientId)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-violet-200 hover:text-violet-600">Client</button>
                    <button type="button" onClick={() => { setExpanded(expanded === client.clientId ? null : client.clientId); setDraftNote(''); setActivityDraft(''); }} className="rounded-lg border border-violet-200 px-2.5 py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-50">{expanded === client.clientId ? 'Close' : 'Update'}</button>
                  </div>
                </td>
              </tr>
              {expanded === client.clientId && <tr className="bg-slate-50/70">
                <td colSpan={6} className="px-5 py-5">
                  <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Checklist — {blueprint?.label}</p>
                      <div className="mt-2 space-y-1.5">
                        {steps.map((step) => <button key={step.id} type="button" disabled={!canEdit || busy === step.id} onClick={() => toggleStep(client.clientId, step.id, step.done)} className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition ${step.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white hover:border-violet-200'} disabled:opacity-60`}>
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${step.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'}`}>{busy === step.id ? <Loader2 className="h-3 w-3 animate-spin text-slate-500" /> : <Check className="h-3 w-3" />}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-xs font-semibold ${step.done ? 'text-emerald-900' : 'text-slate-700'}`}>{step.label}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">{step.done ? `Done by ${step.doneBy || 'staff'} · ${shortDateTime(step.doneAt)}` : 'Pending'}{step.note ? ` · ${step.note}` : ''}</span>
                          </span>
                        </button>)}
                      </div>
                      <input value={draftNote} onChange={(event) => setDraftNote(event.target.value)} placeholder="Optional note for the next stage you tick (e.g. called client, payment link shared)" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Log what happened</p>
                      <textarea value={activityDraft} onChange={(event) => setActivityDraft(event.target.value)} rows={3} placeholder="Call ho gayi, website share ki, payment aa gaya…" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
                      <button type="button" disabled={busy === 'activity'} onClick={() => logActivity(client.clientId)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"><Send className="h-3 w-3" />Save update</button>
                      <div className="mt-4 space-y-2">
                        {(data?.activities || []).filter((activity) => activity.clientId === client.clientId && activity.department === department).slice(0, 4).map((activity) => <div key={activity.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2"><p className="text-[11px] text-slate-700">{activity.message}</p><p className="mt-1 text-[10px] text-slate-400">{activity.actorName} · {shortDateTime(activity.createdAt)}</p></div>)}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>}
            </React.Fragment>)}
          </tbody>
        </table>
        {!rows.length && <p className="p-10 text-center text-xs text-slate-400">No clients on this desk yet.</p>}
      </div>}
    </section>

    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="px-5 pt-5 pb-4"><h2 className="text-sm font-semibold text-slate-900">How this desk runs</h2><p className="mt-1 text-xs text-slate-500">Every client moves through these stages. Tick them as work happens.</p></div>
        <ol className="space-y-2 px-5 pb-5">{(blueprint?.steps || []).map((step, index) => <li key={step.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-xs text-slate-700"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-600">{index + 1}</span>{step.label}</li>)}</ol>
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <div className="px-5 pt-5 pb-4"><h2 className="text-sm font-semibold text-slate-900">Recent updates</h2><p className="mt-1 text-xs text-slate-500">Calls, payments and fixes logged by this desk.</p></div>
        <div className="divide-y divide-slate-100">{activities.slice(0, 7).map((activity) => <ActivityRow key={activity.id} activity={activity} clientName={rows.find((row) => row.client.clientId === activity.clientId)?.client.clientName || 'Client'} />)}
          {!activities.length && <p className="px-5 pb-6 text-xs text-slate-400">Nothing logged yet. Open a client and save the first update.</p>}
        </div>
      </section>
    </div>
  </>;
}

function ActivityRow({ activity, clientName }: { activity: DepartmentActivity; clientName: string }) {
  return <div className="flex gap-3 px-5 py-3">
    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><PhoneCall className="h-3.5 w-3.5" /></div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-slate-700">{activity.message}</p>
      <p className="mt-1 text-[10px] text-slate-400">{clientName} · {activity.actorName} · {shortDateTime(activity.createdAt)}</p>
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Order book: every client website's orders in one read-only table.
// ---------------------------------------------------------------------------

export function OrderBook({ rows, onOpenProject }: { rows: AgencyOverviewOrder[]; onOpenProject: (projectId: string, module: WorkspaceModule) => void }) {
  const [query, setQuery] = useState('');
  const filtered = rows.filter((order) => !query || `${order.orderNumber} ${order.customerName} ${order.projectName} ${order.clientName} ${order.status}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
    <div className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or website" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-400" /></div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{filtered.length} order(s) across all clients</span>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-xs">
      <thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
        <th className="px-5 py-3 font-medium">Order</th><th className="px-4 py-3 font-medium">Website</th><th className="px-4 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Total</th><th className="px-4 py-3 font-medium">Payment</th><th className="px-5 py-3 text-right font-medium">Status</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map((order) => <tr key={`${order.projectId}-${order.orderNumber}`} className="cursor-pointer hover:bg-slate-50/60" onClick={() => onOpenProject(order.projectId, 'orders')}>
        <td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{order.orderNumber}</p><p className="mt-0.5 text-[10px] text-slate-400"><ShoppingBag className="mr-1 inline h-3 w-3" />{order.status}</p></td>
        <td className="px-4 py-3.5"><p className="font-medium text-slate-700">{order.projectName}</p><p className="mt-0.5 text-[10px] text-slate-400">{order.clientName}</p></td>
        <td className="px-4 py-3.5 text-slate-600">{order.customerName}</td>
        <td className="px-4 py-3.5 text-slate-500">{shortDate(order.createdAt)}</td>
        <td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(order.total)}</td>
        <td className="px-4 py-3.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : order.paymentStatus === 'Refunded' ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'}`}>{order.paymentStatus}</span></td>
        <td className="px-5 py-3.5 text-right"><span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600"><Globe2 className="h-3 w-3" />Open website</span></td>
      </tr>)}</tbody>
    </table>{!filtered.length && <p className="p-10 text-center text-xs text-slate-400">No orders match this search.</p>}</div>
  </section>;
}

// ---------------------------------------------------------------------------
// Customer book: every customer from every client website.
// ---------------------------------------------------------------------------

export function CustomerBook({ rows, onOpenProject }: { rows: AgencyOverviewCustomer[]; onOpenProject: (projectId: string, module: WorkspaceModule) => void }) {
  const [query, setQuery] = useState('');
  const filtered = rows.filter((customer) => !query || `${customer.name} ${customer.email} ${customer.city} ${customer.projectName} ${customer.clientName}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
    <div className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, email or website" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-violet-400" /></div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">{filtered.length} customer(s) across all clients</span>
    </div>
    <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs">
      <thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-400">
        <th className="px-5 py-3 font-medium">Customer</th><th className="px-4 py-3 font-medium">Website</th><th className="px-4 py-3 font-medium">City</th><th className="px-4 py-3 font-medium">Orders</th><th className="px-4 py-3 font-medium">Lifetime value</th><th className="px-5 py-3 text-right font-medium">Status</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map((customer) => <tr key={`${customer.projectId}-${customer.email}`} className="cursor-pointer hover:bg-slate-50/60" onClick={() => onOpenProject(customer.projectId, 'customers')}>
        <td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{customer.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{customer.email} · {customer.phone}</p></td>
        <td className="px-4 py-3.5"><p className="font-medium text-slate-700">{customer.projectName}</p><p className="mt-0.5 text-[10px] text-slate-400">{customer.clientName}</p></td>
        <td className="px-4 py-3.5 text-slate-500">{customer.city}</td>
        <td className="px-4 py-3.5 text-slate-600">{customer.orders}</td>
        <td className="px-4 py-3.5 font-semibold text-slate-800">{formatPrice(customer.lifetimeSpend)}</td>
        <td className="px-5 py-3.5 text-right"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${customer.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{customer.status}</span></td>
      </tr>)}</tbody>
    </table>{!filtered.length && <p className="p-10 text-center text-xs text-slate-400">No customers match this search.</p>}</div>
  </section>;
}

export const DEPARTMENT_META: Record<DepartmentId, { label: string; subtitle: string }> = {
  sales: { label: 'Sales desk', subtitle: 'Calls, requirements, proposal and deal closure for every client.' },
  accounts: { label: 'Accounts', subtitle: 'Invoices, payment links, receipts and outstanding follow-up.' },
  onboarding: { label: 'Onboarding', subtitle: 'Kickoff, brand assets, content and access before delivery.' },
  support: { label: 'Support', subtitle: 'Client issues, calls, fixes and confirmations in one place.' },
  fulfilment: { label: 'Fulfilment', subtitle: 'Storefront orders moving from confirmation to delivery.' },
};

export type { AgencyOverview, AgencyOverviewOrder, AgencyOverviewCustomer };
