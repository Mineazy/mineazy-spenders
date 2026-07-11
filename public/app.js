/**
 * MINEAZY BIG SPENDERS TRACKING SYSTEM
 * Application Core Logic & State Management
 */

// Global State
let state = {
  clients: [],
  transactions: [],
  categories: []
};

// Default Categories list matching mineazy.co.zw
const DEFAULT_CATEGORIES = ['Workshop', 'Processing', 'Bearings', 'Bolts & Nuts', 'HDPE Fittings', 'Chemicals'];

// Global Chart References
let charts = {
  salesTrend: null,
  categoryShares: null,
  topSpenders: null,
  clientCategories: null,
  cumulativeSpend: null
};

// UI Element Cache
const elements = {
  tabButtons: document.querySelectorAll('.nav-btn'),
  tabViews: document.querySelectorAll('.tab-view'),
  viewTitle: document.getElementById('view-title'),
  viewSubtitle: document.getElementById('view-subtitle'),
  liveClock: document.getElementById('live-clock'),
  
  // KPIs
  kpiTotalRevenue: document.getElementById('kpi-total-revenue'),
  kpiVipCount: document.getElementById('kpi-vip-count'),
  kpiAov: document.getElementById('kpi-aov'),
  kpiTotalOrders: document.getElementById('kpi-total-orders'),
  
  // Leaderboard
  quickLeaderboard: document.getElementById('quick-leaderboard'),
  
  // Clients Table & Filters
  clientsTableBody: document.getElementById('clients-table-body'),
  clientSearch: document.getElementById('client-search'),
  filterClientTier: document.getElementById('filter-client-tier'),
  filterClientStatus: document.getElementById('filter-client-status'),
  
  // Transactions Table & Filters
  transactionsTableBody: document.getElementById('transactions-table-body'),
  transSearch: document.getElementById('trans-search'),
  filterTransClient: document.getElementById('filter-trans-client'),
  filterTransCategory: document.getElementById('filter-trans-category'),
  filterTransStart: document.getElementById('filter-trans-start'),
  filterTransEnd: document.getElementById('filter-trans-end'),
  transPaginationInfo: document.getElementById('trans-pagination-info'),
  btnTransPrev: document.getElementById('btn-trans-prev'),
  btnTransNext: document.getElementById('btn-trans-next'),
  transPageNumbers: document.getElementById('trans-page-numbers'),
  
  // Modals & Forms
  modalLogTransaction: document.getElementById('modal-log-transaction'),
  formLogTransaction: document.getElementById('form-log-transaction'),
  btnQuickLog: document.getElementById('btn-quick-log'),
  fieldTxClient: document.getElementById('field-tx-client'),
  fieldTxAmount: document.getElementById('field-tx-amount'),
  fieldTxCategory: document.getElementById('field-tx-category'),
  groupTxCategoryCustom: document.getElementById('group-tx-category-custom'),
  fieldTxCategoryCustom: document.getElementById('field-tx-category-custom'),
  fieldTxInvoice: document.getElementById('field-tx-invoice'),
  fieldTxDate: document.getElementById('field-tx-date'),
  fieldTxNotes: document.getElementById('field-tx-notes'),
  
  modalClientProfile: document.getElementById('modal-client-profile'),
  formClientProfile: document.getElementById('form-client-profile'),
  btnQuickClient: document.getElementById('btn-quick-client'),
  fieldClientId: document.getElementById('field-client-id'),
  titleClientProfile: document.getElementById('title-client-profile'),
  
  modalClientDetail: document.getElementById('modal-client-detail'),
  btnDetailEdit: document.getElementById('btn-detail-edit'),
  
  modalPortability: document.getElementById('modal-portability'),
  btnShowPortability: document.getElementById('btn-show-portability'),
  portTabButtons: document.querySelectorAll('.port-tab-btn'),
  portPanes: document.querySelectorAll('.port-pane'),
  exportJsonArea: document.getElementById('export-json-area'),
  importJsonArea: document.getElementById('import-json-area'),
  btnCopyJson: document.getElementById('btn-copy-json'),
  btnImportConfirm: document.getElementById('btn-import-confirm'),
  
  // Big Spenders View Elements
  spenderSearch: document.getElementById('spender-search'),
  spenderFilterPeriod: document.getElementById('spender-filter-period'),
  spenderCustomDates: document.getElementById('spender-custom-dates'),
  spenderStartDate: document.getElementById('spender-start-date'),
  spenderEndDate: document.getElementById('spender-end-date'),
  btnExportSpenders: document.getElementById('btn-export-spenders'),
  spendersTableBody: document.getElementById('spenders-table-body'),
  spendersPaginationInfo: document.getElementById('spenders-pagination-info'),
  btnSpendersPrev: document.getElementById('btn-spenders-prev'),
  btnSpendersNext: document.getElementById('btn-spenders-next'),
  spendersPageNumbers: document.getElementById('spenders-page-numbers')
};

// Sort Tracking State
let currentSorts = {
  clients: { key: 'spend', desc: true },
  transactions: { key: 'date', desc: true },
  spenders: { key: 'period-spend', desc: true }
};

// Spenders Pagination State
let spendersCurrentPage = 1;
const spendersPageSize = 5;

// Transactions Pagination State
let transCurrentPage = 1;
const transPageSize = 10;

