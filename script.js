// =====================================================
// API BASE URL
// =====================================================
const API_URL = "https://personal-finance-tracker-o79e.onrender.com/api";


// =====================================================
// GET USER & TOKEN FROM LOCALSTORAGE
// =====================================================
const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

let transactions = [];

// =====================================================
// CATEGORY LIST (frontend reference)
// =====================================================
const categories = [
  { name: "Food", emoji: "🍔" },
  { name: "Transport", emoji: "🚗" },
  { name: "Entertainment", emoji: "🎬" },
  { name: "Shopping", emoji: "🛍️" },
  { name: "Bills", emoji: "💡" },
  { name: "Health", emoji: "💊" },
  { name: "Travel", emoji: "✈️" },
  { name: "Salary", emoji: "💰" },
  { name: "Other", emoji: "📦" }
];

// Populate category dropdown
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("categorySelect");
  if (select) {
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = JSON.stringify(cat);
      opt.textContent = `${cat.emoji} ${cat.name}`;
      select.appendChild(opt);
    });
  }

  // Fetch transactions on page load if user is logged in
  if (user && token) {
    fetchTransactions();
  }
});

// =====================================================
// FETCH TRANSACTIONS FROM MONGODB
// =====================================================
async function fetchTransactions() {
  if (!token) {
    console.warn("⚠️ No token found. User not logged in.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/transactions`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      transactions = data.transactions;
      updateBalance();
      updateTransactionTable();
      updateCharts();
    } else {
      console.error("❌ Failed to fetch transactions:", await response.text());
    }
  } catch (error) {
    console.error("❌ Network error fetching transactions:", error);
  }
}

