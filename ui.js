const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getParticipants() {
  return window.SES?.expenseStore.getParticipants() ?? [];
}

function getExpenses() {
  return window.SES?.expenseStore.getExpenses() ?? [];
}

function renderParticipants() {
  const list = document.getElementById("participant-list");
  const payerSelect = document.getElementById("expense-payer");
  const participantsContainer = document.getElementById("expense-participants");
  if (!list || !payerSelect || !participantsContainer) return;

  const participants = getParticipants();

  list.innerHTML = "";
  payerSelect.innerHTML = '<option value="">Select payer…</option>';
  participantsContainer.innerHTML = "";

  for (const p of participants) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `
      <span class="chip__avatar" aria-hidden="true"></span>
      <span class="chip__label">${p.name}</span>
    `;
    list.appendChild(chip);

    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    payerSelect.appendChild(opt);

    const label = document.createElement("label");
    label.className = "checkbox-pill";
    label.innerHTML = `
      <input type="checkbox" value="${p.id}" />
      <span>${p.name}</span>
    `;
    participantsContainer.appendChild(label);
  }
}

function renderExpenses() {
  const tbody = document.getElementById("expenses-rows");
  if (!tbody) return;

  const expenses = getExpenses();
  const participants = getParticipants();
  const byId = Object.fromEntries(participants.map((p) => [p.id, p]));

  tbody.innerHTML = "";

  for (const e of expenses) {
    const tr = document.createElement("tr");

    const payerName = byId[e.payerId]?.name ?? "Unknown";
    const sharedNames =
      e.participantIds.length > 0
        ? e.participantIds
            .map((id) => byId[id]?.name)
            .filter(Boolean)
            .join(", ")
        : "All participants";

    tr.innerHTML = `
      <td>${e.description}</td>
      <td>${currencyFormatter.format(e.amount)}</td>
      <td>${payerName}</td>
      <td>${sharedNames}</td>
    `;

    tbody.appendChild(tr);
  }
}

function setupParticipantForm() {
  const form = document.getElementById("participant-form");
  const input = document.getElementById("participant-name");
  const errorEl = document.getElementById("participant-error");
  if (!form || !input || !errorEl) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!window.SES?.expenseStore) return;

    errorEl.textContent = "";

    try {
      window.SES.expenseStore.addParticipant(input.value);
      input.value = "";
      renderParticipants();
      renderExpenses();
      window.SES_RESULTS?.renderResults();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Could not add participant.";
    }
  });
}

function setupExpenseForm() {
  const form = document.getElementById("expense-form");
  const descriptionInput = document.getElementById("expense-description");
  const amountInput = document.getElementById("expense-amount");
  const payerSelect = document.getElementById("expense-payer");
  const participantsContainer = document.getElementById("expense-participants");
  const errorEl = document.getElementById("expense-error");
  if (
    !form ||
    !descriptionInput ||
    !amountInput ||
    !payerSelect ||
    !participantsContainer ||
    !errorEl
  ) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!window.SES?.expenseStore || !window.SES?.createExpense) return;

    errorEl.textContent = "";

    const rawAmount = Number.parseFloat(amountInput.value.replace(",", "."));
    const payerId = payerSelect.value;
    const participantIds = Array.from(
      participantsContainer.querySelectorAll('input[type="checkbox"]:checked'),
    ).map((input) => /** @type {HTMLInputElement} */ (input).value);

    try {
      const expense = window.SES.createExpense({
        description: descriptionInput.value,
        amount: rawAmount,
        payerId,
        participantIds,
      });
      window.SES.expenseStore.addExpense(expense);

      descriptionInput.value = "";
      amountInput.value = "";
      payerSelect.value = "";
      participantsContainer
        .querySelectorAll('input[type="checkbox"]')
        .forEach((input) => {
          /** @type {HTMLInputElement} */ (input).checked = false;
        });

      renderExpenses();
      window.SES_RESULTS?.renderResults();
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : "Could not add expense.";
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderParticipants();
  renderExpenses();
  setupParticipantForm();
  setupExpenseForm();
});