/* ==========================================================================
   INITIALIZATION & DATA SETUP
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Auth Check
  if (authToken) {
    document.getElementById('login-overlay').classList.remove('active');
    if (currentUser && currentUser.role === 'admin') {
      document.getElementById('nav-users').style.display = 'flex';
    }
    loadData();
  } else {
    document.getElementById('login-overlay').classList.add('active');
  }

  initLiveClock();
  initTabNavigation();
  initSortListeners();
  setupModalBackdropListeners();
  setupFormHandlers();
  setupPortabilityTabs();
  
  // Listen for category selection changes
  elements.fieldTxCategory.addEventListener('change', () => {
    if (elements.fieldTxCategory.value === 'Other') {
      elements.groupTxCategoryCustom.style.display = 'block';
      elements.fieldTxCategoryCustom.required = true;
      elements.fieldTxCategoryCustom.focus();
    } else {
      elements.groupTxCategoryCustom.style.display = 'none';
      elements.fieldTxCategoryCustom.required = false;
    }
  });
  
  // Trigger quick logs & forms
  elements.btnQuickLog.addEventListener('click', () => openLogTransactionModal());
  elements.btnQuickClient.addEventListener('click', () => openAddClientModal());
  elements.btnShowPortability.addEventListener('click', () => openPortabilityModal());

  // Big Spenders View Listeners
  elements.spenderSearch.addEventListener('input', () => {
    spendersCurrentPage = 1;
    renderSpendersTable();
  });
  
  elements.spenderFilterPeriod.addEventListener('change', () => {
    const val = elements.spenderFilterPeriod.value;
    if (val === 'custom') {
      elements.spenderCustomDates.style.display = 'flex';
    } else {
      elements.spenderCustomDates.style.display = 'none';
    }
    spendersCurrentPage = 1;
    renderSpendersTable();
  });
  
  elements.spenderStartDate.addEventListener('change', () => {
    spendersCurrentPage = 1;
    renderSpendersTable();
  });
  
  elements.spenderEndDate.addEventListener('change', () => {
    spendersCurrentPage = 1;
    renderSpendersTable();
  });
  
  elements.btnExportSpenders.addEventListener('click', () => exportSpendersToCSV());
  
  elements.btnSpendersPrev.addEventListener('click', () => {
    if (spendersCurrentPage > 1) {
      spendersCurrentPage--;
      renderSpendersTable();
    }
  });
  
  elements.btnSpendersNext.addEventListener('click', () => {
    const totalCount = calculatePeriodSpenders().length;
    const maxPage = Math.ceil(totalCount / spendersPageSize);
    if (spendersCurrentPage < maxPage) {
      spendersCurrentPage++;
      renderSpendersTable();
    }
  });

  // Transactions Pagination Listeners
  elements.btnTransPrev.addEventListener('click', () => {
    if (transCurrentPage > 1) {
      transCurrentPage--;
      renderTransactionsTable();
    }
  });
  
  elements.btnTransNext.addEventListener('click', () => {
    // Get total count based on active filters
    const totalCount = getFilteredTransactionsCount();
    const maxPage = Math.ceil(totalCount / transPageSize);
    if (transCurrentPage < maxPage) {
      transCurrentPage++;
      renderTransactionsTable();
    }
  });
});

// Update the Clock
function initLiveClock() {
  const updateClock = () => {
    const now = new Date();
    elements.liveClock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// Default High-Value Mining Client Mock Database
const MOCK_CLIENTS = [
  { id: 'cli_1', company: 'Apex Gold Resources', contact: 'Sarah Jenkins', email: 's.jenkins@apex-gold.com', phone: '+1 775-555-0102', tier: 'Diamond VIP', status: 'Active', joinDate: '2025-08-12' },
  { id: 'cli_2', company: 'Nevada Shaft Drills Inc.', contact: 'Marcus Thorne', email: 'mthorne@nevadadrills.com', phone: '+1 702-555-4491', tier: 'Diamond VIP', status: 'Active', joinDate: '2025-09-01' },
  { id: 'cli_3', company: 'Glencore Excavators Ltd', contact: 'Evelyn Vane', email: 'e.vane@glencore-excavators.ca', phone: '+1 604-555-9018', tier: 'Gold Partner', status: 'Active', joinDate: '2025-10-15' },
  { id: 'cli_4', company: 'Sierra Mineral Logistics', contact: 'Carlos Rodriguez', email: 'carlos.r@sierraminerals.cl', phone: '+56 2 5555 1290', tier: 'Gold Partner', status: 'Active', joinDate: '2025-11-20' },
  { id: 'cli_5', company: 'Yukon Mining Partners', contact: 'Kenji Sato', email: 'k.sato@yukonpartners.ca', phone: '+1 867-555-3211', tier: 'Standard Partner', status: 'Active', joinDate: '2026-01-05' },
  { id: 'cli_6', company: 'Outback Copper Mines', contact: 'Lachlan Miller', email: 'miller.l@outbackcopper.com.au', phone: '+61 8 9481 0022', tier: 'Standard Partner', status: 'Inactive', joinDate: '2026-02-18' },
  { id: 'cli_7', company: 'Andesite Extraction Co.', contact: 'Mateo Silva', email: 'msilva@andesite.pe', phone: '+51 1 555-8833', tier: 'Standard Partner', status: 'Active', joinDate: '2026-03-22' }
];

const MOCK_TRANSACTIONS = [
  // Apex Gold
  { txid: 'TX-10001', invoiceNo: 'ME-10041', clientId: 'cli_1', date: '2026-01-14', category: 'Workshop', amount: 350000.00, notes: 'Sunsynk 50kW Hybrid Solar Inverter system & lithium batteries for regional office' },
  { txid: 'TX-10002', invoiceNo: 'ME-10042', clientId: 'cli_1', date: '2026-02-28', category: 'Chemicals', amount: 480000.00, notes: 'Sodium Cyanide briquettes (98% purity, 10-ton shipment)' },
  { txid: 'TX-10003', invoiceNo: 'ME-10043', clientId: 'cli_1', date: '2026-04-10', category: 'Processing', amount: 820000.00, notes: 'Apex Shaking Tables (gravity ore concentrator) - 4 units' },
  { txid: 'TX-10004', invoiceNo: 'ME-10044', clientId: 'cli_1', date: '2026-06-18', category: 'Bearings', amount: 75000.00, notes: 'SKF Spherical Roller Bearings for secondary jaw crusher mill' },
  { txid: 'TX-10005', invoiceNo: 'ME-10045', clientId: 'cli_1', date: '2026-07-05', category: 'Bolts & Nuts', amount: 25000.00, notes: 'M24 High Tensile structural hex bolts & heavy washers' },

  // Nevada Shaft Drills
  { txid: 'TX-10006', invoiceNo: 'ME-10046', clientId: 'cli_2', date: '2026-01-20', category: 'Processing', amount: 1150000.00, notes: 'Industrial Ball Mill grinding cylinder shell & installation gears' },
  { txid: 'TX-10007', invoiceNo: 'ME-10047', clientId: 'cli_2', date: '2026-03-15', category: 'HDPE Fittings', amount: 320000.00, notes: 'HDPE PN16 dewatering pipes (110mm, 2.5km) & Plasson couplings' },
  { txid: 'TX-10008', invoiceNo: 'ME-10048', clientId: 'cli_2', date: '2026-05-02', category: 'Workshop', amount: 180000.00, notes: 'Atlas Copco 15kW heavy duty screw air compressor unit' },
  { txid: 'TX-10009', invoiceNo: 'ME-10049', clientId: 'cli_2', date: '2026-07-02', category: 'Chemicals', amount: 240000.00, notes: 'Activated Carbon coconut-based granules for Carbon-in-Pulp circuit' },

  // Glencore Excavators
  { txid: 'TX-10010', invoiceNo: 'ME-10050', clientId: 'cli_3', date: '2026-02-10', category: 'Processing', amount: 690000.00, notes: 'Forged steel grinding balls (70mm) - 50 tons for ball mill feed' },
  { txid: 'TX-10011', invoiceNo: 'ME-10051', clientId: 'cli_3', date: '2026-04-05', category: 'Chemicals', amount: 95000.00, notes: 'Hydrated lime powder (pH regulator) & floatation frother agents' },
  { txid: 'TX-10012', invoiceNo: 'ME-10052', clientId: 'cli_3', date: '2026-06-12', category: 'Bearings', amount: 62000.00, notes: 'FAG Tapered Roller Bearings for belt conveyor pulleys' },

  // Sierra Mineral Logistics
  { txid: 'TX-10013', invoiceNo: 'ME-10053', clientId: 'cli_4', date: '2026-02-22', category: 'Processing', amount: 480000.00, notes: 'Electrowinning cell gold recovery replacement anode set' },
  { txid: 'TX-10014', invoiceNo: 'ME-10054', clientId: 'cli_4', date: '2026-05-19', category: 'HDPE Fittings', amount: 140000.00, notes: 'High-pressure slurry pipeline valves, tees, and flange adaptors' },

  // Yukon Mining Partners
  { txid: 'TX-10015', invoiceNo: 'ME-10055', clientId: 'cli_5', date: '2026-03-05', category: 'Workshop', amount: 210000.00, notes: 'Lincoln Electric heavy duty engine-driven welder generator units' },
  { txid: 'TX-10016', invoiceNo: 'ME-10056', clientId: 'cli_5', date: '2026-05-30', category: 'Bolts & Nuts', amount: 45000.00, notes: 'Foundation anchor bolts (M36) for plant mill mounting' },

  // Outback Copper Mines
  { txid: 'TX-10017', invoiceNo: 'ME-10057', clientId: 'cli_6', date: '2026-02-02', category: 'Workshop', amount: 160000.00, notes: 'Deye 30kW solar inverter system & backup battery cabinet' },

  // Andesite Extraction Co.
  { txid: 'TX-10018', invoiceNo: 'ME-10058', clientId: 'cli_7', date: '2026-04-18', category: 'Chemicals', amount: 85000.00, notes: 'Analytical grade nitric acid & flotation collector chemicals' },
  { txid: 'TX-10019', invoiceNo: 'ME-10059', clientId: 'cli_7', date: '2026-06-25', category: 'HDPE Fittings', amount: 35000.00, notes: 'HDPE compression elbows, branch tees, and ball valves' }
];

function updateDbStatusHeader(dbConnected) {
  const pill = document.getElementById('db-status-pill');
  if (!pill) return;
  
  pill.className = 'db-status-pill';
  const text = pill.querySelector('.db-status-text');
  
  if (dbConnected) {
    pill.classList.add('connected');
    text.textContent = 'TiDB Online';
  } else {
    pill.classList.add('fallback');
    text.textContent = 'Demo Mode';
  }
}

function showConnectionErrorBanner() {
  const pill = document.getElementById('db-status-pill');
  if (!pill) return;
  pill.className = 'db-status-pill error';
  const text = pill.querySelector('.db-status-text');
  text.textContent = 'Server Offline';
}

// Auth helper
let currentUser = JSON.parse(localStorage.getItem('mineazy_user') || 'null');
let authToken = localStorage.getItem('mineazy_token');

function handleLogout() {
  localStorage.removeItem('mineazy_user');
  localStorage.removeItem('mineazy_token');
  currentUser = null;
  authToken = null;
  document.getElementById('login-overlay').classList.add('active');
  document.getElementById('nav-users').style.display = 'none';
  
  // Reset local state to clear persistent data
  state.clients = [];
  state.transactions = [];
  state.categories = [];
  
  // Re-render views with empty state
  renderClientsTable();
  renderTransactionsTable();
  renderSpendersTable();
  syncDashboard();
  
  showToast('Successfully logged out', 'info');
}

// Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '';
  if (type === 'success') icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  else if (type === 'error') icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  else if (type === 'info') icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  
  toast.innerHTML = `
    ${icon}
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    });
  }, 3000);
}

async function apiFetch(url, options = {}) {
  if (!authToken) {
    handleLogout();
    throw new Error('Not authenticated');
  }
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    handleLogout();
    throw new Error('Authentication failed');
  }
  return res;
}

async function loadData() {
  try {
    const res = await apiFetch('/api/data');
    if (!res.ok) throw new Error('API server returned error status');
    
    const data = await res.json();
    state.clients = data.clients || [];
    state.transactions = data.transactions || [];
    state.categories = data.categories || [];
    
    updateDbStatusHeader(data.dbConnected);
  } catch (err) {
    console.error('Failed to load system data from backend database:', err);
    showConnectionErrorBanner();
    
    // Fallback to local storage
    const storedClients = localStorage.getItem('mineazy_cozw_v3_clients');
    const storedTrans = localStorage.getItem('mineazy_cozw_v3_transactions');
    const storedCategories = localStorage.getItem('mineazy_cozw_v3_categories');
    
    if (storedClients && storedTrans) {
      state.clients = JSON.parse(storedClients);
      state.transactions = JSON.parse(storedTrans);
    } else {
      state.clients = [...MOCK_CLIENTS];
      state.transactions = [...MOCK_TRANSACTIONS];
    }
    
    if (storedCategories) {
      state.categories = JSON.parse(storedCategories);
    } else {
      state.categories = [...DEFAULT_CATEGORIES];
    }
  }
  
  populateCategoryDropdowns();
  syncDashboard();
  renderClientsTable();
  renderTransactionsTable();
  renderSpendersTable();
}

function saveData() {
  localStorage.setItem('mineazy_cozw_v3_clients', JSON.stringify(state.clients));
  localStorage.setItem('mineazy_cozw_v3_transactions', JSON.stringify(state.transactions));
  localStorage.setItem('mineazy_cozw_v3_categories', JSON.stringify(state.categories));
}

function populateCategoryDropdowns() {
  // 1. Transaction form dropdown
  const formSelect = elements.fieldTxCategory;
  const currentFormVal = formSelect.value;
  formSelect.innerHTML = '';
  
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    formSelect.appendChild(opt);
  });
  
  // Add "Other" option
  const optOther = document.createElement('option');
  optOther.value = 'Other';
  optOther.textContent = 'Other...';
  formSelect.appendChild(optOther);
  
  if (currentFormVal && [...state.categories, 'Other'].includes(currentFormVal)) {
    formSelect.value = currentFormVal;
  }
  
  // 2. Transaction list filter dropdown
  const filterSelect = elements.filterTransCategory;
  const currentFilterVal = filterSelect.value;
  filterSelect.innerHTML = '<option value="all">All Categories</option>';
  
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterSelect.appendChild(opt);
  });
  
  if (currentFilterVal) {
    filterSelect.value = currentFilterVal;
  }
}

/* ==========================================================================
   TAB NAVIGATION SYSTEM
   ========================================================================== */