// =====================================================
// ADD TRANSACTION (NOW WITH CATEGORY)
// =====================================================
async function addTransaction() {
  if (!token) {
    alert("⚠️ Please login to add transactions");
    return;
  }

  const description = document.getElementById("description").value.trim();
  const amount = parseFloat(document.getElementById("amount").value);
  const type = document.getElementById("type").value;
  const dateValue = document.getElementById("date").value;
  const category = JSON.parse(document.getElementById("categorySelect").value || '{"name":"Other","emoji":"📦"}');

  if (!description || isNaN(amount) || !dateValue) {
    alert("⚠️ Please fill all fields");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description,
        amount,
        type,
        date: dateValue,
        category
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      transactions.push(data.transaction);
      updateBalance();
      updateTransactionTable();
      updateCharts();

      // Clear form
      document.getElementById("description").value = "";
      document.getElementById("amount").value = "";
      document.getElementById("date").value = "";
      document.getElementById("categorySelect").value = "";

showToast("✅ Transaction added successfully!", "success");

    } else {
      const error = await response.json();
      alert(`❌ Error: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Network error adding transaction:", error);
    alert("❌ Failed to add transaction. Check your connection.");
  }
}

// =====================================================
// DELETE TRANSACTION (NOW DELETES FROM MONGODB)
// =====================================================
async function deleteTransaction(transactionId) {
  if (!token) {
    alert("⚠️ Please login to delete transactions");
    return;
  }

  if (!confirm("Are you sure you want to delete this transaction?")) return;

  try {
    const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      transactions = transactions.filter(t => t._id !== transactionId);
      updateBalance();
      updateTransactionTable();
      updateCharts();
      alert("✅ Transaction deleted successfully!");
    } else {
      const error = await response.json();
      alert(`❌ Error: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Network error deleting transaction:", error);
    alert("❌ Failed to delete transaction. Check your connection.");
  }
}

// =====================================================
// UPDATE BALANCE UI
// =====================================================
function updateBalance() {
  const balanceElement = document.getElementById("balance");
  if (!balanceElement) return;

  let balance = transactions.reduce(
    (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount), 0
  );

  const currency = document.getElementById("currency")?.value || "INR";
  balanceElement.textContent = formatCurrency(balance, currency);
  balanceElement.style.color = balance < 0 ? "red" : "#00ff8a";
}

// =====================================================
// UPDATE TRANSACTION TABLE (INCLUDES CATEGORY)
// =====================================================
function updateTransactionTable() {
  const table = document.getElementById("transaction-table");
  if (!table) return;

  while (table.rows.length > 1) table.deleteRow(1);

  transactions.forEach(t => {
    const row = table.insertRow();

    row.insertCell().textContent = formatDate(new Date(t.date));
    row.insertCell().textContent = t.description;
    row.insertCell().textContent = formatCurrency(
      t.amount,
      document.getElementById("currency")?.value || "INR"
    );
    row.insertCell().textContent = t.type;

    // 🆕 Category Column
    row.insertCell().textContent = `${t.category?.emoji || "📦"} ${t.category?.name || "Other"}`;

    const actionCell = row.insertCell();
    actionCell.innerHTML = `<button onclick="deleteTransaction('${t._id}')">Delete</button>`;
  });
}

// =====================================================
// FORMATTERS
// =====================================================
function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function formatCurrency(amount, code) {
  const symbol = { USD: "$", INR: "₹", EUR: "€" }[code] || "₹";
  return symbol + amount.toFixed(2);
}

// =====================================================
// CHARTS (UPDATED TO USE CATEGORY)
// =====================================================
let monthlyChart, categoryChart;

function updateCharts() {
  const monthlyCanvas = document.getElementById("monthlyChart");
  const categoryCanvas = document.getElementById("categoryChart");
  
  if (!monthlyCanvas || !categoryCanvas) return;

  const monthlyData = Array(12).fill(0);
  const categoryData = {};

  transactions.forEach(t => {
    const month = new Date(t.date).getMonth();
    monthlyData[month] += t.type === "income" ? t.amount : -t.amount;

    const catKey = `${t.category?.emoji || "📦"} ${t.category?.name || "Other"}`;
    categoryData[catKey] = (categoryData[catKey] || 0) + t.amount;
  });

  // MONTHLY BAR CHART
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(monthlyCanvas, {
    type: "bar",
    data: {
      labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      datasets: [{
        label: "Net Balance",
        data: monthlyData,
        backgroundColor: "#00ff8a"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });

  // CATEGORY PIE CHART
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(categoryCanvas, {
    type: "pie",
    data: {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData),
        backgroundColor: [
          "#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF",
          "#FF9F40","#C9CBCF","#00A36C","#FFD700"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });

  updateDashboardInsights();
}

// =====================================================
// INSIGHTS CARDS
// =====================================================
function updateDashboardInsights() {
  const totalTransEl = document.getElementById("totalTransactions");
  const highestCatEl = document.getElementById("highestCategory");
  const savingsEl = document.getElementById("savings");

  if (totalTransEl) {
    totalTransEl.textContent = `Total Transactions: ${transactions.length}`;
  }

  const expenses = transactions.filter(t => t.type === "expense");
  const highest = expenses.sort((a, b) => b.amount - a.amount)[0];

  if (highestCatEl) {
    highestCatEl.textContent = highest 
      ? `Highest Spend: ${highest.category?.emoji || "📦"} ${highest.category?.name || "Other"}`
      : "Highest Spend: -";
  }

  const income = transactions.filter(t => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);

  const expenseTotal = expenses.reduce((acc, t) => acc + t.amount, 0);
  
  if (savingsEl) {
    savingsEl.textContent = `Total Savings: ₹${(income - expenseTotal).toFixed(2)}`;
  }
}

// =====================================================
// SAVINGS GOAL BAR
// =====================================================
function setGoal() {
  const goalInput = document.getElementById("goalInput");
  const goalProgress = document.getElementById("goalProgress");
  const goalStatus = document.getElementById("goalStatus");

  const goal = parseFloat(goalInput.value);
  if (isNaN(goal) || goal <= 0) {
    alert("Please enter a valid goal amount");
    return;
  }

  const totalSavings = transactions.filter(t => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0)
      - transactions.filter(t => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);

  const percent = Math.min((totalSavings / goal) * 100, 100);
  goalProgress.style.width = `${percent}%`;
  goalStatus.textContent = percent >= 100 
    ? "🎉 Goal Achieved!" 
    : `Progress: ${percent.toFixed(1)}%`;
}

// =====================================================
// 📧 GENERATE & EMAIL MONTHLY REPORT
// =====================================================
// =====================================================
// EXPORT & EMAIL PDF REPORT
// =====================================================
async function handleDownload() {
  const { jsPDF } = window.jspdf;

  const userEmail = user?.email;
  if (!userEmail || !token) {
    return showToast("⚠️ Please login to send your report.", "error");
  }

  const dashboard = document.getElementById("dashboardAnalytics");
  if (!dashboard) {
    return showToast("⚠️ Dashboard data not found.", "error");
  }

  // Small delay to ensure charts are rendered
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    // 🖼️ Capture dashboard — lower scale for compression
    const canvas = await html2canvas(dashboard, { scale: 1.2, useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.75); // compressed

    // 📊 Collect summary data
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSavings = totalIncome - totalExpense;
    const month = new Date().toLocaleString("default", { month: "long", year: "numeric" });

    // 🧾 Create optimized PDF
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    // ===== COVER PAGE =====
    pdf.setFillColor(15, 0, 129);
    pdf.rect(0, 0, 210, 40, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("Finance Tracker Report", 20, 25);

    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.text(`User: ${user.name}`, 20, 60);
    pdf.text(`Email: ${userEmail}`, 20, 68);
    pdf.text(`Month: ${month}`, 20, 76);

    pdf.setFont("helvetica", "bold");
    pdf.text("Summary:", 20, 95);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Total Income: ₹${totalIncome.toFixed(2)}`, 20, 105);
    pdf.text(`Total Expenses: ₹${totalExpense.toFixed(2)}`, 20, 113);
    pdf.text(`Total Savings: ₹${totalSavings.toFixed(2)}`, 20, 121);

    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.text("Generated via Finance Tracker • www.financetracker.app", 20, 285);

    // ===== CHART PAGE =====
    pdf.addPage();
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "JPEG", 0, 0, width, height);

    // Convert to Base64 for email sending
    const pdfBase64 = pdf.output("datauristring").split(",")[1];

    // 🚀 Send report to backend
    const response = await fetch(`${API_URL}/send-report`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pdfData: pdfBase64 })
    });

    const data = await response.json();
    if (response.ok) {
      showToast(`✅ Report sent successfully to ${userEmail}`, "success");
    } else {
      showToast(`❌ Failed: ${data.message}`, "error");
    }
  } catch (error) {
    console.error("❌ Error exporting PDF:", error);
    showToast("❌ Something went wrong while exporting report.", "error");
  }
}

function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `show ${type === "error" ? "error" : ""}`;

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 3000);
}


// Savings goal interactivity — persists in localStorage and animates progress
(function () {
  const goalInput = document.getElementById("goalInput");
  const setBtn = document.getElementById("setGoalBtn");
  const resetBtn = document.getElementById("resetGoalBtn");
  const progressBar = document.getElementById("goalProgressBar");
  const progressWrap = document.getElementById("goalProgressWrap");
  const goalAmountDisplay = document.getElementById("goalAmountDisplay");
  const currentSavingsEl = document.getElementById("currentSavings");
  const goalStatus = document.getElementById("goalStatus");

  const STORAGE_KEY = `savings_goal_${user?.email || "guest"}`;

  // Compute current savings from transactions (use global transactions array)
  function computeCurrentSavings() {
    const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return Math.max(0, income - expense);
  }

  function loadGoal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return parseFloat(raw);
    } catch (e) { return null; }
  }

  function saveGoal(val) {
    localStorage.setItem(STORAGE_KEY, String(val));
  }

  function renderGoalUI(goalVal) {
    const currentSavings = computeCurrentSavings();
    currentSavingsEl.textContent = `₹${currentSavings.toFixed(2)}`;
    if (!goalVal || goalVal <= 0) {
      goalAmountDisplay.textContent = "—";
      progressBar.style.width = "0%";
      progressWrap.setAttribute("aria-valuenow", 0);
      goalStatus.textContent = "No goal set";
      return;
    }

    goalAmountDisplay.textContent = `₹${Number(goalVal).toFixed(2)}`;
    const percent = Math.min(100, (currentSavings / goalVal) * 100);
    const pct = isFinite(percent) ? percent : 0;
    // animate
    requestAnimationFrame(() => {
      progressBar.style.width = `${pct}%`;
      progressWrap.setAttribute("aria-valuenow", Math.round(pct));
    });

    if (pct >= 100) {
      goalStatus.textContent = "🎉 Goal Achieved! Great job.";
    } else {
      goalStatus.textContent = `Progress: ${pct.toFixed(1)}%`;
    }
  }

  // initial render
  const currentGoal = loadGoal();
  renderGoalUI(currentGoal);

  // update when transactions change (if you update transactions programmatically)
  // call this function when transactions array changes:
  window.updateSavingsGoalUI = () => renderGoalUI(loadGoal());

  setBtn?.addEventListener("click", () => {
    const v = parseFloat(goalInput.value);
    if (isNaN(v) || v <= 0) {
      showToast("Enter a valid goal amount", "error");
      return;
    }
    saveGoal(v);
    renderGoalUI(v);
    showToast("Savings goal set", "success");
    goalInput.value = "";
  });

  resetBtn?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    renderGoalUI(null);
    showToast("Savings goal reset", "success");
  });

  // also when page loads, update with real-time transactions if already present
  document.addEventListener("DOMContentLoaded", () => renderGoalUI(loadGoal()));
})();

// =====================================================
// SOCIAL SHARE FUNCTIONS
// =====================================================
function sendEmailInvite() {
  const email = document.getElementById("invite-email")?.value;
  if (email) {
    window.location.href = `mailto:${email}?subject=Join Finance Tracker&body=Check out this amazing finance tracker!`;
  }
}

function shareOnLinkedIn() {
  window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(window.location.href));
}

function shareOnTwitter() {
  window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=Check out Finance Tracker!');
}

