const formatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Render the balance overview into the results table.
 */
function renderResults() {
  const ses = window.SES;
  if (!ses || !ses.expenseStore) return;

  const rowsContainer = document.getElementById("results-rows");
  const emptyMessage = document.getElementById("results-empty-message");
  if (!rowsContainer || !emptyMessage) return;

  const balances = ses.expenseStore.calculateBalances();

  rowsContainer.innerHTML = "";

  if (!balances.length) {
    emptyMessage.hidden = false;
    return;
  }

  emptyMessage.hidden = true;

  for (const entry of balances) {
    const tr = document.createElement("tr");

    const status =
      entry.netBalance > 0 ? "receives" : entry.netBalance < 0 ? "owes" : "settled";

    tr.innerHTML = `
      <td>${entry.name}</td>
      <td>${formatter.format(entry.paidTotal)}</td>
      <td>${formatter.format(entry.shareTotal)}</td>
      <td>${formatter.format(entry.netBalance)}</td>
      <td class="results-status results-status--${status}">${status}</td>
    `;

    rowsContainer.appendChild(tr);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  renderResults();
});

// Expose for manual triggering (e.g. after form interactions in later issues)
window.SES_RESULTS = {
  renderResults,
};

