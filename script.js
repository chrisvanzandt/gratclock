const EMP_STORAGE_KEY = "gratclockEmployees_disperse";
const EMP_COUNT_KEY = "gratclockTotalEmployees_disperse";

function saveEmployees() {
  const rows = document.querySelectorAll("#employeeTable tbody tr");
  const employees = [];
  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length < 2) return;
    const name = inputs[0].value.trim();
    const hours = inputs[1].value;
    if (name || hours) employees.push({ name, hours });
  });

  const countValue = document.getElementById("totalEmployees")?.value || "";

  try {
    localStorage.setItem(EMP_STORAGE_KEY, JSON.stringify(employees));
    localStorage.setItem(EMP_COUNT_KEY, countValue);
  } catch {}
}

function loadEmployees() {
  try {
    const saved = JSON.parse(localStorage.getItem(EMP_STORAGE_KEY) || "[]");
    const savedCount = parseInt(localStorage.getItem(EMP_COUNT_KEY) || "0", 10);

    const count = savedCount > 0 ? savedCount : saved.length;
    if (!count) return;

    document.getElementById("totalEmployees").value = count;
    generateRows();

    const rows = document.querySelectorAll("#employeeTable tbody tr");
    saved.forEach((emp, i) => {
      if (!rows[i]) return;
      const inputs = rows[i].querySelectorAll("input");
      inputs[0].value = emp.name || "";
      inputs[1].value = emp.hours || "";
    });
  } catch {}
}

