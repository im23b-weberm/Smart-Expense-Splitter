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
 * Create a new participant entry.
 * @param {string} name
 * @returns {Participant}
 */
function createParticipant(name) {
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
  return /** @type {Expense} */ ({
    id: crypto.randomUUID(),
    description: description.trim(),
    amount,
    payerId,
    participantIds: [...participantIds],
    createdAt: new Date().toISOString(),
  });
}

/**
 * Basic in-memory store for the application.
 * Calculation logic will be implemented in a later issue.
 * @type {AppState}
 */
const state = {
  participants: [],
  expenses: [],
};

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
};

// Expose a small API on window for later UI wiring.
window.SES = {
  state,
  createParticipant,
  createExpense,
  expenseStore,
};

