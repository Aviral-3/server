// ============================================================
// MediKL — Professional CMR Platform
// ============================================================

const AREAS = [
  { id: 1, name: "Bandra West Block", emoji: "🏙️", doctorCount: 12, code: "BW-01" },
  { id: 2, name: "Andheri East Block", emoji: "🌆", doctorCount: 9, code: "AE-02" },
  { id: 3, name: "Dadar Central Block", emoji: "🏘️", doctorCount: 15, code: "DC-03" },
  { id: 4, name: "Kurla Gateway Block", emoji: "🌃", doctorCount: 7, code: "KG-04" },
  { id: 5, name: "Borivali North Block", emoji: "🌳", doctorCount: 11, code: "BN-05" },
  { id: 6, name: "Mulund East Block", emoji: "🏗️", doctorCount: 8, code: "ME-06" },
];

const DOCTORS = {
  1: [
    { id: 101, name: "Dr. Ramesh Gupta", spec: "Cardiologist", clinic: "HeartCare Clinic", initials: "RG", color: "#4f8ef7" },
    { id: 102, name: "Dr. Priya Sharma", spec: "Dermatologist", clinic: "Skin Wellness Center", initials: "PS", color: "#ec4899" },
    { id: 103, name: "Dr. Anil Mehta", spec: "General Physician", clinic: "Mehta Medical", initials: "AM", color: "#22c55e" },
  ],
  2: [
    { id: 201, name: "Dr. Vikram Patil", spec: "Orthopedic Surgeon", clinic: "BoneHealth Clinic", initials: "VP", color: "#7c5ef7" },
    { id: 202, name: "Dr. Meena Rao", spec: "Pediatrician", clinic: "SunShine Children Clinic", initials: "MR", color: "#14b8a6" },
  ],
  // ... (Other doctors omitted for brevity in POC, can be added back if needed)
};

const PRODUCTS = [
  { id: 1, name: "Cardiomax 5mg Block", category: "Cardiac", unit: "Strip of 10", price: 120, icon: "❤️" },
  { id: 2, name: "DermoClear Block", category: "Dermatology", unit: "30g Tube", price: 250, icon: "🧴" },
  { id: 3, name: "OmniVit Block", category: "Vitamins", unit: "Box of 30", price: 180, icon: "💊" },
  { id: 4, name: "GlucoShield Block", category: "Anti-diabetic", unit: "Strip of 15", price: 95, icon: "💉" },
  { id: 5, name: "PediCold Block", category: "Pediatric", unit: "100ml Bottle", price: 65, icon: "🍼" },
  { id: 6, name: "BoneCalc Block", category: "Calcium", unit: "Box of 60", price: 320, icon: "🦴" },
];

let state = {
  currentArea: null,
  currentDoctor: null,
  selectedProducts: new Set(),
  quantities: {},
  orderHistory: [],
  currentStep: 1,
  screenHistory: [],
};

// ============================================================
// Core Functions
// ============================================================

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show";
  setTimeout(() => t.className = "toast", 3000);
}

function showScreen(id) {
  document.querySelectorAll(".inner-screen").forEach(s => s.classList.remove("active"));
  const screen = document.getElementById("screen-" + id);
  if (screen) {
    screen.classList.add("active");
    screen.classList.add("animate-fade");
  }
}

function navTo(tab) {
  state.screenHistory = [];
  if (tab === "dashboard") {
    initDashboard();
  } else if (tab === "reports") {
    showReports();
  }
}

function pushScreen(screen) {
  const currentScreen = document.querySelector(".inner-screen.active");
  state.screenHistory.push(currentScreen ? currentScreen.id.replace("screen-", "") : "dashboard");
  showScreen(screen);
}

function goBack() {
  if (state.screenHistory.length > 0) {
    const prev = state.screenHistory.pop();
    showScreen(prev);
  }
}

// ============================================================
// Authentication
// ============================================================

function doLogin() {
  const btn = document.getElementById("login-btn");
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<div class="radar-circle" style="width:20px;height:20px;position:relative;margin:0 auto;border-width:2px;"></div>';
  btn.disabled = true;

  setTimeout(() => {
    document.getElementById("screen-login").style.display = "none";
    document.getElementById("app-shell").classList.remove("hidden");
    initDashboard();
    showToast("Access Granted. Welcome, Rahul Kapoor.");
  }, 1500);
}

