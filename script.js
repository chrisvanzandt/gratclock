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
        <input type="number" data-row="${i}" data-col="1" min="0" step="0.01" />
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

  // Clear Total Paid when rows are regenerated
  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) totalEachSumField.value = "";
}

// Clear employee money fields (denoms + total each + sum)
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

// Update summary fields (Total Cash, Total Hours, Hourly Rate, Leftover message)
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
    hrStr = hourlyRate.toFixed(2); // exactly 2 decimals
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

// Main calculation function
function calculateTips() {
  const errorNote = document.getElementById("errorNote");
  const leftoverNote = document.getElementById("leftoverNote");
  if (errorNote) errorNote.textContent = "";
  if (leftoverNote) leftoverNote.textContent = "";

  const rows = document.querySelectorAll("#employeeTable tbody tr");

  // Clear any previous distribution results from employee table
  clearEmployeeMoney();

  const employees = [];
  let totalHours = 0;

  // 1. Read employee names and hours, track which row they belong to
  rows.forEach((row, rowIndex) => {
    const inputs = row.querySelectorAll("input");
    const nameInput = inputs[0];
    const hoursInput = inputs[1];

    const name = nameInput.value.trim();
    const hours = parseFloat(hoursInput.value);

    if (!name || isNaN(hours) || hours <= 0) {
      return; // Skip empty or invalid rows
    }

    employees.push({
      name,
      hours,
      rowIndex,
      target: 0,  // integer whole-dollar target
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

  // 2. Read bill quantities and compute total cash
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

  // 3. Compute hourly rate and integer-dollar targets for each employee (floor)
  const hourlyRate = totalCash / totalHours;

  employees.forEach((emp) => {
    const exact = hourlyRate * emp.hours;                  // float
    const intTarget = Math.floor(exact + 1e-6);            // whole dollars (down)
    emp.target = intTarget;
    emp.total = 0;
    emp.bills = { 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 };
  });

  // 4. Distribute bills from largest to smallest, without overpaying anyone
  const billTypes = Object.keys(denominations)
    .map(Number)
    .sort((a, b) => b - a); // [100, 50, 20, 10, 5, 2, 1]

  let assignedTotal = 0;

  for (let denom of billTypes) {
    let count = denominations[denom];
    if (count <= 0) continue;

    for (let i = 0; i < count; i++) {
      let bestIndex = -1;
      let bestNeed = 0;

      // Choose the employee who has the most remaining need and can take this bill
      for (let j = 0; j < employees.length; j++) {
        const emp = employees[j];
        const remaining = emp.target - emp.total;
        if (remaining >= denom && remaining > bestNeed + 1e-6) {
          bestNeed = remaining;
          bestIndex = j;
        }
      }

      if (bestIndex === -1) {
        // No one can take this bill without exceeding their target.
        // This bill stays unassigned and becomes part of leftover.
        continue;
      }

      const chosen = employees[bestIndex];
      chosen.bills[denom] += 1;
      chosen.total += denom;
      assignedTotal += denom;
    }
  }

  // 5. Compute leftover money (unassigned cash)
  const leftover = totalCash - assignedTotal;

  // If leftover is more than $4, we do NOT allow this distribution
  if (leftover > 4.0001) {
    if (errorNote) {
      errorNote.textContent =
        "The leftover amount is $" +
        leftover.toFixed(2) +
        ", which is more than $4.00.\n" +
        "Please break at least $" +
        leftover.toFixed(2) +
        " from larger bills into smaller denominations, update the bill quantities, and try again.";
    }
    clearEmployeeMoney();
    updateSummary(totalCash, totalHours, hourlyRate, 0);
    return;
  }

  // 6. Write results back into their rows
  const rowsArray = Array.from(rows);
  employees.forEach((emp) => {
    const row = rowsArray[emp.rowIndex];
    if (!row) return;
    const inputs = row.querySelectorAll("input");

    let col = 2; // where $100 starts
    for (let denom of billTypes) {
      const count = emp.bills[denom];
      inputs[col].value = count > 0 ? count : "";
      col++;
    }
    // Total Each (two decimals)
    inputs[col].value = emp.total.toFixed(2);
  });

  // 7. Compute Total Paid (sum of Total Each column)
  const totalPaid = employees.reduce((sum, emp) => sum + emp.total, 0);
  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) {
    totalEachSumField.value = totalPaid.toFixed(2);
  }

  // 8. Update totals, hourly rate, and leftover (flip-for-it) note (for leftover ≤ $4)
  updateSummary(totalCash, totalHours, hourlyRate, leftover);
}

// Arrow-key navigation like a spreadsheet (across employee table)
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
