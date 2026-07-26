
async function runTests() {
  const API_URL = 'http://localhost:5000/api';
  let token = '';

  console.log('--- STARTING E2E TESTS ---');

  // 1. LOGIN
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mininvonix@tt.com', password: 'admin123' })
    });
    const data = await res.json();
    if (data.success && data.data.token) {
      token = data.data.token;
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login failed', data);
      return;
    }
  } catch (e) {
    console.log('❌ Login error', e.message);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. SETTINGS
  try {
    const res = await fetch(`${API_URL}/settings`, { headers });
    const data = await res.json();
    if (data.success) {
      console.log('✅ Fetch Settings successful');
    } else {
      console.log('❌ Fetch Settings failed', data);
    }
  } catch (e) {
    console.log('❌ Fetch Settings error', e.message);
  }

  // 3. CUSTOMER MODULE (CRUD)
  let customerId = null;
  try {
    const res = await fetch(`${API_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Customer',
        email: 'test@customer.com',
        phone: '1234567890',
        subscription: 'Yes',
        customerType: 'Subscription'
      })
    });
    const data = await res.json();
    if (data.success) {
      customerId = data.data.id;
      console.log('✅ Create Customer successful', customerId);
    } else {
      console.log('❌ Create Customer failed', data);
    }
  } catch (e) {
    console.log('❌ Create Customer error', e.message);
  }

  try {
    const res = await fetch(`${API_URL}/customers/${customerId}`, { headers });
    const data = await res.json();
    if (data.success && data.data.subscription === 'Yes') {
      console.log('✅ Get Customer successful');
    } else {
      console.log('❌ Get Customer failed', data);
    }
  } catch (e) {
    console.log('❌ Get Customer error', e.message);
  }

  // 4. INVOICES
  let invoiceId = null;
  try {
    const res = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerId: customerId,
        date: '2026-07-20',
        status: 'Completed',
        amount: 1000,
        items: [
          { description: 'Service A', quantity: 1, unitPrice: 1000, rowTotal: 1000 }
        ]
      })
    });
    const data = await res.json();
    if (data.success) {
      invoiceId = data.data.id;
      console.log('✅ Create Invoice successful', invoiceId);
    } else {
      console.log('❌ Create Invoice failed', data);
    }
  } catch (e) {
    console.log('❌ Create Invoice error', e.message);
  }

  try {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}`, { headers });
    const data = await res.json();
    if (data.success && data.data.items.length === 1) {
      console.log('✅ Get Invoice successful');
    } else {
      console.log('❌ Get Invoice failed', data);
    }
  } catch (e) {
    console.log('❌ Get Invoice error', e.message);
  }

  // 5. REPORTS
  try {
    const res = await fetch(`${API_URL}/reports/summary`, { headers });
    const data = await res.json();
    if (data.success) {
      console.log('✅ Get Reports successful');
    } else {
      console.log('❌ Get Reports failed', data);
    }
  } catch (e) {
    console.log('❌ Get Reports error', e.message);
  }

  // 6. DASHBOARD
  try {
    const res = await fetch(`${API_URL}/dashboard/stats`, { headers });
    const data = await res.json();
    if (data.success) {
      console.log('✅ Get Dashboard Stats successful');
    } else {
      console.log('❌ Get Dashboard Stats failed', data);
    }
  } catch (e) {
    console.log('❌ Get Dashboard Stats error', e.message);
  }

  // CLEANUP
  try {
    await fetch(`${API_URL}/invoices/${invoiceId}`, { method: 'DELETE', headers });
    console.log('✅ Delete Invoice successful');
  } catch (e) {
    console.log('❌ Delete Invoice error', e.message);
  }

  try {
    await fetch(`${API_URL}/customers/${customerId}`, { method: 'DELETE', headers });
    console.log('✅ Delete Customer successful');
  } catch (e) {
    console.log('❌ Delete Customer error', e.message);
  }

  console.log('--- END E2E TESTS ---');
}

runTests();