function initTabNavigation() {
  const tabButtons = document.querySelectorAll('.nav-btn');
  const tabViews = document.querySelectorAll('.tab-view');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));
      
      btn.classList.add('active');
      const view = document.getElementById(`${targetTab}-view`);
      if (view) view.classList.add('active');
      
      // Update Header Text
      if (targetTab === 'dashboard') {
        elements.viewTitle.textContent = "Dashboard Overview";
        elements.viewSubtitle.textContent = "Real-time spending analysis of Mineazy VIP clients";
        syncDashboardCharts();
      } else if (targetTab === 'clients') {
        elements.viewTitle.textContent = "Customer Profiles Management";
        elements.viewSubtitle.textContent = "Maintain account files, contact details, and customer tiers";
        renderClientsTable();
      } else if (targetTab === 'transactions') {
        elements.viewTitle.textContent = "Central Purchase Ledger";
        elements.viewSubtitle.textContent = "Complete log of all industrial purchases and consultancy fees";
        renderTransactionsTable();
      } else if (targetTab === 'spenders') {
        elements.viewTitle.textContent = "Cumulative Big Spenders";
        elements.viewSubtitle.textContent = "Ranked list of highest-value customer accounts by total purchases";
        spendersCurrentPage = 1;
        renderSpendersTable();
      } else if (targetTab === 'users') {
        elements.viewTitle.textContent = "User Management";
        elements.viewSubtitle.textContent = "Manage system access and roles";
        loadUsers();
      }
    });
  });
}

/* ==========================================================================
   METRICS CALCULATIONS (KPIs) & DASHBOARD
   ========================================================================== */

