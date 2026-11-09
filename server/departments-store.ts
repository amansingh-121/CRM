import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ClientDepartmentWorkflow,
  DepartmentActivity,
  DepartmentBlueprint,
  DepartmentId,
  DepartmentStep,
} from '../src/types/crm.ts';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const DEPARTMENTS_FILE = path.join(DATA_DIR, 'departments.json');

// Every department owns its own checklist. Staff tick a stage the moment the
// work really happened (call done, site shared, payment received, delivered),
// so the agency can see where each client stands without asking around.
export const DEPARTMENT_BLUEPRINTS: DepartmentBlueprint[] = [
  {
    id: 'sales',
    label: 'Sales desk',
    description: 'Calls, requirement capture and closing the deal with the client.',
    steps: [
      { id: 'call', label: 'Call with client' },
      { id: 'requirements', label: 'Requirements captured' },
      { id: 'proposal', label: 'Website / proposal shared' },
      { id: 'quote', label: 'Quote approved' },
      { id: 'won', label: 'Deal closed' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    description: 'Invoicing, payment follow-up and receipts.',
    steps: [
      { id: 'invoice', label: 'Invoice raised' },
      { id: 'link', label: 'Payment link shared' },
      { id: 'received', label: 'Payment received' },
      { id: 'receipt', label: 'Receipt / acknowledgement sent' },
    ],
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    description: 'Kickoff, assets and access before delivery starts.',
    steps: [
      { id: 'kickoff', label: 'Kickoff call done' },
      { id: 'brand', label: 'Brand assets received' },
      { id: 'content', label: 'Content and copy received' },
      { id: 'access', label: 'Domain / hosting access collected' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    description: 'Client issues, fixes and confirmations.',
    steps: [
      { id: 'issue', label: 'Issue logged' },
      { id: 'call', label: 'Call with client' },
      { id: 'fix', label: 'Fix deployed' },
      { id: 'confirmed', label: 'Client confirmed resolution' },
    ],
  },
  {
    id: 'fulfilment',
    label: 'Fulfilment',
    description: 'Storefront orders moving from pack to delivery.',
    steps: [
      { id: 'confirmed', label: 'Order confirmed' },
      { id: 'packed', label: 'Packed' },
      { id: 'dispatched', label: 'Dispatched with tracking' },
      { id: 'delivered', label: 'Delivered and closed' },
    ],
  },
];

interface StoreState {
  workflows: Record<string, Partial<Record<DepartmentId, ClientDepartmentWorkflow>>>;
  activities: DepartmentActivity[];
}

function blueprintFor(department: DepartmentId): DepartmentBlueprint {
  return DEPARTMENT_BLUEPRINTS.find((entry) => entry.id === department) || DEPARTMENT_BLUEPRINTS[0];
}

function blankSteps(department: DepartmentId): DepartmentStep[] {
  return blueprintFor(department).steps.map((step) => ({ id: step.id, label: step.label, done: false }));
}

function buildWorkflow(clientId: string, department: DepartmentId, doneIds: string[], doneBy: string, doneAt: string, notes: Record<string, string> = {}): ClientDepartmentWorkflow {
  return {
    clientId,
    department,
    steps: blankSteps(department).map((step) =>
      doneIds.includes(step.id)
        ? { ...step, done: true, doneBy, doneAt, note: notes[step.id] }
        : step,
    ),
    updatedAt: doneAt,
  };
}

// Demo progress for the three seeded clients so each desk opens with real work.
function seedState(): StoreState {
  const workflows: StoreState['workflows'] = {
    'ten-aureva': {
      sales: buildWorkflow('ten-aureva', 'sales', ['call', 'requirements', 'proposal', 'quote', 'won'], 'Rohit Sharma', '2026-10-18T10:20:00Z', {
        call: 'Called Aarav — festive campaign and CRM scope confirmed.',
        proposal: 'Storefront v2 proposal and sitemap shared on email.',
      }),
      accounts: buildWorkflow('ten-aureva', 'accounts', ['invoice', 'link', 'received'], 'Aman Verma', '2026-10-24T09:15:00Z', {
        received: 'INV-2026-1001 total ₹2,95,000 credited to the agency account.',
      }),
      onboarding: buildWorkflow('ten-aureva', 'onboarding', ['kickoff', 'brand', 'content'], 'Priya Nair', '2026-10-12T12:00:00Z'),
      support: buildWorkflow('ten-aureva', 'support', ['issue', 'call'], 'Priya Nair', '2026-10-27T16:45:00Z', {
        issue: 'Checkout coupon AUREVA15 not applying on mobile.',
      }),
      fulfilment: buildWorkflow('ten-aureva', 'fulfilment', ['confirmed', 'packed', 'dispatched'], 'Rohit Sen', '2026-10-28T08:30:00Z'),
    },
    'ten-lumina': {
      sales: buildWorkflow('ten-lumina', 'sales', ['call', 'requirements', 'proposal', 'quote', 'won'], 'Rohit Sharma', '2026-09-02T11:10:00Z'),
      accounts: buildWorkflow('ten-lumina', 'accounts', ['invoice', 'link'], 'Aman Verma', '2026-09-22T10:05:00Z', {
        link: 'INV-2026-1003 payment link sent on WhatsApp.',
      }),
      onboarding: buildWorkflow('ten-lumina', 'onboarding', ['kickoff', 'brand', 'content', 'access'], 'Priya Nair', '2026-09-10T14:20:00Z'),
      support: buildWorkflow('ten-lumina', 'support', ['issue', 'call', 'fix'], 'Rohit Sen', '2026-10-29T18:40:00Z', {
        fix: 'Pendant light gallery images re-uploaded at full resolution.',
      }),
      fulfilment: buildWorkflow('ten-lumina', 'fulfilment', ['confirmed', 'packed'], 'Rohit Sen', '2026-10-29T09:00:00Z'),
    },
    'ten-northwind': {
      sales: buildWorkflow('ten-northwind', 'sales', ['call', 'requirements'], 'Rohit Sharma', '2026-10-21T15:30:00Z', {
        call: 'Rahul wants merch plus workshop seat booking in the same store.',
      }),
      accounts: buildWorkflow('ten-northwind', 'accounts', [], '', ''),
      onboarding: buildWorkflow('ten-northwind', 'onboarding', ['kickoff'], 'Priya Nair', '2026-10-22T09:00:00Z'),
      support: buildWorkflow('ten-northwind', 'support', [], '', ''),
      fulfilment: buildWorkflow('ten-northwind', 'fulfilment', ['confirmed'], 'Rohit Sen', '2026-10-27T17:20:00Z'),
    },
  };

  const activities: DepartmentActivity[] = [
    { id: 'dep-act-1', clientId: 'ten-lumina', department: 'support', message: 'Fix deployed — pendant light gallery images replaced.', actorId: 'usr-admin-1', actorName: 'Rohit Sharma', createdAt: '2026-10-29T18:40:00Z' },
    { id: 'dep-act-2', clientId: 'ten-aureva', department: 'fulfilment', message: 'Dispatched ORD-2026-9043 with Aureva Express tracking.', actorId: 'usr-admin-1', actorName: 'Rohit Sharma', createdAt: '2026-10-28T08:30:00Z' },
    { id: 'dep-act-3', clientId: 'ten-aureva', department: 'support', message: 'Call with Aarav — coupon issue reproduced on mobile checkout.', actorId: 'usr-admin-1', actorName: 'Rohit Sharma', createdAt: '2026-10-27T16:45:00Z' },
    { id: 'dep-act-4', clientId: 'ten-aureva', department: 'accounts', message: 'Payment received for INV-2026-1001 (₹2,95,000).', actorId: 'usr-superadmin', actorName: 'Aman Verma', createdAt: '2026-10-24T09:15:00Z' },
    { id: 'dep-act-5', clientId: 'ten-northwind', department: 'sales', message: 'Call with Rahul — merch + workshop booking scope discussed.', actorId: 'usr-admin-1', actorName: 'Rohit Sharma', createdAt: '2026-10-21T15:30:00Z' },
  ];

  return { workflows, activities };
}

function loadState(): StoreState {
  if (!existsSync(DEPARTMENTS_FILE)) return seedState();
  try {
    const parsed = JSON.parse(readFileSync(DEPARTMENTS_FILE, 'utf8'));
    const seed = seedState();
    return {
      workflows: parsed && typeof parsed.workflows === 'object' && parsed.workflows ? parsed.workflows : seed.workflows,
      activities: Array.isArray(parsed?.activities) ? parsed.activities : seed.activities,
    };
  } catch (error) {
    console.error('Ignoring unreadable department snapshot:', error);
    return seedState();
  }
}

const state: StoreState = loadState();

function persist() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DEPARTMENTS_FILE, JSON.stringify(state), 'utf8');
  } catch (error) {
    console.error('Unable to persist department snapshot:', error);
  }
}

export function getWorkflow(clientId: string, department: DepartmentId): ClientDepartmentWorkflow {
  const existing = state.workflows[clientId]?.[department];
  if (existing) return existing;
  const workflow: ClientDepartmentWorkflow = {
    clientId,
    department,
    steps: blankSteps(department),
    updatedAt: new Date().toISOString(),
  };
  state.workflows[clientId] = { ...(state.workflows[clientId] || {}), [department]: workflow };
  return workflow;
}

export function getWorkflowsFor(clientId: string): Record<DepartmentId, ClientDepartmentWorkflow> {
  return DEPARTMENT_BLUEPRINTS.reduce((accumulator, department) => {
    accumulator[department.id] = getWorkflow(clientId, department.id);
    return accumulator;
  }, {} as Record<DepartmentId, ClientDepartmentWorkflow>);
}

export function setStep(input: {
  clientId: string;
  department: DepartmentId;
  stepId: string;
  done: boolean;
  note?: string;
  actor: { id: string; name: string };
}): { workflow: ClientDepartmentWorkflow; activity: DepartmentActivity } | undefined {
  const workflow = getWorkflow(input.clientId, input.department);
  const step = workflow.steps.find((entry) => entry.id === input.stepId);
  if (!step) return undefined;

  const now = new Date().toISOString();
  step.done = input.done;
  step.doneAt = input.done ? now : undefined;
  step.doneBy = input.done ? input.actor.name : undefined;
  if (input.note !== undefined) step.note = input.note.trim() || undefined;
  workflow.updatedAt = now;

  const activity = pushActivity({
    clientId: input.clientId,
    department: input.department,
    message: `${step.label} — ${input.done ? 'done' : 'reopened'}${input.note ? `: ${input.note.trim()}` : ''}`,
    actor: input.actor,
    createdAt: now,
  });
  persist();
  return { workflow, activity };
}

export function addActivity(input: {
  clientId: string;
  department: DepartmentId;
  message: string;
  actor: { id: string; name: string };
}): DepartmentActivity {
  const activity = pushActivity({ ...input, createdAt: new Date().toISOString() });
  persist();
  return activity;
}

function pushActivity(input: {
  clientId: string;
  department: DepartmentId;
  message: string;
  actor: { id: string; name: string };
  createdAt: string;
}): DepartmentActivity {
  const activity: DepartmentActivity = {
    id: `dep-act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    clientId: input.clientId,
    department: input.department,
    message: input.message,
    actorId: input.actor.id,
    actorName: input.actor.name,
    createdAt: input.createdAt,
  };
  state.activities = [activity, ...state.activities].slice(0, 200);
  return activity;
}

export function listActivities(filter: { clientIds: string[] | 'all'; department?: DepartmentId; limit?: number }): DepartmentActivity[] {
  return state.activities
    .filter((activity) => (filter.clientIds === 'all' || filter.clientIds.includes(activity.clientId)))
    .filter((activity) => !filter.department || activity.department === filter.department)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, filter.limit || 40);
}
