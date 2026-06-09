const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function getParticipants() {
  return window.SES?.expenseStore.getParticipants() ?? [];
}

function getExpenses() {
  return window.SES?.expenseStore.getExpenses() ?? [];
}

function renderAll() {
  renderParticipants();
  renderExpenses();
  window.SES_RESULTS?.renderResults();
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
      <button class="chip__delete" data-id="${p.id}" title="Remove participant">×</button>
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
      <td><button class="btn btn--secondary btn--icon expense-delete" data-id="${e.id}" title="Delete expense">Delete</button></td>
    `;

    tbody.appendChild(tr);
  }
}

function setupRowDeletionHandlers() {
  const participantList = document.getElementById("participant-list");
  const expensesTbody = document.getElementById("expenses-rows");
  const messageEl = document.getElementById("backup-message");

  const setMessage = (msg) => {
    if (messageEl) messageEl.textContent = msg;
  };

  if (participantList) {
    participantList.addEventListener("click", (ev) => {
      const btn = ev.target.closest?.(".chip__delete");
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;
      if (!confirm("Remove participant and related expenses?")) return;
      window.SES.expenseStore.removeParticipant(id);
      renderAll();
      setMessage("Participant removed.");
    });
  }

  if (expensesTbody) {
    expensesTbody.addEventListener("click", (ev) => {
      const btn = ev.target.closest?.(".expense-delete");
      if (!btn) return;
      const id = btn.dataset.id;
      if (!id) return;
      if (!confirm("Delete this expense?")) return;
      window.SES.expenseStore.removeExpense(id);
      renderAll();
      setMessage("Expense deleted.");
    });
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

function setupBackupControls() {
  const exportButton = document.getElementById("backup-export");
  const importTrigger = document.getElementById("backup-import-trigger");
  const resetButton = document.getElementById("backup-reset");
  const importInput = document.getElementById("backup-import-input");
  const messageEl = document.getElementById("backup-message");

  if (!exportButton || !importTrigger || !importInput || !messageEl) {
    return;
  }

  const setMessage = (message) => {
    messageEl.textContent = message;
  };

  exportButton.addEventListener("click", () => {
    if (!window.SES?.expenseStore) return;

    try {
      const backup = window.SES.expenseStore.exportState();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = backup.exportedAt.replace(/[:.]/g, "-");

      link.href = url;
      link.download = `smart-expense-splitter-backup-${stamp}.ses.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage("Backup downloaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not export backup.");
    }
  });

  importTrigger.addEventListener("click", () => {
    importInput.click();
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      if (!window.SES?.expenseStore) return;
      if (!confirm("Reset all data? This cannot be undone.")) return;
      window.SES.expenseStore.reset();
      renderAll();
      setMessage("All data reset.");
    });
  }

  importInput.addEventListener("change", async () => {
    if (!window.SES?.expenseStore) return;

    const [file] = importInput.files ?? [];
    if (!file) return;

    try {
      const content = await file.text();
      const payload = JSON.parse(content);
      window.SES.expenseStore.importState(payload);
      renderAll();
      setMessage("Backup imported.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not import backup.");
    } finally {
      importInput.value = "";
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  renderAll();
  setupParticipantForm();
  setupExpenseForm();
  setupBackupControls();
  setupRowDeletionHandlers();
});

