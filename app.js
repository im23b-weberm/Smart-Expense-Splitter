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
 * @typedef {Object} BalanceEntry
 * @property {string} participantId
 * @property {string} name
 * @property {number} paidTotal
 * @property {number} shareTotal
 * @property {number} netBalance
 */

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
const state = {
  participants: [],
  expenses: [],
};

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
   * @param {string} name
   * @returns {Participant}
   */
  addParticipant(name) {
    const participant = createParticipant(name);
    state.participants.push(participant);
    return participant;
  },

  /**
   * @param {Expense} expense
   */
  addExpense(expense) {
    state.expenses.push(expense);
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
};

export {
  createParticipant,
  createExpense,
  calculateBalances,
};