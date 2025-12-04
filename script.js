// Keys for localStorage
const EMP_STORAGE_KEY = "gratclockEmployees";
const EMP_COUNT_KEY = "gratclockTotalEmployees";

function saveEmployeesToStorage() {
  const rows = document.querySelectorAll("#employeeTable tbody tr");
  const employees = [];

  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length < 2) return;
    const name = inputs[0].value.trim();
    const hours = inputs[1].value;
    if (name || hours) {
      employees.push({ name, hours });
    }
  });

  const totalEmployeesInput = document.getElementById("totalEmployees");
  const countValue = totalEmployeesInput ? totalEmployeesInput.value : "";

  try {
    localStorage.setItem(EMP_STORAGE_KEY, JSON.stringify(employees));
    localStorage.setItem(EMP_COUNT_KEY, countValue || "");
  } catch (e) {
    console.warn("Could not save employees to storage:", e);
  }
}

function loadEmployeesFromStorage() {
  let savedEmployees = [];
  let savedCount = 0;

  try {
    const savedJson = localStorage.getItem(EMP_STORAGE_KEY);
    const savedCountStr = localStorage.getItem(EMP_COUNT_KEY);

    if (savedJson) {
      savedEmployees = JSON.parse(savedJson);
    }
    if (savedCountStr) {
      savedCount = parseInt(savedCountStr, 10) || 0;
    } else if (savedEmployees.length > 0) {
      savedCount = savedEmployees.length;
    }
  } catch (e) {
    console.warn("Could not load employees from storage:", e);
    return;
  }

  if (!savedEmployees.length || savedCount <= 0) return;

  const totalEmployeesInput = document.getElementById("totalEmployees");
  if (totalEmployeesInput) {
    totalEmployeesInput.value = savedCount;
  }

  // Generate rows based on saved count
  generateRows();

  const rows = document.querySelectorAll("#employeeTable tbody tr");
  savedEmployees.forEach((emp, index) => {
    if (!rows[index]) return;
    const inputs = rows[index].querySelectorAll("input");
    if (inputs.length < 2) return;
    inputs[0].value = emp.name || "";
    inputs[1].value = emp.hours || "";
  });
}

