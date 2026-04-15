// ===== BIZLEDGER APP.JS =====
// Offline-first accounting app — all data in localStorage

// ===== STATE =====
let DB = {
  settings: {},
  income: [],
  expenses: [],
  invoices: [],
  inventory: []
};

let currentPin = '';
let pendingDelete = null;
let invoiceItems = [];
let currentInvoiceId = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  checkFirstRun();
  monitorConnection();
  prefillDates();
});

function loadDB() {
  try {
    const saved = localStorage.getItem('bizledger_db');
    if (saved) DB = JSON.parse(saved);
  } catch(e) { DB = { settings:{}, income:[], expenses:[], invoices:[], inventory:[] }; }
  if (!DB.income) DB.income = [];
  if (!DB.expenses) DB.expenses = [];
  if (!DB.invoices) DB.invoices = [];
  if (!DB.inventory) DB.inventory = [];
  if (!DB.settings) DB.settings = {};
}

function saveDB() {
  localStorage.setItem('bizledger_db', JSON.stringify(DB));
}

function checkFirstRun() {
  if (!DB.settings.adminHash) {
    show('install-gate');
    hide('pin-screen');
    hide('app');
  } else {
    show('pin-screen');
    hide('install-gate');
    hide('app');
    document.getElementById('pin-biz-name').textContent = DB.settings.bizName || 'BizLedger';
  }
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ===== SETUP =====
function completeSetup() {
  const bizName = document.getElementById('setup-biz-name').value.trim();
  const adminPass = document.getElementById('setup-admin-pass').value;
  const adminConfirm = document.getElementById('setup-admin-confirm').value;
  const pin = document.getElementById('setup-pin').value.trim();
  const err = document.getElementById('setup-error');

  if (!bizName) { err.textContent = 'Please enter a business name.'; return; }
  if (!adminPass || adminPass.length < 6) { err.textContent = 'Admin password must be at least 6 characters.'; return; }
  if (adminPass !== adminConfirm) { err.textContent = 'Passwords do not match.'; return; }
  if (!pin || pin.length < 4 || !/^\d+$/.test(pin)) { err.textContent = 'PIN must be 4-6 digits.'; return; }

  DB.settings.bizName = bizName;
  DB.settings.adminHash = hashString(adminPass);
  DB.settings.pinHash = hashString(pin);
  DB.settings.pinLength = pin.length;
  DB.settings.currency = 'KES';
  DB.settings.lowStockThreshold = 10;
  saveDB();

  hide('install-gate');
  show('pin-screen');
  document.getElementById('pin-biz-name').textContent = bizName;
  err.textContent = '';
}

// ===== PIN =====
function pinInput(d) {
  if (currentPin.length >= (DB.settings.pinLength || 6)) return;
  currentPin += d;
  updatePinDots();
  if (currentPin.length === (DB.settings.pinLength || 4)) {
    setTimeout(checkPin, 200);
  }
}

function pinBackspace() {
  currentPin = currentPin.slice(0, -1);
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

function updatePinDots() {
  const len = DB.settings.pinLength || 4;
  const dots = document.querySelectorAll('#pin-dots span');
  dots.forEach((d, i) => {
    d.className = i < currentPin.length ? 'filled' : '';
    d.style.display = i < len ? 'block' : 'none';
  });
}

function checkPin() {
  if (hashString(currentPin) === DB.settings.pinHash) {
    hide('pin-screen');
    show('app');
    launchApp();
  } else {
    document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
    currentPin = '';
    updatePinDots();
  }
}

function lockApp() {
  currentPin = '';
  hide('app');
  show('pin-screen');
  updatePinDots();
  document.getElementById('pin-error').textContent = '';
}

// ===== APP LAUNCH =====
function launchApp() {
  document.getElementById('sidebar-biz-name').textContent = DB.settings.bizName || '';
  populateFilterDropdowns();
  navigate('dashboard');
  checkLowStock();
  updateNotifBadge();
}

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) {
    pageEl.classList.remove('hidden');
    pageEl.classList.add('active');
  }

  const navItem = document.querySelector(`.nav-item[onclick*="'${page}'"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', income: 'Income', expenses: 'Expenses',
    invoices: 'Invoices', inventory: 'Inventory', reports: 'Reports', settings: 'Settings'
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Render content
  if (page === 'dashboard') renderDashboard();
  if (page === 'income') renderIncome();
  if (page === 'expenses') renderExpenses();
  if (page === 'invoices') renderInvoices();
  if (page === 'inventory') renderInventory();
  if (page === 'settings') loadSettings();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay')?.classList.remove('active');
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    };
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const cur = DB.settings.currency || 'KES';

  const monthIncome = DB.income.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).reduce((s, r) => s + r.amount, 0);

  const monthExpense = DB.expenses.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).reduce((s, r) => s + r.amount, 0);

  const profit = monthIncome - monthExpense;
  const unpaidInvoices = DB.invoices.filter(i => i.status === 'Unpaid' || i.status === 'Overdue').length;

  document.getElementById('kpi-income').textContent = `${cur} ${fmtNum(monthIncome)}`;
  document.getElementById('kpi-expenses').textContent = `${cur} ${fmtNum(monthExpense)}`;
  document.getElementById('kpi-profit').textContent = `${cur} ${fmtNum(profit)}`;
  document.getElementById('kpi-invoices').textContent = unpaidInvoices;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('dash-greeting').textContent = `${greeting}! Here's ${DB.settings.bizName || 'your business'} summary for ${now.toLocaleString('default', { month: 'long' })} ${year}.`;

  // Recent transactions
  const all = [
    ...DB.income.map(r => ({ ...r, type: 'income' })),
    ...DB.expenses.map(r => ({ ...r, type: 'expense' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const tEl = document.getElementById('recent-transactions');
  if (all.length === 0) {
    tEl.innerHTML = '<div class="empty-state">No transactions yet</div>';
  } else {
    tEl.innerHTML = all.map(r => `
      <div class="trans-item">
        <div class="trans-dot ${r.type}"></div>
        <div class="trans-label">${esc(r.description)}</div>
        <div class="trans-val ${r.type}">${r.type === 'income' ? '+' : '-'}${cur} ${fmtNum(r.amount)}</div>
      </div>
    `).join('');
  }

  // Low stock
  const lowThreshold = DB.settings.lowStockThreshold || 10;
  const lowItems = DB.inventory.filter(p => p.qty <= lowThreshold);
  const lsEl = document.getElementById('low-stock-list');
  if (lowItems.length === 0) {
    lsEl.innerHTML = '<div class="empty-state">All stock levels are healthy</div>';
  } else {
    lsEl.innerHTML = lowItems.map(p => `
      <div class="notif-item">
        ⚠ <strong>${esc(p.name)}</strong> — ${p.qty} ${p.unit || 'pcs'} remaining
      </div>
    `).join('');
  }
}

// ===== INCOME =====
function renderIncome() {
  const search = (document.getElementById('income-search')?.value || '').toLowerCase();
  const monthF = document.getElementById('income-month-filter')?.value || '';
  const catF = document.getElementById('income-category-filter')?.value || '';

  let data = [...DB.income].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (search) data = data.filter(r => r.description.toLowerCase().includes(search) || (r.notes||'').toLowerCase().includes(search));
  if (monthF) data = data.filter(r => r.date.startsWith(monthF));
  if (catF) data = data.filter(r => r.category === catF);

  const total = data.reduce((s, r) => s + r.amount, 0);
  const cur = DB.settings.currency || 'KES';
  document.getElementById('income-total-display').textContent = `${cur} ${fmtNum(total)}`;

  const el = document.getElementById('income-list');
  if (data.length === 0) {
    el.innerHTML = '<div class="empty-state">No income records found</div>';
    return;
  }
  el.innerHTML = data.map(r => `
    <div class="record-card">
      <div class="record-icon income">💰</div>
      <div class="record-info">
        <div class="record-title">${esc(r.description)}</div>
        <div class="record-sub">${r.category} • ${fmtDate(r.date)}${r.notes ? ' • ' + esc(r.notes) : ''}</div>
      </div>
      <div class="record-amount income">${cur} ${fmtNum(r.amount)}</div>
      <div class="record-actions">
        <button class="btn-icon danger" onclick="deleteRecord('income','${r.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

function saveIncome() {
  const desc = document.getElementById('inc-desc').value.trim();
  const amount = parseFloat(document.getElementById('inc-amount').value);
  const date = document.getElementById('inc-date').value;
  const category = document.getElementById('inc-category').value;
  const notes = document.getElementById('inc-notes').value.trim();
  const err = document.getElementById('inc-error');

  if (!desc) { err.textContent = 'Please enter a description.'; return; }
  if (!amount || amount <= 0) { err.textContent = 'Please enter a valid amount.'; return; }
  if (!date) { err.textContent = 'Please select a date.'; return; }

  DB.income.push({ id: uid(), description: desc, amount, date, category, notes, createdAt: Date.now() });
  saveDB();
  closeModal('add-income-modal');
  clearForm(['inc-desc', 'inc-amount', 'inc-notes']);
  err.textContent = '';
  renderIncome();
  showToast('Income added successfully', 'success');
}

// ===== EXPENSES =====
function renderExpenses() {
  const search = (document.getElementById('expense-search')?.value || '').toLowerCase();
  const monthF = document.getElementById('expense-month-filter')?.value || '';
  const catF = document.getElementById('expense-category-filter')?.value || '';

  let data = [...DB.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (search) data = data.filter(r => r.description.toLowerCase().includes(search));
  if (monthF) data = data.filter(r => r.date.startsWith(monthF));
  if (catF) data = data.filter(r => r.category === catF);

  const total = data.reduce((s, r) => s + r.amount, 0);
  const cur = DB.settings.currency || 'KES';
  document.getElementById('expense-total-display').textContent = `${cur} ${fmtNum(total)}`;

  const el = document.getElementById('expense-list');
  if (data.length === 0) {
    el.innerHTML = '<div class="empty-state">No expense records found</div>';
    return;
  }
  el.innerHTML = data.map(r => `
    <div class="record-card">
      <div class="record-icon expense">💸</div>
      <div class="record-info">
        <div class="record-title">${esc(r.description)}</div>
        <div class="record-sub">${r.category} • ${fmtDate(r.date)}${r.notes ? ' • ' + esc(r.notes) : ''}</div>
      </div>
      <div class="record-amount expense">-${cur} ${fmtNum(r.amount)}</div>
      <div class="record-actions">
        <button class="btn-icon danger" onclick="deleteRecord('expense','${r.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

function saveExpense() {
  const desc = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const date = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-category').value;
  const notes = document.getElementById('exp-notes').value.trim();
  const err = document.getElementById('exp-error');

  if (!desc) { err.textContent = 'Please enter a description.'; return; }
  if (!amount || amount <= 0) { err.textContent = 'Please enter a valid amount.'; return; }
  if (!date) { err.textContent = 'Please select a date.'; return; }

  DB.expenses.push({ id: uid(), description: desc, amount, date, category, notes, createdAt: Date.now() });
  saveDB();
  closeModal('add-expense-modal');
  clearForm(['exp-desc', 'exp-amount', 'exp-notes']);
  err.textContent = '';
  renderExpenses();
  showToast('Expense added successfully', 'success');
}

// ===== INVOICES =====
let invItemCount = 0;

function renderInvoices() {
  const search = (document.getElementById('invoice-search')?.value || '').toLowerCase();
  const statusF = document.getElementById('invoice-status-filter')?.value || '';

  let data = [...DB.invoices].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (search) data = data.filter(r => r.client.toLowerCase().includes(search));
  if (statusF) data = data.filter(r => r.status === statusF);

  // Auto-mark overdue
  const today = new Date().toISOString().split('T')[0];
  data.forEach(inv => {
    if (inv.status === 'Unpaid' && inv.dueDate < today) inv.status = 'Overdue';
  });
  saveDB();

  const cur = DB.settings.currency || 'KES';
  const el = document.getElementById('invoice-list');
  if (data.length === 0) {
    el.innerHTML = '<div class="empty-state">No invoices found</div>';
    return;
  }
  el.innerHTML = data.map(inv => `
    <div class="record-card">
      <div class="record-icon invoice">🧾</div>
      <div class="record-info">
        <div class="record-title">${esc(inv.client)} — INV-${inv.number}</div>
        <div class="record-sub">Due: ${fmtDate(inv.dueDate)} • <span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></div>
      </div>
      <div class="record-amount neutral">${cur} ${fmtNum(inv.total)}</div>
      <div class="record-actions">
        <button class="btn-icon" onclick="viewInvoice('${inv.id}')" title="View">👁</button>
        ${inv.status !== 'Paid' ? `<button class="btn-icon" onclick="markPaid('${inv.id}')" title="Mark Paid">✅</button>` : ''}
        <button class="btn-icon danger" onclick="deleteRecord('invoice','${inv.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');
}

function addInvoiceItem() {
  invItemCount++;
  const id = `item-${invItemCount}`;
  const container = document.getElementById('invoice-items-list');
  const row = document.createElement('div');
  row.className = 'invoice-item-row';
  row.id = id;
  row.innerHTML = `
    <div class="form-group">
      ${invItemCount === 1 ? '<label>Description</label>' : ''}
      <input type="text" placeholder="Item description" oninput="updateInvoiceTotals()"/>
    </div>
    <div class="form-group">
      ${invItemCount === 1 ? '<label>Qty</label>' : ''}
      <input type="number" placeholder="1" min="1" value="1" oninput="updateInvoiceTotals()"/>
    </div>
    <div class="form-group">
      ${invItemCount === 1 ? '<label>Unit Price</label>' : ''}
      <input type="number" placeholder="0.00" step="0.01" min="0" value="0" oninput="updateInvoiceTotals()"/>
    </div>
    <div class="form-group">
      ${invItemCount === 1 ? '<label>Total</label>' : ''}
      <input type="number" placeholder="0.00" readonly id="${id}-total"/>
    </div>
    <button class="del-item" onclick="removeInvoiceItem('${id}')">✕</button>
  `;
  container.appendChild(row);
  updateInvoiceTotals();
}

function removeInvoiceItem(id) {
  document.getElementById(id)?.remove();
  updateInvoiceTotals();
}

function updateInvoiceTotals() {
  const rows = document.querySelectorAll('#invoice-items-list .invoice-item-row');
  let subtotal = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qty = parseFloat(inputs[1]?.value) || 0;
    const price = parseFloat(inputs[2]?.value) || 0;
    const total = qty * price;
    if (inputs[3]) inputs[3].value = total.toFixed(2);
    subtotal += total;
  });
  const taxPct = parseFloat(document.getElementById('inv-tax')?.value) || 0;
  const discPct = parseFloat(document.getElementById('inv-discount')?.value) || 0;
  const taxAmt = subtotal * (taxPct / 100);
  const discAmt = subtotal * (discPct / 100);
  const grand = subtotal + taxAmt - discAmt;
  document.getElementById('inv-subtotal').textContent = fmtNum(subtotal);
  document.getElementById('inv-tax-amt').textContent = fmtNum(taxAmt);
  document.getElementById('inv-discount-amt').textContent = fmtNum(discAmt);
  document.getElementById('inv-total').textContent = fmtNum(grand);
}

function saveInvoice() {
  const client = document.getElementById('inv-client').value.trim();
  const email = document.getElementById('inv-client-email').value.trim();
  const addr = document.getElementById('inv-client-addr').value.trim();
  const date = document.getElementById('inv-date').value;
  const dueDate = document.getElementById('inv-due').value;
  const notes = document.getElementById('inv-notes').value.trim();
  const tax = parseFloat(document.getElementById('inv-tax').value) || 0;
  const discount = parseFloat(document.getElementById('inv-discount').value) || 0;
  const err = document.getElementById('inv-error');

  if (!client) { err.textContent = 'Please enter a client name.'; return; }
  if (!date) { err.textContent = 'Please select an invoice date.'; return; }
  if (!dueDate) { err.textContent = 'Please select a due date.'; return; }

  const rows = document.querySelectorAll('#invoice-items-list .invoice-item-row');
  if (rows.length === 0) { err.textContent = 'Please add at least one item.'; return; }

  const items = [];
  let subtotal = 0;
  let valid = true;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const desc = inputs[0]?.value.trim();
    const qty = parseFloat(inputs[1]?.value) || 0;
    const price = parseFloat(inputs[2]?.value) || 0;
    if (!desc || qty <= 0) { valid = false; return; }
    const total = qty * price;
    items.push({ desc, qty, price, total });
    subtotal += total;
  });
  if (!valid) { err.textContent = 'Please fill all item descriptions and quantities.'; return; }

  const taxAmt = subtotal * (tax / 100);
  const discAmt = subtotal * (discount / 100);
  const grand = subtotal + taxAmt - discAmt;

  const invoiceNumber = (DB.invoices.length + 1).toString().padStart(4, '0');
  const inv = {
    id: uid(), number: invoiceNumber, client, email, address: addr,
    date, dueDate, items, subtotal, tax, taxAmt, discount, discAmt,
    total: grand, notes, status: 'Unpaid', createdAt: Date.now()
  };
  DB.invoices.push(inv);
  saveDB();
  closeModal('add-invoice-modal');
  clearInvoiceForm();
  err.textContent = '';
  renderInvoices();
  showToast('Invoice created successfully', 'success');
}

function clearInvoiceForm() {
  ['inv-client','inv-client-email','inv-client-addr','inv-date','inv-due','inv-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('inv-tax').value = '0';
  document.getElementById('inv-discount').value = '0';
  document.getElementById('invoice-items-list').innerHTML = '';
  invItemCount = 0;
  updateInvoiceTotals();
}

function viewInvoice(id) {
  const inv = DB.invoices.find(i => i.id === id);
  if (!inv) return;
  currentInvoiceId = id;
  const s = DB.settings;
  const cur = s.currency || 'KES';

  const html = `
    <div class="invoice-preview" id="inv-print-area">
      <div class="inv-pre-header">
        <div class="inv-pre-from">
          <strong>${esc(s.bizName || 'Business Name')}</strong>
          ${s.bizAddress ? esc(s.bizAddress) + '<br>' : ''}
          ${s.bizPhone ? esc(s.bizPhone) + '<br>' : ''}
          ${s.bizEmail ? esc(s.bizEmail) : ''}
        </div>
        <div class="inv-pre-badge">
          <div class="inv-number">INVOICE</div>
          <h2>#${inv.number}</h2>
        </div>
      </div>
      <div class="inv-pre-dates">
        <div>Date: <span>${fmtDate(inv.date)}</span></div>
        <div>Due: <span style="color:${inv.status==='Overdue'?'var(--danger)':'inherit'}">${fmtDate(inv.dueDate)}</span></div>
        <div>Status: <span class="badge badge-${inv.status.toLowerCase()}">${inv.status}</span></div>
      </div>
      <div class="inv-pre-to">
        <strong>Bill To:</strong>
        ${esc(inv.client)}<br>
        ${inv.address ? esc(inv.address) + '<br>' : ''}
        ${inv.email ? esc(inv.email) : ''}
      </div>
      <table class="inv-pre-items">
        <thead><tr>
          <th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th>
        </tr></thead>
        <tbody>
          ${inv.items.map(item => `
            <tr>
              <td>${esc(item.desc)}</td>
              <td>${item.qty}</td>
              <td>${cur} ${fmtNum(item.price)}</td>
              <td>${cur} ${fmtNum(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="inv-pre-totals">
        <div>Subtotal: ${cur} ${fmtNum(inv.subtotal)}</div>
        ${inv.tax > 0 ? `<div>Tax (${inv.tax}%): ${cur} ${fmtNum(inv.taxAmt)}</div>` : ''}
        ${inv.discount > 0 ? `<div>Discount (${inv.discount}%): -${cur} ${fmtNum(inv.discAmt)}</div>` : ''}
        <div class="grand">Total: ${cur} ${fmtNum(inv.total)}</div>
      </div>
      ${inv.notes ? `<div class="inv-pre-notes"><strong>Notes/Terms:</strong><br>${esc(inv.notes)}</div>` : ''}
      <div class="inv-pre-footer">Thank you for your business — ${esc(s.bizName || '')}</div>
    </div>
  `;
  document.getElementById('invoice-preview-content').innerHTML = html;
  openModal('view-invoice-modal');
}

function markPaid(id) {
  const inv = DB.invoices.find(i => i.id === id);
  if (inv) { inv.status = 'Paid'; saveDB(); renderInvoices(); showToast('Invoice marked as paid', 'success'); }
}

function downloadInvoicePDF() {
  if (!navigator.onLine) {
    showToast('Please connect to the internet to download PDF', 'error');
    return;
  }
  const inv = DB.invoices.find(i => i.id === currentInvoiceId);
  if (!inv) return;
  generateInvoicePDF(inv);
}

function shareInvoice() {
  const inv = DB.invoices.find(i => i.id === currentInvoiceId);
  if (!inv) return;
  const s = DB.settings;
  const cur = s.currency || 'KES';
  const text = `Invoice #${inv.number} from ${s.bizName || 'Business'}\nClient: ${inv.client}\nAmount: ${cur} ${fmtNum(inv.total)}\nDue: ${fmtDate(inv.dueDate)}\nStatus: ${inv.status}`;
  if (navigator.share) {
    navigator.share({ title: `Invoice #${inv.number}`, text });
  } else {
    navigator.clipboard.writeText(text).then(() => showToast('Invoice details copied to clipboard', 'success'));
  }
}

// ===== INVENTORY =====
function renderInventory() {
  const search = (document.getElementById('inventory-search')?.value || '').toLowerCase();
  const catF = document.getElementById('inv-category-filter')?.value || '';
  const lowOnly = document.getElementById('low-stock-only')?.checked;
  const threshold = DB.settings.lowStockThreshold || 10;

  let data = [...DB.inventory];
  if (search) data = data.filter(p => p.name.toLowerCase().includes(search) || (p.sku||'').toLowerCase().includes(search));
  if (catF) data = data.filter(p => p.category === catF);
  if (lowOnly) data = data.filter(p => p.qty <= threshold);

  // Populate category filter
  const cats = [...new Set(DB.inventory.map(p => p.category).filter(Boolean))];
  const catEl = document.getElementById('inv-category-filter');
  const currentCat = catEl.value;
  catEl.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${esc(c)}" ${c === currentCat ? 'selected' : ''}>${esc(c)}</option>`).join('');

  // Datalist for stock form
  const dl = document.getElementById('stk-cats');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');

  const el = document.getElementById('inventory-list');
  const cur = DB.settings.currency || 'KES';

  if (data.length === 0) {
    el.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No products found</div>';
    return;
  }

  el.innerHTML = data.map(p => {
    const alertAt = p.alertAt || threshold;
    const isLow = p.qty <= alertAt && p.qty > 0;
    const isOut = p.qty === 0;
    return `
      <div class="stock-card ${isOut ? 'out-stock' : isLow ? 'low-stock' : ''}">
        ${isOut ? '<div class="stock-alert-badge">OUT OF STOCK</div>' : isLow ? '<div class="stock-alert-badge">LOW STOCK</div>' : ''}
        <div class="stock-name">${esc(p.name)}</div>
        <div class="stock-sku">${p.sku ? 'SKU: ' + esc(p.sku) : p.category || ''}</div>
        <div class="stock-qty">${p.qty} <span class="stock-unit">${p.unit || 'pcs'}</span></div>
        <div class="stock-prices">
          ${p.buyPrice ? `<div class="stock-price-item">Buy: <span>${cur} ${fmtNum(p.buyPrice)}</span></div>` : ''}
          ${p.sellPrice ? `<div class="stock-price-item">Sell: <span>${cur} ${fmtNum(p.sellPrice)}</span></div>` : ''}
        </div>
        <div class="stock-card-actions">
          <button class="btn-primary btn-sm" onclick="openSellModal('${p.id}')">Sell</button>
          <button class="btn-secondary btn-sm" onclick="editStock('${p.id}')">Edit</button>
          <button class="btn-icon danger" onclick="deleteRecord('inventory','${p.id}')">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function saveStock() {
  const name = document.getElementById('stk-name').value.trim();
  const sku = document.getElementById('stk-sku').value.trim();
  const category = document.getElementById('stk-category').value.trim();
  const qty = parseInt(document.getElementById('stk-qty').value);
  const unit = document.getElementById('stk-unit').value.trim() || 'pcs';
  const buyPrice = parseFloat(document.getElementById('stk-buy').value) || 0;
  const sellPrice = parseFloat(document.getElementById('stk-sell').value) || 0;
  const alertAt = parseInt(document.getElementById('stk-alert').value) || null;
  const editId = document.getElementById('stock-edit-id').value;
  const err = document.getElementById('stk-error');

  if (!name) { err.textContent = 'Please enter a product name.'; return; }
  if (isNaN(qty) || qty < 0) { err.textContent = 'Please enter a valid quantity.'; return; }

  if (editId) {
    const p = DB.inventory.find(p => p.id === editId);
    if (p) { p.name = name; p.sku = sku; p.category = category; p.qty = qty; p.unit = unit; p.buyPrice = buyPrice; p.sellPrice = sellPrice; if (alertAt) p.alertAt = alertAt; }
  } else {
    DB.inventory.push({ id: uid(), name, sku, category, qty, unit, buyPrice, sellPrice, alertAt, createdAt: Date.now() });
  }
  saveDB();
  closeModal('add-stock-modal');
  clearForm(['stk-name','stk-sku','stk-category','stk-qty','stk-unit','stk-buy','stk-sell','stk-alert']);
  document.getElementById('stock-edit-id').value = '';
  document.getElementById('stock-modal-title').textContent = 'Add Product';
  err.textContent = '';
  renderInventory();
  checkLowStock();
  showToast(editId ? 'Product updated' : 'Product added', 'success');
}

function editStock(id) {
  const p = DB.inventory.find(p => p.id === id);
  if (!p) return;
  document.getElementById('stock-edit-id').value = p.id;
  document.getElementById('stock-modal-title').textContent = 'Edit Product';
  document.getElementById('stk-name').value = p.name;
  document.getElementById('stk-sku').value = p.sku || '';
  document.getElementById('stk-category').value = p.category || '';
  document.getElementById('stk-qty').value = p.qty;
  document.getElementById('stk-unit').value = p.unit || 'pcs';
  document.getElementById('stk-buy').value = p.buyPrice || '';
  document.getElementById('stk-sell').value = p.sellPrice || '';
  document.getElementById('stk-alert').value = p.alertAt || '';
  openModal('add-stock-modal');
}

function openSellModal(id) {
  const p = DB.inventory.find(p => p.id === id);
  if (!p) return;
  document.getElementById('sell-stock-id').value = id;
  document.getElementById('sell-stock-name').textContent = `📦 ${p.name} (${p.qty} ${p.unit || 'pcs'} in stock)`;
  document.getElementById('sell-price').value = p.sellPrice || '';
  document.getElementById('sell-qty').value = 1;
  document.getElementById('sell-date').value = today();
  document.getElementById('sell-customer').value = '';
  document.getElementById('sell-error').textContent = '';
  openModal('sell-stock-modal');
}

function confirmSale() {
  const id = document.getElementById('sell-stock-id').value;
  const qty = parseInt(document.getElementById('sell-qty').value);
  const price = parseFloat(document.getElementById('sell-price').value) || 0;
  const date = document.getElementById('sell-date').value;
  const customer = document.getElementById('sell-customer').value.trim();
  const err = document.getElementById('sell-error');

  const p = DB.inventory.find(p => p.id === id);
  if (!p) return;
  if (!qty || qty <= 0) { err.textContent = 'Enter a valid quantity.'; return; }
  if (qty > p.qty) { err.textContent = `Only ${p.qty} ${p.unit || 'pcs'} in stock.`; return; }

  // Deduct stock
  p.qty -= qty;

  // Record as income
  const total = qty * price;
  if (total > 0) {
    const desc = `Sale: ${p.name} x${qty}${customer ? ' to ' + customer : ''}`;
    DB.income.push({ id: uid(), description: desc, amount: total, date: date || today(), category: 'Sales', notes: '', createdAt: Date.now() });
  }

  saveDB();
  closeModal('sell-stock-modal');
  renderInventory();
  checkLowStock();
  showToast(`Sold ${qty} ${p.unit || 'pcs'} of ${p.name}`, 'success');
}

// ===== LOW STOCK ALERTS =====
function checkLowStock() {
  const threshold = DB.settings.lowStockThreshold || 10;
  const lowItems = DB.inventory.filter(p => p.qty <= (p.alertAt || threshold));
  updateNotifBadge(lowItems.length);

  const list = document.getElementById('notif-list');
  if (list) {
    if (lowItems.length === 0) {
      list.innerHTML = '<div style="font-size:0.85rem;color:var(--text-muted)">No alerts at this time</div>';
    } else {
      list.innerHTML = lowItems.map(p => `
        <div class="notif-item">
          ⚠ <strong>${esc(p.name)}</strong> — ${p.qty === 0 ? 'OUT OF STOCK' : `Only ${p.qty} ${p.unit || 'pcs'} left`}
        </div>
      `).join('');
    }
  }
}

function updateNotifBadge(count) {
  const threshold = DB.settings.lowStockThreshold || 10;
  const n = count !== undefined ? count : DB.inventory.filter(p => p.qty <= (p.alertAt || threshold)).length;
  const badge = document.getElementById('notif-count');
  if (badge) {
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notif-panel');
  panel?.classList.toggle('hidden');
  checkLowStock();
}

// ===== REPORTS =====
function generateReport() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  const type = document.getElementById('report-type').value;
  const cur = DB.settings.currency || 'KES';
  const bizName = DB.settings.bizName || 'Business';
  const output = document.getElementById('report-output');

  if (!from || !to) { output.innerHTML = '<div class="empty-state">Please select both From and To dates</div>'; return; }

  const inRange = (d) => d >= from && d <= to;

  if (type === 'pl') {
    const income = DB.income.filter(r => inRange(r.date));
    const expenses = DB.expenses.filter(r => inRange(r.date));
    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expenses.reduce((s, r) => s + r.amount, 0);
    const profit = totalIncome - totalExpense;

    // Group by category
    const incCats = groupBy(income, 'category');
    const expCats = groupBy(expenses, 'category');

    output.innerHTML = `
      <div class="report-title">${esc(bizName)} — Profit & Loss Report</div>
      <div class="report-meta">${fmtDate(from)} to ${fmtDate(to)} | Generated: ${new Date().toLocaleDateString()}</div>
      <h4 style="margin-bottom:8px;color:var(--success)">Income</h4>
      <table class="report-table">
        <thead><tr><th>Category</th><th>Transactions</th><th>Amount</th></tr></thead>
        <tbody>
          ${Object.entries(incCats).map(([cat, items]) => `
            <tr><td>${esc(cat)}</td><td>${items.length}</td><td>${cur} ${fmtNum(items.reduce((s,r)=>s+r.amount,0))}</td></tr>
          `).join('')}
          <tr class="report-total-row"><td><strong>Total Income</strong></td><td><strong>${income.length}</strong></td><td><strong>${cur} ${fmtNum(totalIncome)}</strong></td></tr>
        </tbody>
      </table>
      <h4 style="margin:20px 0 8px;color:var(--danger)">Expenses</h4>
      <table class="report-table">
        <thead><tr><th>Category</th><th>Transactions</th><th>Amount</th></tr></thead>
        <tbody>
          ${Object.entries(expCats).map(([cat, items]) => `
            <tr><td>${esc(cat)}</td><td>${items.length}</td><td>${cur} ${fmtNum(items.reduce((s,r)=>s+r.amount,0))}</td></tr>
          `).join('')}
          <tr class="report-total-row"><td><strong>Total Expenses</strong></td><td><strong>${expenses.length}</strong></td><td><strong>${cur} ${fmtNum(totalExpense)}</strong></td></tr>
        </tbody>
      </table>
      <div style="margin-top:20px;padding:16px;background:${profit>=0?'var(--success-light)':'var(--danger-light)'};border-radius:var(--radius-sm)">
        <strong style="font-size:1.1rem;color:${profit>=0?'var(--success)':'var(--danger)'}">
          Net ${profit >= 0 ? 'Profit' : 'Loss'}: ${cur} ${fmtNum(Math.abs(profit))}
        </strong>
      </div>
    `;
  } else if (type === 'income') {
    const income = DB.income.filter(r => inRange(r.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const total = income.reduce((s,r)=>s+r.amount,0);
    output.innerHTML = `
      <div class="report-title">${esc(bizName)} — Income Report</div>
      <div class="report-meta">${fmtDate(from)} to ${fmtDate(to)}</div>
      <table class="report-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>
          ${income.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(r.description)}</td><td>${r.category}</td><td>${cur} ${fmtNum(r.amount)}</td></tr>`).join('')}
          <tr class="report-total-row"><td colspan="3"><strong>Total</strong></td><td><strong>${cur} ${fmtNum(total)}</strong></td></tr>
        </tbody>
      </table>
    `;
  } else if (type === 'expense') {
    const expenses = DB.expenses.filter(r => inRange(r.date)).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const total = expenses.reduce((s,r)=>s+r.amount,0);
    output.innerHTML = `
      <div class="report-title">${esc(bizName)} — Expense Report</div>
      <div class="report-meta">${fmtDate(from)} to ${fmtDate(to)}</div>
      <table class="report-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead>
        <tbody>
          ${expenses.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(r.description)}</td><td>${r.category}</td><td>${cur} ${fmtNum(r.amount)}</td></tr>`).join('')}
          <tr class="report-total-row"><td colspan="3"><strong>Total</strong></td><td><strong>${cur} ${fmtNum(total)}</strong></td></tr>
        </tbody>
      </table>
    `;
  } else if (type === 'inventory') {
    const cur = DB.settings.currency || 'KES';
    const inv = [...DB.inventory].sort((a,b)=>a.name.localeCompare(b.name));
    const threshold = DB.settings.lowStockThreshold || 10;
    output.innerHTML = `
      <div class="report-title">${esc(bizName)} — Inventory Report</div>
      <div class="report-meta">As of ${new Date().toLocaleDateString()}</div>
      <table class="report-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Stock</th><th>Buy Price</th><th>Sell Price</th><th>Stock Value</th><th>Status</th></tr></thead>
        <tbody>
          ${inv.map(p => {
            const val = p.qty * (p.buyPrice || 0);
            const alertAt = p.alertAt || threshold;
            const status = p.qty === 0 ? '<span class="badge badge-overdue">Out</span>' : p.qty <= alertAt ? '<span class="badge badge-unpaid">Low</span>' : '<span class="badge badge-paid">OK</span>';
            return `<tr><td>${esc(p.name)}</td><td>${p.sku||'-'}</td><td>${p.category||'-'}</td><td>${p.qty} ${p.unit||'pcs'}</td><td>${p.buyPrice?cur+' '+fmtNum(p.buyPrice):'-'}</td><td>${p.sellPrice?cur+' '+fmtNum(p.sellPrice):'-'}</td><td>${cur} ${fmtNum(val)}</td><td>${status}</td></tr>`;
          }).join('')}
          <tr class="report-total-row"><td colspan="6"><strong>Total Inventory Value</strong></td><td colspan="2"><strong>${cur} ${fmtNum(inv.reduce((s,p)=>s+p.qty*(p.buyPrice||0),0))}</strong></td></tr>
        </tbody>
      </table>
    `;
  }
}

function downloadReport() {
  if (!navigator.onLine) {
    showToast('Please connect to the internet to download PDF reports', 'error');
    return;
  }
  const reportOutput = document.getElementById('report-output');
  if (reportOutput.querySelector('.empty-state')) {
    generateReport();
  }
  generateReportPDF();
}

// ===== DELETE =====
function deleteRecord(type, id) {
  pendingDelete = { type, id };
  const labels = { income: 'income record', expense: 'expense record', invoice: 'invoice', inventory: 'product' };
  document.getElementById('delete-msg').textContent = `Are you sure you want to delete this ${labels[type] || 'record'}? This action cannot be undone.`;
  openModal('delete-modal');
}

function executeDelete() {
  if (!pendingDelete) return;
  const { type, id } = pendingDelete;
  if (type === 'income') DB.income = DB.income.filter(r => r.id !== id);
  else if (type === 'expense') DB.expenses = DB.expenses.filter(r => r.id !== id);
  else if (type === 'invoice') DB.invoices = DB.invoices.filter(r => r.id !== id);
  else if (type === 'inventory') DB.inventory = DB.inventory.filter(r => r.id !== id);
  saveDB();
  closeModal('delete-modal');
  pendingDelete = null;
  showToast('Record deleted', 'success');
  // Re-render current page
  const active = document.querySelector('.page.active');
  if (active) {
    const map = { 'page-income': 'income', 'page-expenses': 'expenses', 'page-invoices': 'invoices', 'page-inventory': 'inventory', 'page-dashboard': 'dashboard' };
    const page = map[active.id];
    if (page) navigate(page);
  }
}

// ===== SETTINGS =====
function loadSettings() {
  const s = DB.settings;
  document.getElementById('set-biz-name').value = s.bizName || '';
  document.getElementById('set-biz-address').value = s.bizAddress || '';
  document.getElementById('set-biz-phone').value = s.bizPhone || '';
  document.getElementById('set-biz-email').value = s.bizEmail || '';
  document.getElementById('set-currency').value = s.currency || 'KES';
  document.getElementById('set-low-stock').value = s.lowStockThreshold || 10;
}

function saveSettings() {
  DB.settings.bizName = document.getElementById('set-biz-name').value.trim();
  DB.settings.bizAddress = document.getElementById('set-biz-address').value.trim();
  DB.settings.bizPhone = document.getElementById('set-biz-phone').value.trim();
  DB.settings.bizEmail = document.getElementById('set-biz-email').value.trim();
  DB.settings.currency = document.getElementById('set-currency').value.trim() || 'KES';
  DB.settings.lowStockThreshold = parseInt(document.getElementById('set-low-stock').value) || 10;
  saveDB();
  document.getElementById('sidebar-biz-name').textContent = DB.settings.bizName;
  document.getElementById('pin-biz-name').textContent = DB.settings.bizName;
  showToast('Settings saved', 'success');
}

function changePin() {
  const newPin = document.getElementById('set-new-pin').value.trim();
  const newPin2 = document.getElementById('set-new-pin2').value.trim();
  const adminPass = document.getElementById('set-admin-verify').value;

  if (hashString(adminPass) !== DB.settings.adminHash) { showToast('Incorrect admin password', 'error'); return; }
  if (!newPin || newPin.length < 4 || !/^\d+$/.test(newPin)) { showToast('PIN must be 4-6 digits', 'error'); return; }
  if (newPin !== newPin2) { showToast('PINs do not match', 'error'); return; }

  DB.settings.pinHash = hashString(newPin);
  DB.settings.pinLength = newPin.length;
  saveDB();
  document.getElementById('set-new-pin').value = '';
  document.getElementById('set-new-pin2').value = '';
  document.getElementById('set-admin-verify').value = '';
  showToast('PIN updated successfully', 'success');
}

function exportData() {
  const data = JSON.stringify(DB, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bizledger-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported', 'success');
}

function confirmReset() {
  const pass = prompt('Enter admin password to factory reset:');
  if (!pass) return;
  if (hashString(pass) !== DB.settings.adminHash) { showToast('Incorrect admin password', 'error'); return; }
  const confirm = window.confirm('WARNING: This will delete ALL data permanently. This cannot be undone. Are you absolutely sure?');
  if (!confirm) return;
  localStorage.removeItem('bizledger_db');
  location.reload();
}

// ===== PDF GENERATION =====
function generateInvoicePDF(inv) {
  const s = DB.settings;
  const cur = s.currency || 'KES';
  const win = window.open('', '_blank');
  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Invoice #${inv.number}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #0f2942; font-size: 13px; }
      h1 { font-size: 28px; color: #1a6ef5; margin: 0; }
      .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
      .from strong { font-size: 16px; display: block; margin-bottom: 4px; }
      .badge { font-size: 11px; color: #7a94b0; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { background: #0f2942; color: white; padding: 8px 12px; text-align: left; }
      td { padding: 8px 12px; border-bottom: 1px solid #dde4ef; }
      .totals { text-align: right; margin-top: 8px; }
      .grand { font-size: 15px; font-weight: bold; border-top: 2px solid #1a6ef5; padding-top: 6px; color: #0f2942; }
      .to-box { background: #f0f4fa; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
      .dates { display: flex; gap: 20px; margin-bottom: 16px; }
      .notes { border-top: 1px solid #dde4ef; padding-top: 14px; margin-top: 16px; font-size: 11px; color: #4a6080; }
      .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #7a94b0; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="header">
      <div class="from">
        <strong>${esc(s.bizName || 'Business Name')}</strong>
        ${s.bizAddress ? esc(s.bizAddress) + '<br>' : ''}
        ${s.bizPhone ? esc(s.bizPhone) + '<br>' : ''}
        ${s.bizEmail ? esc(s.bizEmail) : ''}
      </div>
      <div>
        <div class="badge">INVOICE</div>
        <h1>#${inv.number}</h1>
      </div>
    </div>
    <div class="dates">
      <div>Invoice Date: <strong>${fmtDate(inv.date)}</strong></div>
      <div>Due Date: <strong>${fmtDate(inv.dueDate)}</strong></div>
      <div>Status: <strong>${inv.status}</strong></div>
    </div>
    <div class="to-box"><strong>Bill To:</strong><br>${esc(inv.client)}<br>${inv.address?esc(inv.address)+'<br>':''}${inv.email?esc(inv.email):''}</div>
    <table>
      <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${inv.items.map(i=>`<tr><td>${esc(i.desc)}</td><td>${i.qty}</td><td>${cur} ${fmtNum(i.price)}</td><td>${cur} ${fmtNum(i.total)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="totals">
      <div>Subtotal: ${cur} ${fmtNum(inv.subtotal)}</div>
      ${inv.tax>0?`<div>Tax (${inv.tax}%): ${cur} ${fmtNum(inv.taxAmt)}</div>`:''}
      ${inv.discount>0?`<div>Discount (${inv.discount}%): -${cur} ${fmtNum(inv.discAmt)}</div>`:''}
      <div class="grand">TOTAL: ${cur} ${fmtNum(inv.total)}</div>
    </div>
    ${inv.notes?`<div class="notes"><strong>Notes/Terms:</strong><br>${esc(inv.notes)}</div>`:''}
    <div class="footer">Thank you for your business — ${esc(s.bizName||'')}</div>
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`;
  win.document.write(html);
  win.document.close();
}

function generateReportPDF() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  const type = document.getElementById('report-type').value;
  const content = document.getElementById('report-output').innerHTML;
  const s = DB.settings;

  const win = window.open('', '_blank');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${s.bizName || 'Business'} Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 30px; color: #0f2942; font-size: 12px; }
      .report-title { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
      .report-meta { font-size: 11px; color: #7a94b0; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0 20px; }
      th { background: #0f2942; color: white; padding: 7px 10px; text-align: left; }
      td { padding: 7px 10px; border-bottom: 1px solid #dde4ef; }
      .report-total-row td { font-weight: bold; background: #e8f0fe; color: #1a6ef5; }
      h4 { margin: 14px 0 6px; }
      @media print { body { padding: 15px; } }
    </style></head><body>${content}
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`;
  win.document.write(html);
  win.document.close();
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.getElementById('modal-backdrop').classList.remove('hidden');
  if (id === 'add-invoice-modal') {
    const list = document.getElementById('invoice-items-list');
    if (list && list.children.length === 0) {
      setTimeout(addInvoiceItem, 50);
    }
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  const anyOpen = document.querySelectorAll('.modal:not(.hidden)');
  if (anyOpen.length === 0) {
    document.getElementById('modal-backdrop').classList.add('hidden');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-backdrop').classList.add('hidden');
}

// ===== FILTER HELPERS =====
function filterList(type) {
  if (type === 'income') renderIncome();
  if (type === 'expense') renderExpenses();
}

function filterInvoices() { renderInvoices(); }
function filterInventory() { renderInventory(); }

function populateFilterDropdowns() {
  const months = new Set();
  [...DB.income, ...DB.expenses].forEach(r => { if (r.date) months.add(r.date.slice(0, 7)); });
  const sorted = [...months].sort().reverse();
  const opts = '<option value="">All Months</option>' + sorted.map(m => {
    const [y, mo] = m.split('-');
    const d = new Date(y, mo - 1);
    return `<option value="${m}">${d.toLocaleString('default', { month: 'long' })} ${y}</option>`;
  }).join('');
  document.getElementById('income-month-filter').innerHTML = opts;
  document.getElementById('expense-month-filter').innerHTML = opts;
}

// ===== CONNECTIVITY =====
function monitorConnection() {
  const update = () => {
    const badge = document.getElementById('connection-badge');
    const text = document.getElementById('conn-text');
    if (navigator.onLine) {
      badge?.classList.remove('offline');
      if (text) text.textContent = 'Online';
    } else {
      badge?.classList.add('offline');
      if (text) text.textContent = 'Offline';
    }
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ===== PREFILL DATES =====
function prefillDates() {
  const t = today();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('inc-date', t);
  setVal('exp-date', t);
  setVal('inv-date', t);
  const due = new Date(); due.setDate(due.getDate() + 30);
  setVal('inv-due', due.toISOString().split('T')[0]);
  const firstDay = new Date(); firstDay.setDate(1);
  setVal('report-from', firstDay.toISOString().split('T')[0]);
  setVal('report-to', t);
}

// ===== TOAST =====
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ===== UTILITY =====
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16) + str.length.toString(16);
}

function fmtNum(n) {
  return (n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function clearForm(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Other';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ===== OPEN INVOICE MODAL INIT =====
document.getElementById('add-invoice-modal')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal('add-invoice-modal');
});

// Auto-add first item when invoice modal opens
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});