function syncDashboard() {
  // Aggregate Client statistics
  const clientStats = calculateClientMetrics();
  
  // Total Revenue (Spending)
  const totalRev = state.transactions.reduce((sum, tx) => sum + tx.amount, 0);
  elements.kpiTotalRevenue.textContent = formatCurrency(totalRev);
  
  // VIP Client Count (Diamond VIP + Gold Partner)
  const vipCount = state.clients.filter(c => c.tier === 'Diamond VIP' || c.tier === 'Gold Partner').length;
  elements.kpiVipCount.textContent = vipCount;
  
  // Average Order Value (AOV)
  const orderCount = state.transactions.length;
  const aov = orderCount > 0 ? (totalRev / orderCount) : 0;
  elements.kpiAov.textContent = formatCurrency(aov);
  elements.kpiTotalOrders.textContent = orderCount;
  
  // Update Leaderboard List (Top 5 spenders)
  const topSpenders = [...clientStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  elements.quickLeaderboard.innerHTML = '';
  
  topSpenders.forEach((client, idx) => {
    const initials = getInitials(client.company);
    const item = document.createElement('div');
    item.className = 'leader-item';
    item.addEventListener('click', () => openClientDossier(client.id));
    
    item.innerHTML = `
      <div class="leader-rank">${idx + 1}</div>
      <div class="leader-avatar">${initials}</div>
      <div class="leader-meta">
        <div class="leader-name" title="${client.company}">${client.company}</div>
        <div class="leader-company">${client.contact}</div>
      </div>
      <div class="leader-spend">
        <p>${formatCurrency(client.totalSpent)}</p>
        <span>${client.orderCount} orders</span>
      </div>
    `;
    elements.quickLeaderboard.appendChild(item);
  });
  
  syncDashboardCharts();
  renderSpendersTable();
}

function calculateClientMetrics() {
  return state.clients.map(client => {
    const clientTx = state.transactions.filter(tx => tx.clientId === client.id);
    const totalSpent = clientTx.reduce((sum, tx) => sum + tx.amount, 0);
    const orderCount = clientTx.length;
    const maxPurchase = clientTx.reduce((max, tx) => tx.amount > max ? tx.amount : max, 0);
    
    // Sort transactions to find last activity
    let lastActive = 'No Purchases';
    if (clientTx.length > 0) {
      const sortedTx = [...clientTx].sort((a, b) => new Date(b.date) - new Date(a.date));
      lastActive = sortedTx[0].date;
    }
    
    return {
      ...client,
      totalSpent,
      orderCount,
      maxPurchase,
      lastActive
    };
  });
}

/* ==========================================================================
   CHARTS RENDERING (CHART.JS)
   ========================================================================== */

function syncDashboardCharts() {
  const clientStats = calculateClientMetrics();
  
  // 1. TOP SPENDERS CHART (Horizontal Bar Chart)
  const sortedSpenders = [...clientStats].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 6);
  const spenderLabels = sortedSpenders.map(c => c.company);
  const spenderData = sortedSpenders.map(c => c.totalSpent);
  
  if (charts.topSpenders) {
    charts.topSpenders.destroy();
  }
  
  const ctxTop = document.getElementById('chart-top-spenders').getContext('2d');
  charts.topSpenders = new Chart(ctxTop, {
    type: 'bar',
    data: {
      labels: spenderLabels,
      datasets: [{
        label: 'Lifetime Spend (USD)',
        data: spenderData,
        backgroundColor: 'rgba(255, 183, 3, 0.75)',
        borderColor: '#ffb703',
        borderWidth: 1.5,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(255, 183, 3, 0.95)',
        barThickness: 18
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#151923',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 12 },
          borderColor: '#ffb703',
          borderWidth: 1,
          callbacks: {
            label: (context) => ` Spend: ${formatCurrency(context.parsed.x)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(36, 44, 62, 0.5)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 11 },
            callback: (val) => '$' + (val / 1000) + 'k'
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#f3f4f6',
            font: { family: 'Outfit', size: 12 }
          }
        }
      }
    }
  });

  // 2. CATEGORY BREAKDOWN CHART (Doughnut)
  const categoryTotals = {};
  state.transactions.forEach(tx => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });
  
  const catLabels = Object.keys(categoryTotals);
  const catData = Object.values(categoryTotals);
  
  if (charts.categoryShares) {
    charts.categoryShares.destroy();
  }
  
  const ctxCat = document.getElementById('chart-category-shares').getContext('2d');
  charts.categoryShares = new Chart(ctxCat, {
    type: 'doughnut',
    data: {
      labels: catLabels,
      datasets: [{
        data: catData,
        backgroundColor: [
          '#ffb703', // Gold
          '#fb8500', // Amber
          '#e67e22', // Copper
          '#10b981', // Emerald/Success
          '#94a3b8', // Steel
          '#3b82f6'  // Sapphire Blue
        ],
        borderWidth: 2,
        borderColor: '#151923'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 11 },
            padding: 10,
            boxWidth: 10,
            boxHeight: 10
          }
        },
        tooltip: {
          backgroundColor: '#151923',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 12 },
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 1,
          callbacks: {
            label: (context) => ` Total: ${formatCurrency(context.raw)}`
          }
        }
      },
      cutout: '70%'
    }
  });

  // 3. SPENDING OVER TIME (Line Chart)
  // Gather last 6 months revenue dynamically
  const monthlyRevenue = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  // Set up last 6 months bins
  const today = new Date(2026, 6, 10); // Simulated date from prompt
  const labelMonths = [];
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labelMonths.push({
      key: key,
      label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`
    });
    monthlyRevenue[key] = 0;
  }
  
  state.transactions.forEach(tx => {
    const txMonth = tx.date.substring(0, 7); // YYYY-MM
    if (txMonth in monthlyRevenue) {
      monthlyRevenue[txMonth] += tx.amount;
    }
  });
  
  const lineLabels = labelMonths.map(m => m.label);
  const lineData = labelMonths.map(m => monthlyRevenue[m.key]);
  
  if (charts.salesTrend) {
    charts.salesTrend.destroy();
  }
  
  const ctxLine = document.getElementById('chart-sales-trend').getContext('2d');
  
  // Create gradient
  const goldGradient = ctxLine.createLinearGradient(0, 0, 0, 200);
  goldGradient.addColorStop(0, 'rgba(255, 183, 3, 0.25)');
  goldGradient.addColorStop(1, 'rgba(255, 183, 3, 0.0)');

  charts.salesTrend = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: lineLabels,
      datasets: [{
        label: 'Monthly Spend',
        data: lineData,
        backgroundColor: goldGradient,
        borderColor: '#ffb703',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#fb8500',
        pointBorderColor: '#ffb703',
        pointBorderWidth: 1.5,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#151923',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 12 },
          borderColor: '#ffb703',
          borderWidth: 1,
          callbacks: {
            label: (context) => ` Spend: ${formatCurrency(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 12 }
          }
        },
        y: {
          grid: { color: 'rgba(36, 44, 62, 0.5)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 11 },
            callback: (val) => '$' + (val / 1000) + 'k'
          }
        }
      }
    }
  });

  // 4. CUMULATIVE SPENDING OVER TIME (Multi-line Chart)
  // Get all transactions sorted chronologically
  const sortedTx = [...state.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Get unique transaction dates
  const uniqueDates = [...new Set(sortedTx.map(tx => tx.date))].sort((a, b) => new Date(a) - new Date(b));
  
  // Build running total structures
  const clientTotals = {};
  const clientSeries = {};
  
  state.clients.forEach(c => {
    clientTotals[c.id] = 0;
    clientSeries[c.id] = [];
  });
  
  // Loop through dates to compute running totals
  uniqueDates.forEach(date => {
    const txsOnDate = sortedTx.filter(tx => tx.date === date);
    txsOnDate.forEach(tx => {
      if (tx.clientId in clientTotals) {
        clientTotals[tx.clientId] += tx.amount;
      }
    });
    
    // Save state at this date point
    state.clients.forEach(c => {
      clientSeries[c.id].push(clientTotals[c.id]);
    });
  });
  
  const colorsList = [
    { border: '#ffb703', background: 'rgba(255, 183, 3, 0.05)' },    // Gold
    { border: '#fb8500', background: 'rgba(251, 133, 0, 0.05)' },   // Orange
    { border: '#10b981', background: 'rgba(16, 185, 129, 0.05)' },  // Emerald
    { border: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)' },   // Sapphire
    { border: '#a78bfa', background: 'rgba(167, 139, 250, 0.05)' },  // Violet
    { border: '#f43f5e', background: 'rgba(244, 63, 94, 0.05)' },    // Rose
    { border: '#94a3b8', background: 'rgba(148, 163, 184, 0.05)' }   // Steel
  ];
  
  const datasets = state.clients.map((client, idx) => {
    const color = colorsList[idx % colorsList.length];
    return {
      label: client.company,
      data: clientSeries[client.id],
      borderColor: color.border,
      backgroundColor: color.background,
      borderWidth: 2.5,
      tension: 0.15,
      pointRadius: uniqueDates.length > 15 ? 2 : 4,
      pointHoverRadius: 6,
      fill: false
    };
  });
  
  const cumLabels = uniqueDates.map(d => formatDateString(d));
  
  if (charts.cumulativeSpend) {
    charts.cumulativeSpend.destroy();
  }
  
  const ctxCum = document.getElementById('chart-cumulative-spend').getContext('2d');
  charts.cumulativeSpend = new Chart(ctxCum, {
    type: 'line',
    data: {
      labels: cumLabels,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 11 },
            boxWidth: 10,
            padding: 12
          }
        },
        tooltip: {
          backgroundColor: '#151923',
          titleColor: '#f3f4f6',
          titleFont: { family: 'Outfit', size: 12, weight: 'bold' },
          bodyFont: { family: 'Outfit', size: 11 },
          borderColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ${formatCurrency(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(36, 44, 62, 0.2)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 10 },
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          grid: { color: 'rgba(36, 44, 62, 0.3)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 10 },
            callback: (val) => '$' + (val / 1000) + 'k'
          }
        }
      }
    }
  });
}

/* ==========================================================================
   CLIENTS MANAGEMENT & FILTERING
   ========================================================================== */

// Event Listeners for Filters
elements.clientSearch.addEventListener('input', renderClientsTable);
elements.filterClientTier.addEventListener('change', renderClientsTable);
elements.filterClientStatus.addEventListener('change', renderClientsTable);

function renderClientsTable() {
  const searchQuery = elements.clientSearch.value.toLowerCase().trim();
  const filterTier = elements.filterClientTier.value;
  const filterStatus = elements.filterClientStatus.value;
  
  const clientStats = calculateClientMetrics();
  
  // Filter clients list
  let filtered = clientStats.filter(client => {
    // Search filter
    const matchesSearch = 
      client.company.toLowerCase().includes(searchQuery) ||
      client.contact.toLowerCase().includes(searchQuery) ||
      client.email.toLowerCase().includes(searchQuery);
      
    // Tier filter
    const matchesTier = (filterTier === 'all' || client.tier === filterTier);
    
    // Status filter
    const matchesStatus = (filterStatus === 'all' || client.status.toLowerCase() === filterStatus);
    
    return matchesSearch && matchesTier && matchesStatus;
  });
  
  // Sort clients list
  const sort = currentSorts.clients;
  filtered.sort((a, b) => {
    let valA = a[sort.key];
    let valB = b[sort.key];
    
    // Custom sort values
    if (sort.key === 'spend') {
      valA = a.totalSpent;
      valB = b.totalSpent;
    } else if (sort.key === 'orders') {
      valA = a.orderCount;
      valB = b.orderCount;
    } else if (sort.key === 'last-active') {
      valA = a.lastActive === 'No Purchases' ? '0000-00-00' : a.lastActive;
      valB = b.lastActive === 'No Purchases' ? '0000-00-00' : b.lastActive;
    }
    
    if (typeof valA === 'string') {
      return sort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    
    return sort.desc ? valB - valA : valA - valB;
  });
  
  // Populate body
  elements.clientsTableBody.innerHTML = '';
  if (filtered.length === 0) {
    elements.clientsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-row">
          No clients found matching the selected filters.
        </td>
      </tr>
    `;
    return;
  }
  
  filtered.forEach(client => {
    const tr = document.createElement('tr');
    const initials = getInitials(client.company);
    const tierBadgeClass = client.tier.toLowerCase().replace(' ', '-');
    const statusClass = client.status.toLowerCase();
    
    tr.innerHTML = `
      <td>
        <div class="cell-company">
          <div class="cell-avatar">${initials}</div>
          <div class="cell-company-info">
            <a onclick="openClientDossier('${client.id}')">${client.company}</a>
            <span>Joined: ${formatDateString(client.joinDate)}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="badge ${tierBadgeClass}">${client.tier}</span>
      </td>
      <td>
        <div style="font-weight: 500">${client.contact}</div>
        <div style="font-size: 0.775rem; color: var(--text-secondary); margin-top: 0.15rem;">
          ${client.email} | ${client.phone || 'No Phone'}
        </div>
      </td>
      <td class="numeric" style="color: var(--gold-primary); font-weight: 700;">
        ${formatCurrency(client.totalSpent)}
      </td>
      <td class="numeric" style="font-family: var(--font-mono)">
        ${client.orderCount}
      </td>
      <td>
        <div style="font-size: 0.85rem">${client.lastActive === 'No Purchases' ? 'No Purchases' : formatDateString(client.lastActive)}</div>
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" onclick="openEditClientModal('${client.id}')" title="Edit Profile">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" onclick="openClientDossier('${client.id}')" title="View Profile Dossier">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
          <button class="btn-icon delete-action" onclick="deleteClient('${client.id}')" title="Delete Client Profile">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </td>
    `;
    elements.clientsTableBody.appendChild(tr);
  });
}

/* ==========================================================================
   TRANSACTIONS LOG & FILTERING
   ========================================================================== */

// Event Listeners for Filters
elements.transSearch.addEventListener('input', () => { transCurrentPage = 1; renderTransactionsTable(); });
elements.filterTransClient.addEventListener('change', () => { transCurrentPage = 1; renderTransactionsTable(); });
elements.filterTransCategory.addEventListener('change', () => { transCurrentPage = 1; renderTransactionsTable(); });
elements.filterTransStart.addEventListener('change', () => { transCurrentPage = 1; renderTransactionsTable(); });
elements.filterTransEnd.addEventListener('change', () => { transCurrentPage = 1; renderTransactionsTable(); });

function getFilteredTransactions() {
  const searchQuery = elements.transSearch.value.toLowerCase().trim();
  const filterClient = elements.filterTransClient.value;
  const filterCat = elements.filterTransCategory.value;
  const filterStart = elements.filterTransStart.value;
  const filterEnd = elements.filterTransEnd.value;
  
  return state.transactions.filter(tx => {
    const client = state.clients.find(c => c.id === tx.clientId);
    const clientName = client ? client.company.toLowerCase() : '';
    
    // Search filter
    const matchesSearch = 
      tx.txid.toLowerCase().includes(searchQuery) ||
      (tx.invoiceNo && tx.invoiceNo.toLowerCase().includes(searchQuery)) ||
      tx.category.toLowerCase().includes(searchQuery) ||
      clientName.includes(searchQuery) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchQuery));
      
    // Client filter
    const matchesClient = (filterClient === 'all' || tx.clientId === filterClient);
    
    // Category filter
    const matchesCat = (filterCat === 'all' || tx.category === filterCat);
    
    // Date Range filters
    const matchesStart = (!filterStart || new Date(tx.date) >= new Date(filterStart));
    const matchesEnd = (!filterEnd || new Date(tx.date) <= new Date(filterEnd));
    
    return matchesSearch && matchesClient && matchesCat && matchesStart && matchesEnd;
  });
}

function getFilteredTransactionsCount() {
  return getFilteredTransactions().length;
}

function renderTransactionsTable() {
  let filtered = getFilteredTransactions();
  
  // Sort transactions list
  const sort = currentSorts.transactions;
  filtered.sort((a, b) => {
    let valA = a[sort.key];
    let valB = b[sort.key];
    
    if (sort.key === 'client') {
      const cA = state.clients.find(c => c.id === a.clientId);
      const cB = state.clients.find(c => c.id === b.clientId);
      valA = cA ? cA.company : '';
      valB = cB ? cB.company : '';
    } else if (sort.key === 'invoice') {
      valA = a.invoiceNo || '';
      valB = b.invoiceNo || '';
    }
    
    if (typeof valA === 'string') {
      return sort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    
    return sort.desc ? valB - valA : valA - valB;
  });
  
  // Paginate transactions
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / transPageSize) || 1;
  
  if (transCurrentPage > totalPages) {
    transCurrentPage = totalPages;
  }
  if (transCurrentPage < 1) {
    transCurrentPage = 1;
  }
  
  const startIndex = (transCurrentPage - 1) * transPageSize;
  const endIndex = Math.min(startIndex + transPageSize, totalItems);
  const paginated = filtered.slice(startIndex, endIndex);
  
  // Populate body
  elements.transactionsTableBody.innerHTML = '';
  if (paginated.length === 0) {
    elements.transactionsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state-row">
          No transactions found matching the selected filters.
        </td>
      </tr>
    `;
    elements.transPaginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
    elements.transPageNumbers.innerHTML = '';
    return;
  }
  
  paginated.forEach(tx => {
    const client = state.clients.find(c => c.id === tx.clientId);
    const companyName = client ? client.company : 'Unknown Client';
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td style="font-family: var(--font-mono); font-weight: 500">${tx.txid}</td>
      <td style="font-family: var(--font-mono); font-weight: 600; color: var(--gold-primary)">${tx.invoiceNo || '-'}</td>
      <td>
        <a style="font-weight: 600; text-decoration: none; cursor: pointer; color: var(--text-main)" onclick="openClientDossier('${tx.clientId}')">${companyName}</a>
      </td>
      <td style="font-family: var(--font-mono); font-size: 0.85rem">${formatDateString(tx.date)}</td>
      <td>
        <span class="category-indicator cat-${tx.category.toLowerCase().replace(' ', '-')}">
          ${tx.category}
        </span>
      </td>
      <td class="cell-notes" title="${tx.notes || ''}">
        ${tx.notes || '<span style="color: var(--text-muted); font-style: italic;">No specifications</span>'}
      </td>
      <td class="numeric" style="color: var(--gold-primary); font-weight: 700;">
        ${formatCurrency(tx.amount)}
      </td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon delete-action" onclick="deleteTransaction('${tx.txid}')" title="Delete Entry">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </td>
    `;
    elements.transactionsTableBody.appendChild(tr);
  });
  
  // Render Pagination Info & Buttons
  elements.transPaginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
  
  // Previous/Next buttons state
  elements.btnTransPrev.disabled = (transCurrentPage === 1);
  elements.btnTransNext.disabled = (transCurrentPage === totalPages);
  
  // Render Page Numbers
  elements.transPageNumbers.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn-secondary-sm ${i === transCurrentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.style.minWidth = '28px';
    btn.style.padding = '0.4rem';
    if (i === transCurrentPage) {
      btn.style.borderColor = 'var(--gold-primary)';
      btn.style.color = 'var(--gold-primary)';
      btn.style.backgroundColor = 'rgba(255, 183, 3, 0.05)';
    }
    btn.addEventListener('click', () => {
      transCurrentPage = i;
      renderTransactionsTable();
    });
    elements.transPageNumbers.appendChild(btn);
  }
}

function syncClientSelectDropdowns() {
  // Clear lists
  elements.fieldTxClient.innerHTML = '<option value="" disabled selected>Select customer account...</option>';
  elements.filterTransClient.innerHTML = '<option value="all">All Clients</option>';
  
  // Sort alphabetically
  const alphabetical = [...state.clients].sort((a, b) => a.company.localeCompare(b.company));
  
  alphabetical.forEach(client => {
    // For Transaction Log form
    const optForm = document.createElement('option');
    optForm.value = client.id;
    optForm.textContent = client.company;
    elements.fieldTxClient.appendChild(optForm);
    
    // For Ledger filter dropdown
    const optFilter = document.createElement('option');
    optFilter.value = client.id;
    optFilter.textContent = client.company;
    elements.filterTransClient.appendChild(optFilter);
  });
}

/* ==========================================================================
   SORTING CONTROLS
   ========================================================================== */

function initSortListeners() {
  // Clients Table Columns
  document.querySelectorAll('#clients-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      const sort = currentSorts.clients;
      
      if (sort.key === key) {
        sort.desc = !sort.desc;
      } else {
        sort.key = key;
        sort.desc = true;
      }
      
      // Update visual headers
      document.querySelectorAll('#clients-table th.sortable').forEach(el => {
        el.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(sort.desc ? 'sort-desc' : 'sort-asc');
      
      renderClientsTable();
    });
  });

  // Transactions Table Columns
  document.querySelectorAll('#transactions-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      const sort = currentSorts.transactions;
      
      if (sort.key === key) {
        sort.desc = !sort.desc;
      } else {
        sort.key = key;
        sort.desc = true;
      }
      
      // Update visual headers
      document.querySelectorAll('#transactions-table th.sortable').forEach(el => {
        el.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(sort.desc ? 'sort-desc' : 'sort-asc');
      
      renderTransactionsTable();
    });
  });
  
  // Spenders Table Columns
  document.querySelectorAll('#spenders-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      const sort = currentSorts.spenders;
      
      if (sort.key === key) {
        sort.desc = !sort.desc;
      } else {
        sort.key = key;
        sort.desc = true;
      }
      
      // Update visual headers
      document.querySelectorAll('#spenders-table th.sortable').forEach(el => {
        el.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(sort.desc ? 'sort-desc' : 'sort-asc');
      
      spendersCurrentPage = 1;
      renderSpendersTable();
    });
  });

  // Set default initial visual state for sorted headers
  const defaultClientSort = document.querySelector(`#clients-table th[data-sort="${currentSorts.clients.key}"]`);
  if (defaultClientSort) defaultClientSort.classList.add('sort-desc');
  
  const defaultTransSort = document.querySelector(`#transactions-table th[data-sort="${currentSorts.transactions.key}"]`);
  if (defaultTransSort) defaultTransSort.classList.add('sort-desc');
  
  const defaultSpenderSort = document.querySelector(`#spenders-table th[data-sort="${currentSorts.spenders.key}"]`);
  if (defaultSpenderSort) defaultSpenderSort.classList.add('sort-desc');
}