// Create employee rows based on "Total Employees"
function generateRows() {
  const tbody = document.querySelector("#employeeTable tbody");
  tbody.innerHTML = ""; // Clear existing rows
  const count = parseInt(document.getElementById("totalEmployees").value);

  if (!count || count < 1) {
    alert("Please enter a valid number of employees (at least 1).");
    return;
  }

  for (let i = 0; i < count; i++) {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="name-col">
        <input type="text" data-row="${i}" data-col="0" />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="1" min="0" step="0.25" />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="2" disabled />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="3" disabled />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="4" disabled />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="5" disabled />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="6" disabled />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="7" disabled />
      </td>
      <td class="narrow-col">
        <input type="number" data-row="${i}" data-col="8" disabled />
      </td>
      <td class="total-each-col">
        <input type="number" data-row="${i}" data-col="9" disabled />
      </td>
    `;
    tbody.appendChild(row);
  }

  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) totalEachSumField.value = "";
}

// Clear employee money fields
function clearEmployeeMoney() {
  const rows = document.querySelectorAll("#employeeTable tbody tr");
  rows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    for (let i = 2; i < inputs.length; i++) {
      inputs[i].value = "";
    }
  });
  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) totalEachSumField.value = "";
}

// Update summary (totals + hourly rate + leftover message)
function updateSummary(totalCash, totalHours, hourlyRate, leftover) {
  const totalCashField = document.getElementById("totalCash");
  const totalHoursField = document.getElementById("totalHours");
  const hourlyRateField = document.getElementById("hourlyRate");
  const leftoverNote = document.getElementById("leftoverNote");

  if (typeof totalCash === "number" && !isNaN(totalCash)) {
    totalCashField.value = totalCash;
  } else {
    totalCashField.value = "";
  }

  if (typeof totalHours === "number" && !isNaN(totalHours)) {
    totalHoursField.value = totalHours;
  } else {
    totalHoursField.value = "";
  }

  let hrStr = "";
  if (typeof hourlyRate === "number" && !isNaN(hourlyRate) && totalHours > 0) {
    hrStr = hourlyRate.toFixed(2);
  }
  hourlyRateField.value = hrStr;

  if (leftoverNote) {
    if (typeof leftover === "number" && leftover > 0.009 && leftover <= 4.0001) {
      leftoverNote.textContent =
        "Leftover: $" +
        leftover.toFixed(2) +
        " cannot be evenly distributed using whole bills (no coins). Flip for it!";
    } else {
      leftoverNote.textContent = "";
    }
  }
}

// Main calculation
function calculateTips() {
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
    const nameInput = inputs[0];
    const hoursInput = inputs[1];

    const name = nameInput.value.trim();
    const hours = parseFloat(hoursInput.value);

    if (!name || isNaN(hours) || hours <= 0) {
      return;
    }

    employees.push({
      name,
      hours,
      rowIndex,
      target: 0,
      bills: { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
      total: 0
    });

    totalHours += hours;
  });

  if (employees.length === 0) {
    if (errorNote) {
      errorNote.textContent = "Please enter at least one employee with a name and hours.";
    }
    updateSummary(undefined, undefined, undefined, undefined);
    return;
  }

  if (totalHours <= 0) {
    if (errorNote) {
      errorNote.textContent = "Total hours must be greater than zero.";
    }
    updateSummary(undefined, undefined, undefined, undefined);
    return;
  }

  const denominations = {
    100: parseInt(document.getElementById("bill100").value) || 0,
    50: parseInt(document.getElementById("bill50").value) || 0,
    20: parseInt(document.getElementById("bill20").value) || 0,
    10: parseInt(document.getElementById("bill10").value) || 0,
    5: parseInt(document.getElementById("bill5").value) || 0,
    2: parseInt(document.getElementById("bill2").value) || 0,
    1: parseInt(document.getElementById("bill1").value) || 0,
  };

  const totalCash = Object.entries(denominations).reduce(
    (sum, [bill, qty]) => sum + parseInt(bill) * qty,
    0
  );

  if (totalCash <= 0) {
    if (errorNote) {
      errorNote.textContent = "Please enter at least one bill in the denominations.";
    }
    updateSummary(undefined, undefined, undefined, undefined);
    return;
  }

  const hourlyRate = totalCash / totalHours;

  employees.forEach((emp) => {
    const exact = hourlyRate * emp.hours;
    const intTarget = Math.floor(exact + 1e-6);
    emp.target = intTarget;
    emp.total = 0;
    emp.bills = { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 };
  });

  const billTypes = Object.keys(denominations)
    .map(Number)
    .sort((a, b) => b - a);

  let assignedTotal = 0;

  for (let denom of billTypes) {
    let count = denominations[denom];
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

      if (bestIndex === -1) {
        continue;
      }

      const chosen = employees[bestIndex];
      chosen.bills[denom] += 1;
      chosen.total += denom;
      assignedTotal += denom;
    }
  }

  const leftover = totalCash - assignedTotal;

  if (leftover > 4.0001) {
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
    for (let denom of billTypes) {
      const count = emp.bills[denom];
      inputs[col].value = count > 0 ? count : "";
      col++;
    }
    inputs[col].value = emp.total.toFixed(2);
  });

  const totalPaid = employees.reduce((sum, emp) => sum + emp.total, 0);
  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) {
    totalEachSumField.value = totalPaid.toFixed(2);
  }

  // Save employee names + hours so they persist on this device
  saveEmployeesToStorage();

  updateSummary(totalCash, totalHours, hourlyRate, leftover);
}

// Arrow-key navigation
document
  .getElementById("employeeTable")
  .addEventListener("keydown", function (e) {
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!keys.includes(e.key)) return;

    const target = e.target;
    if (!target.dataset.row || !target.dataset.col) return;

    const row = parseInt(target.dataset.row);
    const col = parseInt(target.dataset.col);
    if (isNaN(row) || isNaN(col)) return;

    let newRow = row;
    let newCol = col;

    if (e.key === "ArrowUp") newRow = row - 1;
    if (e.key === "ArrowDown") newRow = row + 1;
    if (e.key === "ArrowLeft") newCol = col - 1;
    if (e.key === "ArrowRight") newCol = col + 1;

    const selector =
      'input[data-row="' + newRow + '"][data-col="' + newCol + '"]';
    const next = document.querySelector(selector);
    if (next) {
      next.focus();
      e.preventDefault();
    }
  });

// Load saved employees on page load
document.addEventListener("DOMContentLoaded", () => {
  loadEmployeesFromStorage();
});