function doLogout() {
  location.reload(); // Simple reload for POC to reset state
}

// ============================================================
// Dashboard & Areas
// ============================================================

function initDashboard() {
  const grid = document.getElementById("area-grid");
  grid.innerHTML = AREAS.map((a, i) => `
    <div class="area-block animate-fade" style="animation-delay: ${0.1 + (i * 0.05)}s" onclick="openArea(${a.id})">
      <div class="area-icon-container">${a.emoji}</div>
      <div class="area-details">
        <h4>${a.name}</h4>
        <p>${a.doctorCount} Professional Targets • ${a.code}</p>
      </div>
      <div class="area-arrow">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  `).join("");
  showScreen("dashboard");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("nav-home").classList.add("active");
}

function openArea(areaId) {
  state.currentArea = areaId;
  const area = AREAS.find(a => a.id === areaId);
  const doctors = DOCTORS[areaId] || [];
  
  document.getElementById("area-name-title").textContent = area.name;
  renderDoctors(doctors);
  pushScreen("doctors");
}

function renderDoctors(doctors) {
  const list = document.getElementById("doctor-list");
  if (doctors.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">No doctors available in this block.</p>';
    return;
  }
  list.innerHTML = doctors.map((d, i) => `
    <div class="doctor-block animate-slide" style="animation-delay: ${i * 0.1}s" onclick="selectDoctor(${d.id})">
      <div class="doctor-avatar-circle" style="background: ${d.color}">${d.initials}</div>
      <div class="doctor-info-text">
        <h4>${d.name}</h4>
        <p class="doctor-specialty">${d.spec}</p>
        <p>${d.clinic}</p>
      </div>
      <div class="area-arrow">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  `).join("");
}

function filterDoctors() {
  const q = document.getElementById("doctor-search").value.toLowerCase();
  const docs = DOCTORS[state.currentArea] || [];
  const filtered = docs.filter(d => 
    d.name.toLowerCase().includes(q) || 
    d.spec.toLowerCase().includes(q) || 
    d.clinic.toLowerCase().includes(q)
  );
  renderDoctors(filtered);
}

// ============================================================
// Order Flow
// ============================================================

function startNewOrder() {
  if (!state.currentArea) {
    navTo("dashboard");
    showToast("Please select a regional block first.");
    return;
  }
  pushScreen("doctors");
}

function selectDoctor(docId) {
  const doc = DOCTORS[state.currentArea].find(d => d.id === docId);
  state.currentDoctor = doc;
  state.selectedProducts = new Set();
  state.quantities = {};
  
  document.getElementById("sd-avatar").textContent = doc.initials;
  document.getElementById("sd-avatar").style.background = `linear-gradient(135deg, ${doc.color}, #000)`;
  document.getElementById("sd-name").textContent = doc.name;
  document.getElementById("sd-spec").textContent = doc.spec;
  document.getElementById("sd-clinic").textContent = doc.clinic;
  
  resetOrderFlow();
  pushScreen("order");
  simulateLocation();
}

function resetOrderFlow() {
  state.currentStep = 1;
  updateStepUI(1);
  const radar = document.getElementById("loc-radar");
  radar.classList.remove("verified");
  document.getElementById("loc-title").textContent = "Verifying Position";
  document.getElementById("loc-sub").textContent = "Locking GPS coordinates...";
  document.getElementById("step1-next-btn").disabled = true;
  document.getElementById("step2-next-btn").disabled = true;
}

function simulateLocation() {
  setTimeout(() => {
    const radar = document.getElementById("loc-radar");
    radar.classList.add("verified");
    document.getElementById("loc-title").textContent = "Position Secured";
    document.getElementById("loc-sub").textContent = "Within 42m of Target Clinic";
    document.getElementById("step1-next-btn").disabled = false;
    showToast("📍 Location Verified. Protocol active.");
  }, 2000);
}