/* ==========================================================================
   MODAL CONTROLLERS & FORM HANDLERS
   ========================================================================== */

// Handle modal light dismiss fallback clicks (click on backdrop closes)
function setupModalBackdropListeners() {
  const dialogs = [
    elements.modalLogTransaction,
    elements.modalClientProfile,
    elements.modalClientDetail,
    elements.modalPortability
  ];
  
  dialogs.forEach(dialog => {
    if (!dialog) return;
    
    // Light dismiss fallback
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!isDialogContent) {
          dialog.close();
        }
      });
    }
  });
}

// Log Transaction Form Modal
function openLogTransactionModal() {
  elements.formLogTransaction.reset();
  syncClientSelectDropdowns();
  
  // Preset date with simulated local date (2026-07-10)
  elements.fieldTxDate.value = "2026-07-10";
  
  // Preset a random Invoice Number
  elements.fieldTxInvoice.value = 'ME-' + Math.floor(10000 + Math.random() * 90000);
  
  elements.modalLogTransaction.showModal();
}

// Add Client Form Modal
function openAddClientModal() {
  elements.formClientProfile.reset();
  elements.fieldClientId.value = '';
  elements.titleClientProfile.textContent = 'Register Customer Profile';
  elements.modalClientProfile.showModal();
}

// Edit Client Form Modal
function openEditClientModal(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;
  
  elements.fieldClientId.value = client.id;
  document.getElementById('field-client-company').value = client.company;
  document.getElementById('field-client-contact').value = client.contact;
  document.getElementById('field-client-email').value = client.email;
  document.getElementById('field-client-phone').value = client.phone || '';
  document.getElementById('field-client-tier').value = client.tier;
  document.getElementById('field-client-status').value = client.status;
  
  elements.titleClientProfile.textContent = 'Update Customer Profile';
  
  // If drawer is open, close it first
  elements.modalClientDetail.close();
  
  elements.modalClientProfile.showModal();
}

