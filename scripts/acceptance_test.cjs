const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function runAcceptanceTests() {
  console.log('🚀 Starting Bachelor Zone Registration Acceptance Tests...\n');

  let passedTests = 0;
  let totalTests = 0;

  async function test(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [TEST ${totalTests}] PASSED: ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`❌ [TEST ${totalTests}] FAILED: ${name}`);
      console.error('   Reason:', err.message);
    }
  }

  const testPhone = '01855667788';
  const testNormalizedPhone = '01855667788';

  // TEST 1: Password mismatch is rejected
  await test('Password mismatch is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User Mismatch',
        phone: testPhone,
        password: 'Password123',
        confirmPassword: 'DifferentPassword456',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(data.success, false, 'Expected success to be false');
    assert(data.error.includes('মিলছে না') || data.error.includes('match'), 'Expected mismatch error');
  });

  // TEST 2: Password shorter than 6 characters is rejected
  await test('Short password (< 6 chars) is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Short Pass',
        phone: testPhone,
        password: '123',
        confirmPassword: '123',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(data.success, false);
  });

  // TEST 3: Invalid Bangladesh phone number format is rejected
  await test('Invalid Bangladesh phone format is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Invalid Phone User',
        phone: '123456',
        password: 'ValidPassword123',
        confirmPassword: 'ValidPassword123',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(data.success, false);
  });

  // TEST 4: Primary Admin reserved phone cannot be registered
  await test('Permanent Primary Admin phone (01516528497 / 01711234567) cannot be registered', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Fake Admin Impersonator',
        phone: '01516528497',
        password: 'SomePassword123',
        confirmPassword: 'SomePassword123',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(data.success, false);
  });

  // TEST 5: A new user can submit the registration form successfully
  let registeredId = null;
  await test('A new user can submit registration form successfully', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Tareq Rahman',
        phone: `+8801855667788`, // international format to test normalization
        studentId: 'ST-2026-99',
        roomNo: '402',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.registration.phone, '01855667788', 'Should be normalized to 11 digits');
    assert.strictEqual(data.registration.status, 'PENDING_APPROVAL');
    registeredId = data.registration.id;
  });

  // TEST 6: Duplicate phone numbers are rejected
  await test('Duplicate phone number registration is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Tareq Duplicate',
        phone: '01855667788',
        password: 'AnotherPassword123',
        confirmPassword: 'AnotherPassword123',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert.strictEqual(data.success, false);
    assert(data.error.includes('ইতিমধ্যে') || data.error.includes('already'), 'Expected duplicate phone error');
  });

  // TEST 7: Pending user login is prevented and returns awaiting approval notice
  await test('Pending user login is blocked with awaiting approval notice', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01855667788',
        password: 'SecurePassword123!',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.isPendingApproval, true, 'isPendingApproval should be true');
    assert(data.error.includes('অনুমোদনের অপেক্ষায়'), 'Error should state awaiting approval');
  });

  // TEST 8: Non-Jahidul admin or normal member cannot approve registration
  await test('Unauthorized user cannot approve registration (Only Jahidul Islam can)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/registrations/${registeredId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'm3', // Hasan Mahmud (member)
      },
      body: JSON.stringify({ role: 'MEMBER' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    assert.strictEqual(data.success, false);
  });

  // TEST 9: Permanent Primary Admin (Jahidul Islam) can view registrations list
  await test('Permanent Primary Admin can view registrations list', async () => {
    // Login as Jahidul Islam first
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01711234567',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginData.success, 'Jahidul Islam login should succeed');
    const adminToken = loginData.token;

    const res = await fetch(`${BASE_URL}/api/admin/registrations`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-user-id': 'admin_m1',
      },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.registrations), 'registrations should be an array');
    const found = data.registrations.find(r => r.id === registeredId);
    assert(found, 'Newly registered user should be in registrations list');
    assert.strictEqual(found.passwordHash, undefined, 'passwordHash must never be exposed');
  });

  // TEST 10: Permanent Primary Admin (Jahidul Islam) can approve registration
  await test('Jahidul Islam can approve registration and assign role', async () => {
    // Login as Jahidul
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01711234567',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    const adminToken = loginData.token;

    const res = await fetch(`${BASE_URL}/api/admin/registrations/${registeredId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        'x-user-id': 'admin_m1',
      },
      body: JSON.stringify({ role: 'MEMBER', roomNo: '402' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.registration.status, 'APPROVED');
    assert.strictEqual(data.member.name, 'Tareq Rahman');
  });

  // TEST 11: Approved member can now log in with their phone and password
  await test('Approved member can log in with their own phone number and password', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01855667788',
        password: 'SecurePassword123!',
      }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.user.name, 'Tareq Rahman');
    assert.strictEqual(data.user.role, 'member');
    assert(data.token, 'Should return authenticated token');
  });

  // TEST 12: Existing accounts and functionality continue to work
  await test('Existing accounts (Jahidul Islam admin & other members) continue to work properly', async () => {
    // 1. Admin login
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01711234567',
        password: 'admin123',
      }),
    });
    const adminData = await adminRes.json();
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminData.success, true);
    assert.strictEqual(adminData.user.role, 'PRIMARY_ADMIN');

    // 2. Normal member login
    const memRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '01913456789',
        password: 'member123',
      }),
    });
    const memData = await memRes.json();
    assert.strictEqual(memRes.status, 200);
    assert.strictEqual(memData.success, true);

    // 3. Mess data and accounting calculation
    const dataRes = await fetch(`${BASE_URL}/api/mess-data`);
    const messData = await dataRes.json();
    assert.strictEqual(dataRes.status, 200);
    assert.strictEqual(messData.success, true);
    assert(messData.data.members.length >= 7, 'Member count should reflect approved member');
  });

  console.log(`\n==============================================`);
  console.log(`📊 SUMMARY: ${passedTests}/${totalTests} ACCEPTANCE TESTS PASSED!`);
  console.log(`==============================================\n`);
}

runAcceptanceTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
