const EMP_STORAGE_KEY = "gratclockEmployees_divide";
const EMP_COUNT_KEY = "gratclockTotalEmployees_divide";

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
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="name-col">
        <input type="text" data-row="${i}" data-col="0" />
      </td>
      <td class="narrow-col">
        <input type="number" min="0" step="0.25" data-row="${i}" data-col="1" />
      </td>
      <td class="total-each-col">
        <input type="number" disabled data-row="${i}" data-col="2" />
      </td>
    `;
    tbody.appendChild(tr);
  }

  const totalEachSumField = document.getElementById("totalEachSum");
  if (totalEachSumField) totalEachSumField.value = "";
}

function clearTotals() {
  document.getElementById("totalHours").value = "";
  document.getElementById("hourlyRate").value = "";
  document.getElementById("totalEachSum").value = "";
  document.getElementById("errorNote").textContent = "";
  document.querySelectorAll("#employeeTable tbody tr").forEach((row) => {
    const inputs = row.querySelectorAll("input");
    if (inputs[2]) inputs[2].value = "";
  });
}

function calculateDivide() {
  clearTotals();

  const errorNote = document.getElementById("errorNote");
  const totalTips = parseFloat(document.getElementById("totalTips").value);

  if (isNaN(totalTips) || totalTips <= 0) {
    errorNote.textContent = "Please enter a valid Total Tips amount.";
    return;
  }

  const rows = document.querySelectorAll("#employeeTable tbody tr");
  const employees = [];
  let totalHours = 0;

  rows.forEach((row, rowIndex) => {
    const inputs = row.querySelectorAll("input");
    const name = (inputs[0].value || "").trim();
    const hours = parseFloat(inputs[1].value);

    if (!name || isNaN(hours) || hours <= 0) return;

    employees.push({ rowIndex, hours });
    totalHours += hours;
  });

  if (employees.length === 0) {
    errorNote.textContent = "Please enter at least one employee with a name and hours.";
    return;
  }
  if (totalHours <= 0) {
    errorNote.textContent = "Total hours must be greater than zero.";
    return;
  }

  const hourlyRate = totalTips / totalHours;

  document.getElementById("totalHours").value = totalHours.toFixed(2);
  document.getElementById("hourlyRate").value = hourlyRate.toFixed(2);

  let totalPaid = 0;
  const rowsArray = Array.from(rows);

  // Divide tips (to cents)
  employees.forEach((emp) => {
    const exact = hourlyRate * emp.hours;
    const amount = Math.round(exact * 100) / 100;
    totalPaid += amount;

    const row = rowsArray[emp.rowIndex];
    const inputs = row.querySelectorAll("input");
    inputs[2].value = amount.toFixed(2);
  });

  document.getElementById("totalEachSum").value = totalPaid.toFixed(2);

  // Save names/hours for “phone app” feel
  saveEmployees();
}

// Arrow-key navigation (Name/Hours only)
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