// Form Submissions
function setupFormHandlers() {
  // Save Client Profile
  elements.formClientProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = elements.fieldClientId.value;
    const company = document.getElementById('field-client-company').value.trim();
    const contact = document.getElementById('field-client-contact').value.trim();
    const email = document.getElementById('field-client-email').value.trim();
    const phone = document.getElementById('field-client-phone').value.trim();
    const tier = document.getElementById('field-client-tier').value;
    const status = document.getElementById('field-client-status').value;
    
    try {
      const res = await apiFetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, company, contact, email, phone, tier, status })
      });
      if (!res.ok) throw new Error('API server returned error');
      
      await loadData();
    } catch (err) {
      console.warn('API error, falling back to local memory changes:', err.message);
      if (id) {
        // Edit mode
        const idx = state.clients.findIndex(c => c.id === id);
        if (idx !== -1) {
          state.clients[idx] = { ...state.clients[idx], company, contact, email, phone, tier, status };
        }
      } else {
        // Add mode
        const newId = `cli_${Date.now()}`;
        const joinDate = "2026-07-10"; // Local time setting
        state.clients.push({ id: newId, company, contact, email, phone, tier, status, joinDate });
      }
      saveData();
      syncDashboard();
      syncClientSelectDropdowns();
      renderClientsTable();
    }
    
    
    showToast("Client profile saved successfully.", "success");
    elements.modalClientProfile.close();
  });
  
  // Save Transaction
  elements.formLogTransaction.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = elements.fieldTxClient.value;
    const amount = parseFloat(elements.fieldTxAmount.value);
    
    let category = elements.fieldTxCategory.value;
    if (category === 'Other') {
      const customCat = elements.fieldTxCategoryCustom.value.trim();
      if (!customCat) {
        showToast("Please enter a custom category name.", 'error');
        return;
      }
      
      // Check if it already exists (case-insensitive)
      const existing = state.categories.find(c => c.toLowerCase() === customCat.toLowerCase());
      if (existing) {
        category = existing;
      } else {
        // Standard capitalization (Title Case)
        const capitalizedCat = customCat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        category = capitalizedCat;
      }
    }
    
    const date = elements.fieldTxDate.value;
    const invoiceNo = elements.fieldTxInvoice.value.trim();
    const notes = elements.fieldTxNotes.value.trim();
    const txid = `TX-${Math.floor(10000 + Math.random() * 90000)}`;
    
    try {
      const res = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txid, invoiceNo, clientId, amount, category, date, notes })
      });
      if (!res.ok) throw new Error('API server returned error');
      
      await loadData();
    } catch (err) {
      console.warn('API error, falling back to local memory changes:', err.message);
      
      if (!state.categories.includes(category)) {
        state.categories.push(category);
        populateCategoryDropdowns();
      }
      
      const newTx = { txid, invoiceNo, clientId, amount, category, date, notes };
      state.transactions.push(newTx);
      saveData();
      
      syncDashboard();
      renderClientsTable();
      renderTransactionsTable();
    }
    
    
    showToast("Transaction logged successfully.", "success");
    elements.modalLogTransaction.close();
  });
}

// Delete Client
window.deleteClient = async function(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;
  
  if (confirm(`Are you sure you want to permanently delete the customer profile for ${client.company}? This will also delete all associated purchase transactions.`)) {
    try {
      const res = await apiFetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API server returned error');
      
      await loadData();
    } catch (err) {
      console.warn('API error, deleting locally:', err.message);
      // Delete transactions
      state.transactions = state.transactions.filter(tx => tx.clientId !== clientId);
      // Delete client
      state.clients = state.clients.filter(c => c.id !== clientId);
      saveData();
      
      syncDashboard();
      syncClientSelectDropdowns();
      renderClientsTable();
      renderTransactionsTable();
    }
    
    // Close detail drawer if active
    elements.modalClientDetail.close();
    showToast(`Client profile ${client.company} deleted successfully.`, 'success');
  }
};

