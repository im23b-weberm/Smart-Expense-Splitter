// Smart Expense Splitter – basic frontend data model (Issue #2)

/**
 * @typedef {Object} Participant
 * @property {string} id
 * @property {string} name
 * @property {boolean} [active]
 */

/**
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} description
 * @property {number} amount
 * @property {string} payerId
 * @property {string[]} participantIds
 * @property {string} [createdAt]
 */

/**
 * @typedef {Object} AppState
 * @property {Participant[]} participants
 * @property {Expense[]} expenses
 */

/**
 * @typedef {Object} BackupPayload
 * @property {string} format
 * @property {number} version
 * @property {string} exportedAt
 * @property {AppState} state
 */

/**
 * @typedef {Object} BalanceEntry
 * @property {string} participantId
 * @property {string} name
 * @property {number} paidTotal
 * @property {number} shareTotal
 * @property {number} netBalance
 */

const STORAGE_KEY = "smart-expense-splitter-state";
const BACKUP_FORMAT = "smart-expense-splitter-backup";
const BACKUP_VERSION = 1;

function getDefaultState() {
  return {
    participants: [],
    expenses: [],
  };
}

/**
 * @param {AppState} currentState
 * @returns {AppState}
 */
function cloneState(currentState) {
  return {
    participants: currentState.participants.map((participant) => ({ ...participant })),
    expenses: currentState.expenses.map((expense) => ({
      ...expense,
      participantIds: [...expense.participantIds],
    })),
  };
}

/**
 * @param {unknown} candidate
 * @returns {AppState}
 */
function normalizeState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};

  const participants = Array.isArray(source.participants)
    ? source.participants
        .filter(
          (participant) =>
            participant &&
            typeof participant === "object" &&
            typeof participant.id === "string" &&
            typeof participant.name === "string",
        )
        .map((participant) => ({
          id: participant.id,
          name: participant.name,
          active: participant.active !== false,
        }))
    : [];

  const expenses = Array.isArray(source.expenses)
    ? source.expenses
        .filter(
          (expense) =>
            expense &&
            typeof expense === "object" &&
            typeof expense.id === "string" &&
            typeof expense.description === "string" &&
            Number.isFinite(expense.amount) &&
            typeof expense.payerId === "string" &&
            Array.isArray(expense.participantIds),
        )
        .map((expense) => ({
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          payerId: expense.payerId,
          participantIds: expense.participantIds.filter((participantId) => typeof participantId === "string"),
          createdAt: typeof expense.createdAt === "string" ? expense.createdAt : new Date().toISOString(),
        }))
    : [];

  return {
    participants,
    expenses,
  };
}

/**
 * @param {unknown} candidate
 * @returns {AppState}
 */
function extractState(candidate) {
  if (candidate && typeof candidate === "object" && candidate.state) {
    return normalizeState(candidate.state);
  }

  return normalizeState(candidate);
}

function isBrowserStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadState() {
  if (!isBrowserStorageAvailable()) {
    return getDefaultState();
  }

  try {
    const storedState = window.localStorage.getItem(STORAGE_KEY);
    if (!storedState) {
      return getDefaultState();
    }

    const parsedState = JSON.parse(storedState);
    return normalizeState(parsedState);
  } catch {
    return getDefaultState();
  }
}

function persistState() {
  if (!isBrowserStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors so the app still works without persistence.
  }
}

/**
 * @param {AppState} nextState
 */
function overwriteState(nextState) {
  const normalizedState = cloneState(nextState);
  state.participants.splice(0, state.participants.length, ...normalizedState.participants);
  state.expenses.splice(0, state.expenses.length, ...normalizedState.expenses);
  persistState();
}

/**
 * @returns {BackupPayload}
 */
function exportState() {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: cloneState(state),
  };
}

/**
 * @param {unknown} payload
 * @returns {AppState}
 */
function importState(payload) {
  const backup = payload && typeof payload === "object" ? payload : null;
  if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    throw new Error("Unsupported backup file.");
  }

  const normalizedState = extractState(backup);
  overwriteState(normalizedState);
  return state;
}

/**
 * @param {string} name
 */
function ensureValidParticipantName(name) {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Participant name must not be empty.");
  }
}

/**
 * Create a new participant entry.
 * @param {string} name
 * @returns {Participant}
 */
function createParticipant(name) {
  ensureValidParticipantName(name);
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    active: true,
  };
}

/**
 * Create a new expense entry.
 * @param {Object} params
 * @param {string} params.description
 * @param {number} params.amount
 * @param {string} params.payerId
 * @param {string[]} params.participantIds
 * @returns {Expense}
 */
