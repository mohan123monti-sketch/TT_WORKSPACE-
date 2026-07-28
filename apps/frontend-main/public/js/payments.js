(function () {
  // No hardcoded fallback — payments are loaded from the DB only

  let paymentState = [];
  let activePeriodDays = 30;

  function money(amount, currency = 'INR') {
    const symbol = currency === 'USD' ? '$' : '₹';
    return symbol + Number(amount || 0).toLocaleString('en-IN');
  }

  function normalizePayment(row, index) {
    return {
      id: row.id || row.payment_id || `PAY-${String(index + 1).padStart(4, '0')}`,
      user: row.client_company || row.client_name || row.user_name || row.client || row.user_id || 'Client',
      amount: Number(row.amount || row.total || 0),
      currency: row.currency || 'INR',
      method: row.method || row.payment_method || 'UPI',
      status: String(row.status || row.computed_status || 'pending').toLowerCase(),
      date: row.date || row.payment_date || row.created_at || new Date().toISOString(),
      source: row.source || 'employee_portal',
      client_id: row.client_id || null
    };
  }

  function parsePaymentDate(value) {
    if (!value) return new Date();
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const match = String(value).match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
    if (!match) return new Date();

    const months = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11
    };
    const month = months[match[2].toLowerCase()];
    return month === undefined ? new Date() : new Date(Number(match[3]), month, Number(match[1]));
  }

  function isWithinActivePeriod(payment) {
    const paymentDate = parsePaymentDate(payment.date);
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - activePeriodDays + 1);
    return paymentDate >= cutoff && paymentDate <= now;
  }

  function closeOldPaymentModal() {
    document.querySelectorAll('.modal, .modal-overlay, [id*="payment"], [class*="payment"]').forEach((el) => {
      const text = (el.textContent || '').toLowerCase();
      if (text.includes('add payment') && text.includes('amount') && text.includes('method')) {
        el.remove();
      }
    });
    document.body.style.overflow = '';
  }

  function styles() {
    if (document.getElementById('payment-dashboard-style')) return;
    const style = document.createElement('style');
    style.id = 'payment-dashboard-style';
    style.textContent = `
      .payment-dashboard-page { padding: 34px 28px 42px; background:#f8fafc; min-height:calc(100vh - 78px); color:#111827; }
      .payment-title-row { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin-bottom:28px; }
      .payment-kicker { color:#94a3b8; font-size:.92rem; font-weight:700; margin-bottom:6px; }
      .payment-title { margin:0; font-size:2rem; line-height:1.05; font-weight:900; letter-spacing:0; }
      .payment-tabs { display:inline-flex; background:#fff; border:2px solid rgba(16,42,150,.12); border-radius:8px; overflow:hidden; }
      .payment-tabs button { border:0; background:transparent; padding:11px 14px; font-weight:800; color:#64748b; cursor:pointer; }
      .payment-tabs button.active { background:#102a96; color:#fff; }
      .payment-metrics { display:grid; grid-template-columns:repeat(5,minmax(150px,1fr)); gap:12px; margin-bottom:28px; }
      .payment-metric { background:#fff; border:2px solid rgba(16,42,150,.08); border-radius:8px; padding:16px; min-height:110px; box-sizing:border-box; position:relative; overflow:hidden; }
      .payment-metric::after { content:""; position:absolute; right:14px; bottom:12px; width:54px; height:54px; border-radius:50%; background:rgba(16,42,150,.06); }
      .payment-metric.revenue { background:#fff6ed; } .payment-metric.paid { background:#eefdf3; } .payment-metric.pending { background:#fff8e8; } .payment-metric.overdue { background:#fff1f2; }
      .payment-label { color:#475569; font-weight:800; margin-bottom:8px; }
      .payment-value { font-size:2rem; font-weight:900; color:#0f172a; line-height:1; margin-bottom:10px; }
      .payment-sub { color:#64748b; font-size:.88rem; font-weight:650; }
      .payment-grid { display:grid; grid-template-columns:minmax(0,1.6fr) minmax(320px,.8fr); gap:18px; margin-bottom:18px; }
      .payment-lower { display:grid; grid-template-columns:minmax(360px,1fr) minmax(320px,.8fr); gap:18px; }
      .payment-panel { background:#fff; border:2px solid rgba(16,42,150,.08); border-radius:8px; padding:20px; box-sizing:border-box; overflow:hidden; }
      .payment-panel-head { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; }
      .payment-panel-title { margin:0; font-size:1.15rem; font-weight:900; color:#0f766e; }
      .payment-note { color:#94a3b8; font-size:.85rem; font-weight:700; }
      .payment-chart { height:310px; position:relative; border-top:2px solid #e5e7eb; padding-top:16px; }
      .payment-chart svg { width:100%; height:100%; display:block; }
      .payment-donut-wrap { display:grid; place-items:center; min-height:310px; }
      .payment-donut { width:220px; height:220px; border-radius:50%; background:conic-gradient(#16a34a 0 62%, #f59e0b 62% 84%, #ef4444 84% 100%); display:grid; place-items:center; }
      .payment-donut-inner { width:128px; height:128px; background:#fff; border-radius:50%; display:grid; place-items:center; text-align:center; font-weight:900; }
      .payment-legend { display:grid; gap:10px; width:100%; margin-top:14px; }
      .payment-legend-row { display:flex; align-items:center; justify-content:space-between; color:#475569; font-weight:750; }
      .payment-dot { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:8px; }
      .payment-table { width:100%; border-collapse:collapse; }
      .payment-table th,.payment-table td { padding:14px 12px; border-bottom:1px solid #e5e7eb; text-align:left; vertical-align:middle; }
      .payment-table th { color:#64748b; font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; }
      .payment-table td { font-weight:750; color:#0f172a; }
      .payment-pill { display:inline-flex; align-items:center; justify-content:center; min-width:76px; border-radius:999px; padding:7px 10px; font-size:.72rem; font-weight:900; text-transform:uppercase; cursor:pointer; user-select:none; transition: opacity 0.2s; }
      .payment-pill:hover { opacity:0.8; }
      .payment-pill.paid { color:#15803d; background:#dcfce7; } .payment-pill.pending { color:#b45309; background:#fef3c7; } .payment-pill.overdue { color:#b91c1c; background:#fee2e2; }
      .payment-form { display:grid; gap:12px; }
      .payment-form input,.payment-form select { width:100%; min-height:42px; border:2px solid rgba(16,42,150,.12); border-radius:8px; padding:0 12px; box-sizing:border-box; outline:0; font-size:.95rem; }
      .payment-form input:focus,.payment-form select:focus { border-color:#102a96; }
      .payment-btn { border:0; border-radius:8px; min-height:42px; padding:0 16px; display:inline-flex; align-items:center; justify-content:center; gap:9px; font-weight:900; cursor:pointer; color:#fff; background:#102a96; box-shadow:0 14px 28px rgba(16,42,150,.2); }
      .payment-bars { display:grid; gap:14px; margin-top:16px; }
      .payment-bar-row { display:grid; grid-template-columns:90px 1fr 56px; gap:12px; align-items:center; color:#475569; font-weight:800; font-size:0.85rem; }
      .payment-track { height:12px; border-radius:999px; background:#eef2ff; overflow:hidden; }
      .payment-fill { height:100%; border-radius:inherit; display:block; transition: width 0.5s ease; }
      .action-btn { background:transparent; border:none; color:#dc2626; cursor:pointer; padding:6px; border-radius:4px; font-size:1.1rem; }
      .action-btn:hover { background:#fee2e2; }
      @media(max-width:1100px){ .payment-metrics{grid-template-columns:repeat(2,minmax(0,1fr));} .payment-grid,.payment-lower{grid-template-columns:1fr;} }
      @media(max-width:640px){ .payment-dashboard-page{padding:24px 16px;} .payment-title-row{align-items:flex-start; flex-direction:column;} .payment-metrics{grid-template-columns:1fr;} .payment-table{min-width:680px;} .payment-table-scroll{overflow-x:auto;} }
    `;
    document.head.appendChild(style);
  }

  function dashboardHtml() {
    return `
      <section class="payment-dashboard-page">
        <div class="payment-title-row">
          <div>
            <div class="payment-kicker">Workspace / Finance</div>
            <h1 class="payment-title">PAYMENT DASHBOARD</h1>
          </div>
          <div class="payment-tabs" aria-label="Payment period">
            <button type="button" data-days="7">7 Days</button>
            <button type="button" data-days="30" class="active">30 Days</button>
            <button type="button" data-days="90">Quarter</button>
            <button type="button" data-days="365">Year</button>
          </div>
        </div>
        <div class="payment-metrics">
          <div class="payment-metric revenue"><div class="payment-label">Revenue (Paid)</div><div class="payment-value" id="metric-revenue">₹0</div><div class="payment-sub">In selected period</div></div>
          <div class="payment-metric paid"><div class="payment-label">Paid Records</div><div class="payment-value" id="metric-paid">0</div><div class="payment-sub">Cleared invoices</div></div>
          <div class="payment-metric pending"><div class="payment-label">Pending</div><div class="payment-value" id="metric-pending">0</div><div class="payment-sub">Awaiting clearing</div></div>
          <div class="payment-metric overdue"><div class="payment-label">Overdue</div><div class="payment-value" id="metric-overdue">0</div><div class="payment-sub">Immediate action req.</div></div>
          <div class="payment-metric"><div class="payment-label">Average Deal</div><div class="payment-value" id="metric-average">₹0</div><div class="payment-sub">Per payment</div></div>
        </div>
        <div class="payment-grid">
          <section class="payment-panel">
            <div class="payment-panel-head"><h2 class="payment-panel-title">Revenue Trend</h2><span class="payment-note">Time-based volume</span></div>
            <div class="payment-chart" id="revenue-chart-container">
              <!-- Dynamically generated SVG will go here -->
            </div>
          </section>
          <section class="payment-panel">
            <div class="payment-panel-head"><h2 class="payment-panel-title">Collection Mix</h2><span class="payment-note">Status split</span></div>
            <div class="payment-donut-wrap">
              <div class="payment-donut" id="status-donut" style="background:conic-gradient(#16a34a 0 33%, #f59e0b 33% 66%, #ef4444 66% 100%);">
                <div class="payment-donut-inner">
                  <div>
                    <div id="donut-total" style="font-size:1.6rem;">0</div>
                    <div style="font-size:.72rem;color:#64748b;">Total</div>
                  </div>
                </div>
              </div>
              <div class="payment-legend">
                <div class="payment-legend-row"><span><i class="payment-dot" style="background:#16a34a;"></i>Paid</span><strong id="legend-paid">0</strong></div>
                <div class="payment-legend-row"><span><i class="payment-dot" style="background:#f59e0b;"></i>Pending</span><strong id="legend-pending">0</strong></div>
                <div class="payment-legend-row"><span><i class="payment-dot" style="background:#ef4444;"></i>Overdue</span><strong id="legend-overdue">0</strong></div>
              </div>
            </div>
          </section>
        </div>
        <div class="payment-lower">
          <section class="payment-panel">
            <div class="payment-panel-head"><h2 class="payment-panel-title">Payment Ledger</h2><span class="payment-note" id="ledger-count">0 records</span></div>
            <div class="payment-table-scroll">
              <table class="payment-table">
                <thead><tr><th>ID</th><th>Client</th><th>Amount</th><th>Method</th><th>Status</th><th>Source</th><th>Date</th><th></th></tr></thead>
                <tbody id="payment-rows"></tbody>
              </table>
            </div>
          </section>
          <aside class="payment-panel">
            <div class="payment-panel-head"><h2 class="payment-panel-title">Add Payment</h2><span class="payment-note">Fast entry</span></div>
            <form class="payment-form" id="payment-form">
              <select id="pay-client" title="Client" required><option value="">Select Client...</option></select>
              <input id="pay-amount" type="number" min="0" step="0.01" placeholder="Amount" required>
              <select id="pay-currency" title="Currency"><option value="INR">INR</option><option value="USD">USD</option></select>
              <select id="pay-method" title="Method"><option value="UPI">UPI</option><option value="Bank Transfer">Bank Transfer</option><option value="Card">Card</option><option value="Cash">Cash</option></select>
              <select id="pay-status" title="Status"><option value="paid">Paid</option><option value="pending">Pending</option><option value="overdue">Overdue</option></select>
              <button class="payment-btn" type="submit"><i class="fas fa-check"></i> Record Payment</button>
            </form>
            <div class="payment-bars" id="method-bars">
              <!-- Dynamically generated bars go here -->
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  function mountDashboard() {
    closeOldPaymentModal();
    styles();
    const host = document.querySelector('main') || document.querySelector('.main-content') || document.body;
    host.innerHTML = dashboardHtml();
    bindDashboard();
    loadClients();
    loadPayments();
  }

  async function loadClients() {
    try {
      const token = localStorage.getItem('tt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await fetch('/api/clients', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return;
      const clients = await res.json();
      const select = document.getElementById('pay-client');
      if (!select || !Array.isArray(clients)) return;
      clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name || c.company || 'Client'} (${c.company || 'N/A'})`;
        select.appendChild(opt);
      });
    } catch { /* non-critical */ }
  }


  window.togglePaymentStatus = async function(id, currentStatus) {
    const statuses = ['pending', 'paid', 'overdue'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    
    try {
      const token = localStorage.getItem('tt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await fetch(`/api/payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        const p = paymentState.find(p => p.id === id || String(p.id) === String(id));
        if (p) {
          p.status = nextStatus;
          renderPayments();
        }
      }
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  window.deletePayment = async function(id) {
    if(!confirm('Are you sure you want to delete this payment?')) return;
    try {
      const token = localStorage.getItem('tt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        paymentState = paymentState.filter(p => p.id !== id && String(p.id) !== String(id));
        renderPayments();
      }
    } catch (e) {
      console.error('Failed to delete payment', e);
    }
  };

  function renderPayments() {
    const search = document.getElementById('payment-search')?.value?.trim().toLowerCase() || '';
    const rows = paymentState.filter(p => isWithinActivePeriod(p) && [p.id, p.user, p.method, p.status].some(v => String(v).toLowerCase().includes(search)));
    
    // Sort by date descending
    rows.sort((a,b) => parsePaymentDate(b.date) - parsePaymentDate(a.date));

    const paid = rows.filter(p => p.status === 'paid');
    const pending = rows.filter(p => p.status === 'pending');
    const overdue = rows.filter(p => p.status === 'overdue');
    const revenue = paid.reduce((sum, p) => sum + p.amount, 0);
    const average = rows.length ? rows.reduce((s, p) => s + p.amount, 0) / rows.length : 0;
    
    // Metrics
    document.getElementById('metric-revenue').textContent = money(revenue);
    document.getElementById('metric-paid').textContent = paid.length;
    document.getElementById('metric-pending').textContent = pending.length;
    document.getElementById('metric-overdue').textContent = overdue.length;
    document.getElementById('metric-average').textContent = money(average);
    document.getElementById('donut-total').textContent = rows.length;
    document.getElementById('legend-paid').textContent = paid.length;
    document.getElementById('legend-pending').textContent = pending.length;
    document.getElementById('legend-overdue').textContent = overdue.length;
    document.getElementById('ledger-count').textContent = `${rows.length} records`;
    
    // Donut Chart Math
    const totalCount = rows.length || 1; 
    const pPaid = (paid.length / totalCount) * 100;
    const pPend = (pending.length / totalCount) * 100;
    const pOver = (overdue.length / totalCount) * 100;
    
    // Conic gradient mapping: paid (green), pending (yellow), overdue (red)
    const donutEl = document.getElementById('status-donut');
    if(donutEl) {
       donutEl.style.background = `conic-gradient(#16a34a 0 ${pPaid}%, #f59e0b ${pPaid}% ${pPaid + pPend}%, #ef4444 ${pPaid + pPend}% 100%)`;
    }

    // Method Bars Math
    const methodCounts = { 'UPI': 0, 'Bank Transfer': 0, 'Card': 0, 'Cash': 0 };
    rows.forEach(r => {
      const m = r.method;
      if (methodCounts[m] !== undefined) methodCounts[m]++;
      else methodCounts[m] = 1;
    });
    
    let barsHtml = '';
    const gradients = ['#102a96,#3b82f6', '#16a34a,#86efac', '#ff6b00,#fdba74', '#9333ea,#d8b4fe'];
    let colorIdx = 0;
    for (const [method, count] of Object.entries(methodCounts)) {
      if (count === 0 && rows.length > 0) continue;
      const pct = rows.length ? Math.round((count / rows.length) * 100) : 0;
      barsHtml += `
        <div class="payment-bar-row">
          <span>${method}</span>
          <span class="payment-track"><span class="payment-fill" style="width:${pct}%; background:linear-gradient(90deg,${gradients[colorIdx%gradients.length]});"></span></span>
          <strong>${pct}%</strong>
        </div>`;
      colorIdx++;
    }
    const methodBarsEl = document.getElementById('method-bars');
    if(methodBarsEl) methodBarsEl.innerHTML = barsHtml;

    // Line Chart Generator
    renderLineChart(rows);

    // Ledger
    document.getElementById('payment-rows').innerHTML = rows.map(p => {
      const sourceBadge = p.source === 'client_portal' 
        ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:800;color:#7c3aed;background:#ede9fe;border-radius:999px;padding:4px 8px;">🔗 Client Portal</span>'
        : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:800;color:#64748b;background:#f1f5f9;border-radius:999px;padding:4px 8px;">Staff</span>';
      
      const dateStr = parsePaymentDate(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      
      return `
      <tr>
        <td>${p.id}</td>
        <td>${p.user}</td>
        <td>${money(p.amount, p.currency)}</td>
        <td>${p.method}</td>
        <td><span class="payment-pill ${p.status}" onclick="togglePaymentStatus(${typeof p.id === 'string' ? `'${p.id}'` : p.id}, '${p.status}')" title="Click to toggle status">${p.status}</span></td>
        <td>${sourceBadge}</td>
        <td>${dateStr}</td>
        <td><button class="action-btn" onclick="deletePayment(${typeof p.id === 'string' ? `'${p.id}'` : p.id})" title="Delete"><i class="fas fa-trash"></i></button></td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:24px;">No payments found for this period</td></tr>';
  }

  function renderLineChart(rows) {
    // 4 buckets based on active period
    const buckets = [0, 0, 0, 0];
    const now = new Date();
    now.setHours(23,59,59,999);
    
    // Only calculate revenue of paid invoices for the trend
    const paidRows = rows.filter(r => r.status === 'paid');
    
    paidRows.forEach(p => {
      const d = parsePaymentDate(p.date);
      const diffTime = Math.abs(now - d);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const bucketSize = activePeriodDays / 4;
      if (diffDays <= bucketSize) buckets[3] += p.amount;
      else if (diffDays <= bucketSize * 2) buckets[2] += p.amount;
      else if (diffDays <= bucketSize * 3) buckets[1] += p.amount;
      else buckets[0] += p.amount;
    });

    const maxVal = Math.max(...buckets, 1000); // base min 1000 to avoid flatline if empty
    
    const paddingX = 46;
    const paddingYTop = 42;
    const paddingYBottom = 244;
    const usableHeight = paddingYBottom - paddingYTop;
    const usableWidth = 740 - 46;
    const stepX = usableWidth / 3;
    
    const points = buckets.map((val, idx) => {
      const x = paddingX + (stepX * idx);
      const heightRatio = val / maxVal;
      const y = paddingYBottom - (usableHeight * heightRatio);
      return { x, y, val };
    });

    const pathData = `M${points[0].x} ${points[0].y} C ${points[0].x + 50} ${points[0].y}, ${points[1].x - 50} ${points[1].y}, ${points[1].x} ${points[1].y} C ${points[1].x + 50} ${points[1].y}, ${points[2].x - 50} ${points[2].y}, ${points[2].x} ${points[2].y} C ${points[2].x + 50} ${points[2].y}, ${points[3].x - 50} ${points[3].y}, ${points[3].x} ${points[3].y}`;
    
    const areaData = `${pathData} L ${points[3].x} ${paddingYBottom + 26} L ${points[0].x} ${paddingYBottom + 26} Z`;

    // Dynamic labels
    let labelUnit = 'Week';
    if(activePeriodDays === 7) labelUnit = 'Day';
    if(activePeriodDays === 90) labelUnit = 'Month';
    if(activePeriodDays === 365) labelUnit = 'Quarter';

    const labels = [
      `${labelUnit} 1`, `${labelUnit} 2`, `${labelUnit} 3`, `${labelUnit} 4`
    ];

    const chartContainer = document.getElementById('revenue-chart-container');
    if(!chartContainer) return;
    
    chartContainer.innerHTML = `
      <svg viewBox="0 0 760 300" aria-label="Revenue line chart">
        <defs><linearGradient id="paymentArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#3b82f6" stop-opacity=".28"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>
        <g stroke="#e5e7eb" stroke-width="1">
          <line x1="46" y1="42" x2="740" y2="42"/>
          <line x1="46" y1="${42 + usableHeight*0.25}" x2="740" y2="${42 + usableHeight*0.25}"/>
          <line x1="46" y1="${42 + usableHeight*0.5}" x2="740" y2="${42 + usableHeight*0.5}"/>
          <line x1="46" y1="${42 + usableHeight*0.75}" x2="740" y2="${42 + usableHeight*0.75}"/>
          <line x1="46" y1="244" x2="740" y2="244"/>
        </g>
        <path d="${areaData}" fill="url(#paymentArea)"/>
        <path d="${pathData}" fill="none" stroke="#102a96" stroke-width="5" stroke-linecap="round"/>
        <g fill="#ff6b00">
          ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5"><title>${money(p.val)}</title></circle>`).join('')}
        </g>
        <g fill="#64748b" font-size="13" font-weight="700">
          <text x="35" y="275">${labels[0]}</text>
          <text x="${points[1].x - 20}" y="275">${labels[1]}</text>
          <text x="${points[2].x - 20}" y="275">${labels[2]}</text>
          <text x="${points[3].x - 40}" y="275">${labels[3]}</text>
        </g>
      </svg>
    `;
  }

  async function loadPayments() {
    try {
      const token = localStorage.getItem('tt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      const res = await fetch('/api/payments', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Payments API unavailable');
      const data = await res.json();
      paymentState = (Array.isArray(data) ? data : data.payments || []).map(normalizePayment);
    } catch {
      paymentState = [];
    }
    renderPayments();
  }

  function bindDashboard() {
    document.getElementById('payment-search')?.addEventListener('input', renderPayments);
    document.querySelectorAll('.payment-tabs button').forEach((button) => {
      button.addEventListener('click', () => {
        activePeriodDays = Number(button.dataset.days || 30);
        document.querySelectorAll('.payment-tabs button').forEach((tab) => tab.classList.toggle('active', tab === button));
        renderPayments();
      });
    });
    document.getElementById('payment-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const clientEl = document.getElementById('pay-client');
      const payload = {
        client_id: clientEl.value || null,
        amount: Number(document.getElementById('pay-amount').value || 0),
        currency: document.getElementById('pay-currency').value,
        method: document.getElementById('pay-method').value,
        status: document.getElementById('pay-status').value,
      };

      try {
        const token = localStorage.getItem('tt_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          event.target.reset();
          // Reload all payments to ensure correct data and ID mappings
          await loadPayments();
        }
      } catch (e) { 
        console.error('Failed to create payment', e);
      }
    });
  }

  window.openPayments = mountDashboard;
  window.openPaymentsModal = mountDashboard;
  window.showPaymentsModal = mountDashboard;
  window.initPayments = mountDashboard;

  document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('payments.html')) mountDashboard();
  });
})();