// Delete Transaction
window.deleteTransaction = async function(txid) {
  if (confirm(`Delete transaction ledger entry ${txid}? This will adjust the client's lifetime spend totals.`)) {
    try {
      const res = await apiFetch(`/api/transactions/${txid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API server returned error');
      
      await loadData();
    } catch (err) {
      console.warn('API error, deleting transaction locally:', err.message);
      state.transactions = state.transactions.filter(tx => tx.txid !== txid);
      saveData();
      
      syncDashboard();
      renderClientsTable();
      renderTransactionsTable();
    }
  }
};

/* ==========================================================================
   CLIENT DOSSIER (RICH DETAILED DRAWER)
   ========================================================================== */

window.openClientDossier = function(clientId) {
  const client = calculateClientMetrics().find(c => c.id === clientId);
  if (!client) return;
  
  // Basic info
  document.getElementById('detail-company-name').textContent = client.company;
  document.getElementById('detail-contact-title').textContent = `${client.contact} (Primary Contact)`;
  document.getElementById('detail-email').textContent = client.email;
  document.getElementById('detail-phone').textContent = client.phone || 'No Telephone';
  
  // Set VIP Badge
  const badge = document.getElementById('detail-tier-badge');
  badge.textContent = client.tier;
  badge.className = `badge ${client.tier.toLowerCase().replace(' ', '-')}`;
  
  // Avatar
  const avatar = document.getElementById('detail-avatar');
  avatar.textContent = getInitials(client.company);
  
  // KPIs
  document.getElementById('detail-stat-spend').textContent = formatCurrency(client.totalSpent);
  document.getElementById('detail-stat-orders').textContent = client.orderCount;
  
  const clientTx = state.transactions.filter(tx => tx.clientId === client.id);
  const avgSpend = client.orderCount > 0 ? (client.totalSpent / client.orderCount) : 0;
  document.getElementById('detail-stat-avg').textContent = formatCurrency(avgSpend);
  document.getElementById('detail-stat-max').textContent = formatCurrency(client.maxPurchase);
  
  // Edit Profile Dossier Action Link
  elements.btnDetailEdit.onclick = () => openEditClientModal(client.id);
  
  // Rebuild Client History Table
  const historyBody = document.getElementById('client-history-table-body');
  historyBody.innerHTML = '';
  
  if (clientTx.length === 0) {
    historyBody.innerHTML = `<tr><td colspan="6" class="empty-state-row">No documented purchases.</td></tr>`;
  } else {
    // Sort transactions by date desc
    const sortedTx = [...clientTx].sort((a, b) => new Date(b.date) - new Date(a.date));
    sortedTx.forEach(tx => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono)">${tx.txid}</td>
        <td style="font-family: var(--font-mono); font-weight:600">${tx.invoiceNo || '-'}</td>
        <td>${formatDateString(tx.date)}</td>
        <td><span class="category-indicator cat-${tx.category.toLowerCase().replace(' ', '-')}">${tx.category}</span></td>
        <td class="cell-notes" title="${tx.notes || ''}">${tx.notes || '-'}</td>
        <td class="numeric" style="font-weight:600; color:var(--gold-primary)">${formatCurrency(tx.amount)}</td>
      `;
      historyBody.appendChild(tr);
    });
  }
  
  // Category allocation for the specific client
  const clientCatTotals = {};
  clientTx.forEach(tx => {
    clientCatTotals[tx.category] = (clientCatTotals[tx.category] || 0) + tx.amount;
  });
  
  const subLabels = Object.keys(clientCatTotals);
  const subData = Object.values(clientCatTotals);
  
  if (charts.clientCategories) {
    charts.clientCategories.destroy();
  }
  
  const ctxSub = document.getElementById('chart-client-categories').getContext('2d');
  charts.clientCategories = new Chart(ctxSub, {
    type: 'doughnut',
    data: {
      labels: subLabels,
      datasets: [{
        data: subData,
        backgroundColor: [
          '#ffb703', '#fb8500', '#e67e22', '#10b981', '#94a3b8', '#3b82f6'
        ],
        borderWidth: 2,
        borderColor: '#151923'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#9ca3af',
            font: { family: 'Outfit', size: 10 }
          }
        },
        tooltip: {
          backgroundColor: '#151923',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: (context) => ` Total: ${formatCurrency(context.raw)}`
          }
        }
      },
      cutout: '65%'
    }
  });

  elements.modalClientDetail.showModal();
};

/* ==========================================================================
   DATA PORTABILITY (IMPORT / EXPORT SYSTEM)
   ========================================================================== */

function openPortabilityModal() {
  elements.exportJsonArea.value = JSON.stringify(state, null, 2);
  elements.importJsonArea.value = '';
  elements.modalPortability.showModal();
}

function setupPortabilityTabs() {
  elements.portTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.getAttribute('data-port-tab');
      
      elements.portTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      elements.portPanes.forEach(pane => {
        if (pane.id === `port-${paneId}-pane`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });
  
  // Copy to clipboard
  elements.btnCopyJson.addEventListener('click', () => {
    elements.exportJsonArea.select();
    navigator.clipboard.writeText(elements.exportJsonArea.value)
      .then(() => {
        const oldText = elements.btnCopyJson.textContent;
        elements.btnCopyJson.textContent = 'Copied to Clipboard!';
        elements.btnCopyJson.style.backgroundColor = 'var(--color-success)';
        elements.btnCopyJson.style.color = '#fff';
        setTimeout(() => {
          elements.btnCopyJson.textContent = oldText;
          elements.btnCopyJson.style.backgroundColor = '';
          elements.btnCopyJson.style.color = '';
        }, 2000);
      })
      .catch(err => showToast('Failed to copy text: ' + err, 'error'));
  });
  
  // Import backup data
  elements.btnImportConfirm.addEventListener('click', async () => {
    const rawJson = elements.importJsonArea.value.trim();
    if (!rawJson) return;
    
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.clients || !parsed.transactions) {
        throw new Error("Backup file must contain 'clients' and 'transactions' lists.");
      }
      
      if (confirm("Are you sure you want to restore this backup? This will overwrite the current live database. This operation is irreversible.")) {
        try {
          const res = await apiFetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: rawJson
          });
          if (!res.ok) throw new Error('API server returned error status during import');
          
          await loadData();
        } catch (err) {
          console.warn('API error during import, restoring locally only:', err.message);
          state = parsed;
          saveData();
          
          syncDashboard();
          syncClientSelectDropdowns();
          renderClientsTable();
          renderTransactionsTable();
        }
        
        elements.modalPortability.close();
        showToast("System database restored successfully!", 'success');
      }
    } catch(err) {
      showToast("Invalid backup configuration. Please check the JSON format.", 'error');
    }
  });
}

/* ==========================================================================
   UTILITY HELPER FUNCTIONS
   ========================================================================== */

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(val);
}