function updateStepUI(step) {
  document.querySelectorAll(".order-step").forEach(s => s.classList.remove("active"));
  document.getElementById(`order-step-${step}`).classList.add("active");
  
  const titles = ["Step 1: Protocol", "Step 2: Medicine Blocks", "Step 3: Configurations"];
  document.getElementById("order-step-title").textContent = titles[step - 1];
  
  // Fill progress bars
  for (let i = 1; i <= 3; i++) {
    const fill = document.getElementById(`fill-${i}`);
    if (i < step) fill.style.width = "100%";
    else if (i === step) fill.style.width = "50%"; // Half way for current
    else fill.style.width = "0%";
  }
}

function goToStep(step) {
  state.currentStep = step;
  updateStepUI(step);
  
  if (step === 2) renderProducts();
  if (step === 3) renderQtyBlocks();
}

// ============================================================
// Product & Qty Blocks
// ============================================================

function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = PRODUCTS.map(p => `
    <div class="medicine-block ${state.selectedProducts.has(p.id) ? 'selected' : ''}" onclick="toggleProduct(${p.id})">
      <div class="medicine-icon">${p.icon}</div>
      <div class="medicine-details">
        <h5>${p.name}</h5>
        <p>${p.category} • ${p.unit}</p>
      </div>
      <div class="medicine-price">₹${p.price}</div>
    </div>
  `).join("");
}

function toggleProduct(pid) {
  if (state.selectedProducts.has(pid)) {
    state.selectedProducts.delete(pid);
    delete state.quantities[pid];
  } else {
    state.selectedProducts.add(pid);
    state.quantities[pid] = 1;
  }
  renderProducts();
  document.getElementById("step2-next-btn").disabled = state.selectedProducts.size === 0;
}

function renderQtyBlocks() {
  const list = document.getElementById("qty-list");
  const selected = PRODUCTS.filter(p => state.selectedProducts.has(p.id));
  
  list.innerHTML = selected.map(p => `
    <div class="qty-block animate-slide">
      <div style="display:flex; align-items:center; gap:12px;">
        <div class="medicine-icon" style="width:36px; height:36px; font-size:16px;">${p.icon}</div>
        <div>
          <h5 style="font-size:13px;">${p.name}</h5>
          <p style="font-size:11px; color:var(--text-muted);">₹${p.price} / unit</p>
        </div>
      </div>
      <div class="qty-stepper">
        <button class="qty-btn" onclick="changeQty(${p.id}, -1)">−</button>
        <div class="qty-val" id="qty-val-${p.id}">${state.quantities[p.id]}</div>
        <button class="qty-btn" onclick="changeQty(${p.id}, 1)">+</button>
      </div>
    </div>
  `).join("");
  updateTotal();
}

function changeQty(pid, delta) {
  state.quantities[pid] = Math.max(1, (state.quantities[pid] || 1) + delta);
  document.getElementById(`qty-val-${pid}`).textContent = state.quantities[pid];
  updateTotal();
}

function updateTotal() {
  let total = 0;
  state.selectedProducts.forEach(pid => {
    const p = PRODUCTS.find(prod => prod.id === pid);
    total += p.price * state.quantities[pid];
  });
  document.getElementById("order-total").textContent = `₹${total.toFixed(2)}`;
}

// ============================================================
// Submission & Reports
// ============================================================

function submitOrder() {
  const orderId = "ORD-" + Math.floor(Math.random() * 90000 + 10000);
  document.getElementById("success-order-id").textContent = "#" + orderId;
  
  // Record in history
  state.orderHistory.unshift({
    id: orderId,
    doctor: state.currentDoctor.name,
    amount: document.getElementById("order-total").textContent,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: "Secured"
  });
  
  showScreen("success");
}

function goToDashboard() {
  navTo("dashboard");
}

function showReports() {
  const list = document.getElementById("report-list");
  if (state.orderHistory.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">No transaction logs found.</p>';
  } else {
    list.innerHTML = state.orderHistory.map(o => `
      <div class="stat-block animate-fade">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <h4 style="font-size:15px; font-weight:700;">${o.doctor}</h4>
            <p style="font-size:11px; color:var(--text-muted);">${o.time} • ${o.id}</p>
          </div>
          <span class="badge-premium">${o.status}</span>
        </div>
        <div style="font-size:18px; font-weight:800; color:var(--accent-primary);">${o.amount}</div>
      </div>
    `).join("");
  }
  showScreen("reports");
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("nav-reports").classList.add("active");
}

// ============================================================
// Init
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("MediKL Global Elite Initialized");
});