function createExpense({ description, amount, payerId, participantIds }) {
  const trimmedDescription = (description ?? "").toString().trim();
  if (!trimmedDescription) {
    throw new Error("Expense description must not be empty.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Expense amount must be a positive number.");
  }

  if (!payerId) {
    throw new Error("Expense must have a payer.");
  }

  const uniqueParticipantIds = Array.from(new Set(participantIds || []));

  return /** @type {Expense} */ ({
    id: crypto.randomUUID(),
    description: trimmedDescription,
    amount,
    payerId,
    participantIds: uniqueParticipantIds,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Basic in-memory store for the application.
 * @type {AppState}
 */
const state = loadState();

/**
 * Compute how much each participant has paid vs. should pay.
 * Positive netBalance => participant should receive money.
 * Negative netBalance => participant should pay money.
 *
 * @param {AppState} currentState
 * @returns {BalanceEntry[]}
 */
function calculateBalances(currentState) {
  /** @type {Record<string, BalanceEntry>} */
  const balancesById = {};

  for (const participant of currentState.participants) {
    balancesById[participant.id] = {
      participantId: participant.id,
      name: participant.name,
      paidTotal: 0,
      shareTotal: 0,
      netBalance: 0,
    };
  }

  for (const expense of currentState.expenses) {
    const involvedIds =
      expense.participantIds.length > 0 ? expense.participantIds : currentState.participants.map((p) => p.id);

    if (involvedIds.length === 0 || expense.amount <= 0) continue;

    const share = expense.amount / involvedIds.length;

    // The payer actually paid the full amount
    const payerEntry = balancesById[expense.payerId];
    if (payerEntry) {
      payerEntry.paidTotal += expense.amount;
    }

    // Each involved participant owes a share
    for (const pid of involvedIds) {
      const entry = balancesById[pid];
      if (!entry) continue;
      entry.shareTotal += share;
    }
  }

  for (const entry of Object.values(balancesById)) {
    entry.netBalance = Number((entry.paidTotal - entry.shareTotal).toFixed(2));
  }

  return Object.values(balancesById);
}

const expenseStore = {
  /** @returns {Participant[]} */
  getParticipants() {
    return state.participants;
  },

  /** @returns {Expense[]} */
  getExpenses() {
    return state.expenses;
  },

  /**
   * @returns {AppState}
   */
  getState() {
    return cloneState(state);
  },

  /**
   * @param {string} name
   * @returns {Participant}
   */
  addParticipant(name) {
    const participant = createParticipant(name);

    state.participants.push(participant);
    persistState();
    return participant;
  },

  /**
   * @param {Expense} expense
   */
  addExpense(expense) {
    state.expenses.push(expense);
    persistState();
  },

  /**
   * Remove a participant and update expenses accordingly.
   * @param {string} participantId
   * @returns {boolean} removed
   */
  removeParticipant(participantId) {
    const pIndex = state.participants.findIndex((p) => p.id === participantId);
    if (pIndex === -1) return false;

    state.participants.splice(pIndex, 1);

    const newExpenses = state.expenses
      .map((exp) => {
        if (exp.payerId === participantId) return null; // drop expenses where payer removed
        return {
          ...exp,
          participantIds: (exp.participantIds || []).filter((id) => id !== participantId),
        };
      })
      .filter(Boolean);

    state.expenses.splice(0, state.expenses.length, ...newExpenses);
    persistState();
    return true;
  },

  /**
   * Remove a single expense by id.
   * @param {string} expenseId
   * @returns {boolean}
   */
  removeExpense(expenseId) {
    const idx = state.expenses.findIndex((e) => e.id === expenseId);
    if (idx === -1) return false;
    state.expenses.splice(idx, 1);
    persistState();
    return true;
  },

  /**
   * Reset the entire app state to defaults.
   */
  reset() {
    overwriteState(getDefaultState());
  },

  /**
   * @param {AppState} nextState
   */
  replaceState(nextState) {
    overwriteState(nextState);
  },

  /**
   * @returns {BackupPayload}
   */
  exportState() {
    return exportState();
  },

  /**
   * @param {unknown} payload
   * @returns {AppState}
   */
  importState(payload) {
    return importState(payload);
  },

  /**
   * @returns {BalanceEntry[]}
   */
  calculateBalances() {
    return calculateBalances(state);
  },
};

// Expose a small API on window for later UI wiring.
window.SES = {
  state,
  createParticipant,
  createExpense,
  expenseStore,
  calculateBalances,
  exportState,
  importState,
  overwriteState,
};