function formatDateString(str) {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[monthIdx]} ${parseInt(day, 10)}, ${year}`;
}

function getInitials(companyName) {
  if (!companyName) return '';
  const words = companyName.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return companyName.substr(0, 2).toUpperCase();
}

/* ==========================================================================
   BIG SPENDERS CALCULATIONS & VIEWS
   ========================================================================== */

function calculatePeriodSpenders() {
  const searchQuery = elements.spenderSearch.value.toLowerCase().trim();
  const period = elements.spenderFilterPeriod.value;
  
  // Simulated current local date is 2026-07-10
  const simulatedToday = new Date('2026-07-10');
  let startDate = null;
  let endDate = null;
  
  if (period === 'month') {
    // Current month: July 2026
    startDate = new Date('2026-07-01');
    endDate = new Date('2026-07-31');
  } else if (period === '90days') {
    // Last 90 days
    startDate = new Date(simulatedToday);
    startDate.setDate(simulatedToday.getDate() - 90);
    endDate = simulatedToday;
  } else if (period === 'custom') {
    const rawStart = elements.spenderStartDate.value;
    const rawEnd = elements.spenderEndDate.value;
    if (rawStart) startDate = new Date(rawStart);
    if (rawEnd) endDate = new Date(rawEnd);
  }
  
  // Calculate spenders list
  let results = state.clients.map(client => {
    // Filter transactions for this client within the period
    const allClientTx = state.transactions.filter(tx => tx.clientId === client.id);
    const periodClientTx = allClientTx.filter(tx => {
      const txDate = new Date(tx.date);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });
    
    // Sum spend
    const periodSpend = periodClientTx.reduce((sum, tx) => sum + tx.amount, 0);
    const lifetimeSpend = allClientTx.reduce((sum, tx) => sum + tx.amount, 0);
    const orderCount = periodClientTx.length;
    
    let lastActive = 'No purchases in period';
    if (periodClientTx.length > 0) {
      const sorted = [...periodClientTx].sort((a, b) => new Date(b.date) - new Date(a.date));
      lastActive = sorted[0].date;
    }
    
    return {
      id: client.id,
      company: client.company,
      contact: client.contact,
      email: client.email,
      tier: client.tier,
      periodSpend,
      lifetimeSpend,
      orderCount,
      lastActive
    };
  });
  
  // Filter by search query
  if (searchQuery) {
    results = results.filter(item => 
      item.company.toLowerCase().includes(searchQuery) ||
      item.contact.toLowerCase().includes(searchQuery) ||
      item.tier.toLowerCase().includes(searchQuery)
    );
  }
  
  return results;
}

function renderSpendersTable() {
  const calculated = calculatePeriodSpenders();
  
  // Sort calculated results
  const sort = currentSorts.spenders;
  
  calculated.sort((a, b) => {
    let valA = a[sort.key];
    let valB = b[sort.key];
    
    if (sort.key === 'period-spend') {
      valA = a.periodSpend;
      valB = b.periodSpend;
    } else if (sort.key === 'lifetime-spend') {
      valA = a.lifetimeSpend;
      valB = b.lifetimeSpend;
    } else if (sort.key === 'orders') {
      valA = a.orderCount;
      valB = b.orderCount;
    } else if (sort.key === 'last-active') {
      valA = a.lastActive === 'No purchases in period' ? '0000-00-00' : a.lastActive;
      valB = b.lastActive === 'No purchases in period' ? '0000-00-00' : b.lastActive;
    }
    
    if (typeof valA === 'string') {
      return sort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    
    return sort.desc ? valB - valA : valA - valB;
  });
  
  // Paginate
  const totalItems = calculated.length;
  const totalPages = Math.ceil(totalItems / spendersPageSize) || 1;
  
  if (spendersCurrentPage > totalPages) {
    spendersCurrentPage = totalPages;
  }
  if (spendersCurrentPage < 1) {
    spendersCurrentPage = 1;
  }
  
  const startIndex = (spendersCurrentPage - 1) * spendersPageSize;
  const endIndex = Math.min(startIndex + spendersPageSize, totalItems);
  const paginated = calculated.slice(startIndex, endIndex);
  
  // Render rows
  elements.spendersTableBody.innerHTML = '';
  
  if (paginated.length === 0) {
    elements.spendersTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-row">
          No big spenders found matching the selected search/filters.
        </td>
      </tr>
    `;
    elements.spendersPaginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
    elements.spendersPageNumbers.innerHTML = '';
    return;
  }
  
  paginated.forEach((item, index) => {
    const rank = startIndex + index + 1;
    const tr = document.createElement('tr');
    const initials = getInitials(item.company);
    const tierBadgeClass = item.tier.toLowerCase().replace(' ', '-');
    
    tr.innerHTML = `
      <td>
        <div class="leader-rank" style="margin: 0 auto; width: 26px; height: 26px; font-size: 0.8rem; font-family: var(--font-mono)">
          ${rank}
        </div>
      </td>
      <td>
        <div class="cell-company">
          <div class="cell-avatar" style="font-family: var(--font-mono); font-size: 0.75rem">${initials}</div>
          <div class="cell-company-info">
            <a onclick="openClientDossier('${item.id}')">${item.company}</a>
            <span>Contact: ${item.contact}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="badge ${tierBadgeClass}">${item.tier}</span>
      </td>
      <td class="numeric" style="color: var(--gold-primary); font-weight: 700;">
        ${formatCurrency(item.periodSpend)}
      </td>
      <td class="numeric" style="color: var(--text-secondary); font-weight: 600;">
        ${formatCurrency(item.lifetimeSpend)}
      </td>
      <td class="numeric" style="font-family: var(--font-mono)">
        ${item.orderCount}
      </td>
      <td>
        <div style="font-size: 0.825rem">
          ${item.lastActive === 'No purchases in period' ? 'No purchases' : formatDateString(item.lastActive)}
        </div>
      </td>
    `;
    elements.spendersTableBody.appendChild(tr);
  });
  
  // Render Pagination Info & Buttons
  elements.spendersPaginationInfo.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} entries`;
  
  // Previous/Next buttons state
  elements.btnSpendersPrev.disabled = (spendersCurrentPage === 1);
  elements.btnSpendersNext.disabled = (spendersCurrentPage === totalPages);
  
  // Render Page Numbers
  elements.spendersPageNumbers.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn-secondary-sm ${i === spendersCurrentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.style.minWidth = '28px';
    btn.style.padding = '0.4rem';
    if (i === spendersCurrentPage) {
      btn.style.borderColor = 'var(--gold-primary)';
      btn.style.color = 'var(--gold-primary)';
      btn.style.backgroundColor = 'rgba(255, 183, 3, 0.05)';
    }
    btn.addEventListener('click', () => {
      spendersCurrentPage = i;
      renderSpendersTable();
    });
    elements.spendersPageNumbers.appendChild(btn);
  }
}

function exportSpendersToCSV() {
  const spenders = calculatePeriodSpenders();
  if (spenders.length === 0) {
    showToast("No spender entries available to export.", 'info');
    return;
  }
  
  // Sort them matching current sort state
  const sort = currentSorts.spenders;
  spenders.sort((a, b) => {
    let valA = a[sort.key];
    let valB = b[sort.key];
    
    if (sort.key === 'period-spend') {
      valA = a.periodSpend;
      valB = b.periodSpend;
    } else if (sort.key === 'lifetime-spend') {
      valA = a.lifetimeSpend;
      valB = b.lifetimeSpend;
    } else if (sort.key === 'orders') {
      valA = a.orderCount;
      valB = b.orderCount;
    } else if (sort.key === 'last-active') {
      valA = a.lastActive === 'No purchases in period' ? '0000-00-00' : a.lastActive;
      valB = b.lastActive === 'No purchases in period' ? '0000-00-00' : b.lastActive;
    }
    
    if (typeof valA === 'string') {
      return sort.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }
    
    return sort.desc ? valB - valA : valA - valB;
  });
  
  // Create CSV String
  let csvContent = "Rank,Company Name,Contact,VIP Tier,Period Spend (USD),Lifetime Spend (USD),Orders in Period,Last Active Date\r\n";
  
  spenders.forEach((item, index) => {
    const rank = index + 1;
    const companyEscaped = `"${item.company.replace(/"/g, '""')}"`;
    const contactEscaped = `"${item.contact.replace(/"/g, '""')}"`;
    
    csvContent += `${rank},${companyEscaped},${contactEscaped},"${item.tier}",${item.periodSpend},${item.lifetimeSpend},${item.orderCount},"${item.lastActive}"\r\n`;
  });
  
  // Trigger file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  
  const period = elements.spenderFilterPeriod.value;
  link.setAttribute("download", `mineazy_cumulative_spenders_${period}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ==========================================================================
   AUTHENTICATION & USER MANAGEMENT
   ========================================================================== */

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = e.target.querySelector('button');
  
  errorEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Authenticating...';
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('mineazy_token', authToken);
    localStorage.setItem('mineazy_user', JSON.stringify(currentUser));
    
    document.getElementById('login-overlay').classList.remove('active');
    if (currentUser.role === 'admin') {
      document.getElementById('nav-users').style.display = 'flex';
    } else {
      document.getElementById('nav-users').style.display = 'none';
    }
    
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    await loadData();
    showToast(`Welcome, ${currentUser.username}!`, 'success');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Authenticate';
  }
});



// Load Users for User Management
async function loadUsers() {
  try {
    const res = await apiFetch('/api/users');
    if (!res.ok) throw new Error('Failed to load users');
    const users = await res.json();
    renderUsersTable(users);
  } catch (err) {
    console.error(err);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  
  const searchInput = document.getElementById('user-search');
  const term = searchInput ? searchInput.value.toLowerCase() : '';
  
  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(term));
  
  tbody.innerHTML = '';
  if (filteredUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No users found.</td></tr>`;
    return;
  }
  
  filteredUsers.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${user.username}</strong></td>
      <td><span class="badge ${user.role === 'admin' ? 'tier-diamond' : 'tier-standard'}">${user.role.toUpperCase()}</span></td>
      <td>
        <button class="btn-icon" onclick="deleteUser('${user.id}')" title="Delete User">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Add User Form
document.getElementById('btn-add-user')?.addEventListener('click', () => {
  document.getElementById('form-add-user').reset();
  document.getElementById('add-user-error').textContent = '';
  document.getElementById('modal-add-user').showModal();
});

document.getElementById('form-add-user')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('field-user-username').value;
  const role = document.getElementById('field-user-role').value;
  const password = document.getElementById('field-user-password').value;
  const errorEl = document.getElementById('add-user-error');
  const btn = e.target.querySelector('button[type="submit"]');
  
  errorEl.textContent = '';
  btn.disabled = true;
  
  try {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create user');
    
    document.getElementById('modal-add-user').close();
    document.getElementById('field-user-password').value = '';
    loadUsers();
    showToast("User created successfully.", 'success');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// Delete User
window.deleteUser = async function(id) {
  if (currentUser && currentUser.id === id) {
    showToast("You cannot delete your own account.", 'error');
    return;
  }
  if (confirm("Are you sure you want to delete this user?")) {
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      loadUsers();
      showToast("User deleted successfully.", 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// Search users
document.getElementById('user-search')?.addEventListener('input', loadUsers);