function generateRows() {
  const tbody = document.querySelector("#employeeTable tbody");
  tbody.innerHTML = "";

  const count = parseInt(document.getElementById("totalEmployees").value, 10);
  if (!count || count < 1) {
    alert("Please enter a valid number of employees (at least 1).");
    return;
  }

  for (let i = 0; i < count; i++) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="name-col"><input type="text" data-row="${i}" data-col="0" /></td>
      <td class="narrow-col"><input type="number" min="0" step="0.25" data-row="${i}" data-col="1" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="2" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="3" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="4" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="5" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="6" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="7" /></td>
      <td class="narrow-col"><input type="number" disabled data-row="${i}" data-col="8" /></td>
      <td class="total-each-col"><input type="number" disabled data-row="${i}" data-col="9" /></td>
    `;
    tbody.appendChild(row);
  }

  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) totalEachSumField.value = "";
}

function clearEmployeeMoney() {
  const rows = document.querySelectorAll("#employeeTable tbody tr");
  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    for (let i = 2; i < inputs.length; i++) inputs[i].value = "";
  });
  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) totalEachSumField.value = "";
}

function updateSummary(totalCash, totalHours, hourlyRate, leftover) {
  const totalCashField = document.getElementById("totalCash");
  const totalHoursField = document.getElementById("totalHours");
  const hourlyRateField = document.getElementById("hourlyRate");
  const leftoverNote = document.getElementById("leftoverNote");

  totalCashField.value = typeof totalCash === "number" ? totalCash : "";
  totalHoursField.value = typeof totalHours === "number" ? totalHours : "";
  hourlyRateField.value = (typeof hourlyRate === "number" && totalHours > 0) ? hourlyRate.toFixed(2) : "";

  if (!leftoverNote) return;

  if (typeof leftover === "number" && leftover > 0.009) {
    // This note is only for “Flip for it!” cases
    leftoverNote.textContent =
      "Leftover: $" +
      leftover.toFixed(2) +
      " cannot be evenly distributed using whole bills (no coins). Flip for it!";
  } else {
    leftoverNote.textContent = "";
  }
}

function calculateDisperse() {
  const errorNote = document.getElementById("errorNote");
  const leftoverNote = document.getElementById("leftoverNote");
  if (errorNote) errorNote.textContent = "";
  if (leftoverNote) leftoverNote.textContent = "";

  const rows = document.querySelectorAll("#employeeTable tbody tr");
  clearEmployeeMoney();

  const employees = [];
  let totalHours = 0;

  rows.forEach((row, rowIndex) => {
    const inputs = row.querySelectorAll("input");
    const name = inputs[0].value.trim();
    const hours = parseFloat(inputs[1].value);

    if (!name || isNaN(hours) || hours <= 0) return;

    employees.push({
      rowIndex,
      hours,
      target: 0,
      bills: { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
      total: 0
    });

    totalHours += hours;
  });

  if (employees.length === 0) {
    if (errorNote) errorNote.textContent = "Please enter at least one employee with a name and hours.";
    updateSummary(undefined, undefined, undefined, 0);
    return;
  }
  if (totalHours <= 0) {
    if (errorNote) errorNote.textContent = "Total hours must be greater than zero.";
    updateSummary(undefined, undefined, undefined, 0);
    return;
  }

  const denominations = {
    100: parseInt(document.getElementById("bill100").value, 10) || 0,
    50:  parseInt(document.getElementById("bill50").value, 10) || 0,
    20:  parseInt(document.getElementById("bill20").value, 10) || 0,
    10:  parseInt(document.getElementById("bill10").value, 10) || 0,
    5:   parseInt(document.getElementById("bill5").value, 10) || 0,
    2:   parseInt(document.getElementById("bill2").value, 10) || 0,
    1:   parseInt(document.getElementById("bill1").value, 10) || 0
  };

  const totalCash = Object.entries(denominations).reduce(
    (sum, [bill, qty]) => sum + parseInt(bill, 10) * qty,
    0
  );

  if (totalCash <= 0) {
    if (errorNote) errorNote.textContent = "Please enter at least one bill in the denominations.";
    updateSummary(undefined, undefined, undefined, 0);
    return;
  }

  const hourlyRate = totalCash / totalHours;

  // Whole-dollar targets (floor)
  employees.forEach((emp) => {
    const exact = hourlyRate * emp.hours;
    emp.target = Math.floor(exact + 1e-6);
    emp.total = 0;
    emp.bills = { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 };
  });

  const billTypes = Object.keys(denominations).map(Number).sort((a, b) => b - a);

  let assignedTotal = 0;

  // Greedy assign
  for (const denom of billTypes) {
    const count = denominations[denom];
    if (count <= 0) continue;

    for (let i = 0; i < count; i++) {
      let bestIndex = -1;
      let bestNeed = 0;

      for (let j = 0; j < employees.length; j++) {
        const emp = employees[j];
        const remaining = emp.target - emp.total;
        if (remaining >= denom && remaining > bestNeed + 1e-6) {
          bestNeed = remaining;
          bestIndex = j;
        }
      }

      if (bestIndex === -1) continue;

      employees[bestIndex].bills[denom] += 1;
      employees[bestIndex].total += denom;
      assignedTotal += denom;
    }
  }

  const leftover = totalCash - assignedTotal;

  // ✅ Improved exception logic:
  // If leftover <= 4 OR leftover < number of employees → "Flip for it"
  // Else → break a bill
  const n = employees.length;

  const flipAllowed = (leftover > 0.009 && (leftover <= 4.0001 || leftover < n));
  const mustBreak = leftover > 4.0001 && leftover >= n;

  if (mustBreak) {
    if (errorNote) {
      errorNote.textContent =
        "The leftover amount is $" +
        leftover.toFixed(2) +
        ". Please break at least $" +
        leftover.toFixed(2) +
        " from larger bills into smaller denominations, update the bill quantities, and try again.";
    }
    clearEmployeeMoney();
    updateSummary(totalCash, totalHours, hourlyRate, 0);
    return;
  }

  const rowsArray = Array.from(rows);

  employees.forEach((emp) => {
    const row = rowsArray[emp.rowIndex];
    if (!row) return;

    const inputs = row.querySelectorAll("input");
    let col = 2;

    for (const denom of billTypes) {
      const c = emp.bills[denom];
      inputs[col].value = c > 0 ? c : "";
      col++;
    }
    inputs[col].value = emp.total.toFixed(2);
  });

  const totalPaid = employees.reduce((sum, e) => sum + e.total, 0);
  document.getElementById("totalEachSum").value = totalPaid.toFixed(2);

  // Save “phone app” style
  saveEmployees();

  // Show leftover note only when flipAllowed
  updateSummary(totalCash, totalHours, hourlyRate, flipAllowed ? leftover : 0);
}

// Arrow-key navigation
document.getElementById("employeeTable").addEventListener("keydown", (e) => {
  const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
  if (!keys.includes(e.key)) return;

  const t = e.target;
  if (!t.dataset.row || !t.dataset.col) return;

  const r = parseInt(t.dataset.row, 10);
  const c = parseInt(t.dataset.col, 10);

  let nr = r, nc = c;
  if (e.key === "ArrowUp") nr--;
  if (e.key === "ArrowDown") nr++;
  if (e.key === "ArrowLeft") nc--;
  if (e.key === "ArrowRight") nc++;

  const next = document.querySelector(`input[data-row="${nr}"][data-col="${nc}"]`);
  if (next) {
    next.focus();
    e.preventDefault();
  }
});

document.addEventListener("DOMContentLoaded", loadEmployees);
