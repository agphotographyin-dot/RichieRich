#!/usr/bin/env node
/**
 * Automated PocketBase Collections Setup Script for Richie Rich Enterprise
 * Usage:
 *   node scripts/setup_pocketbase.js [adminEmail] [adminPassword] [pocketbaseUrl]
 *
 * Example:
 *   node scripts/setup_pocketbase.js admin@richierich.com RRadmin2026! http://127.0.0.1:8090
 */

const adminEmail = process.argv[2] || process.env.PB_ADMIN_EMAIL || 'admin@richierich.com';
const adminPass = process.argv[3] || process.env.PB_ADMIN_PASSWORD || 'RRadmin2026!';
const baseUrl = (process.argv[4] || process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/+$/, '');

const collections = [
  'inventory',
  'orders',
  'stores',
  'customers',
  'store_expenses',
  'purchase_orders',
  'inward_bills',
  'stock_transfers',
  'store_indents',
  'suppliers',
  'system_metadata',
];

async function main() {
  console.log(`\n=================================================`);
  console.log(`Richie Rich Enterprise - PocketBase Auto-Setup`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Superuser: ${adminEmail}`);
  console.log(`=================================================\n`);

  // 1. Health check
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    if (!health.ok) {
      throw new Error(`Health check returned ${health.status}`);
    }
    console.log(`✓ PocketBase server is reachable and online.`);
  } catch (err) {
    console.error(`❌ Could not connect to PocketBase at ${baseUrl}.`);
    console.error(`   Ensure the container is running: docker compose ps`);
    process.exit(1);
  }

  // 2. Authenticate
  let token = '';
  try {
    const res = await fetch(`${baseUrl}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: adminEmail, password: adminPass }),
    });
    if (res.ok) {
      const data = await res.json();
      token = data.token;
    }
  } catch {}

  if (!token) {
    try {
      const res = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: adminEmail, password: adminPass }),
      });
      if (res.ok) {
        const data = await res.json();
        token = data.token;
      }
    } catch {}
  }

  if (!token) {
    console.error(`❌ Authentication failed for ${adminEmail}.`);
    console.error(`   To create or reset this superuser on your VPS, run:`);
    console.error(`   docker exec richierich-pocketbase /pocketbase superuser upsert ${adminEmail} ${adminPass}`);
    process.exit(1);
  }

  console.log(`✓ Authenticated successfully.`);

  // 3. Fetch existing collections
  let existingNames = new Set();
  let existingMap = new Map();
  try {
    const listRes = await fetch(`${baseUrl}/api/collections?perPage=200`, {
      headers: { Authorization: token, Accept: 'application/json' },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      for (const item of listData.items || []) {
        existingNames.add(item.name);
        existingMap.set(item.name, item.id);
      }
    }
  } catch (err) {
    console.warn(`Notice reading collections:`, err.message);
  }

  // 4. Create or update each collection
  let created = 0;
  let updated = 0;

  for (const name of collections) {
    const payload = {
      name,
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { name: 'recordId', type: 'text', required: false },
        { name: 'data', type: 'json', required: false },
        { name: 'updatedAt', type: 'text', required: false },
      ],
    };

    if (!existingNames.has(name)) {
      const createRes = await fetch(`${baseUrl}/api/collections`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (createRes.ok) {
        console.log(`✓ Created collection: ${name}`);
        created++;
      } else {
        const errText = await createRes.text();
        console.warn(`⚠️ Issue creating ${name}: ${errText}`);
      }
    } else {
      const id = existingMap.get(name);
      const updateRes = await fetch(`${baseUrl}/api/collections/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listRule: '',
          viewRule: '',
          createRule: '',
          updateRule: '',
          deleteRule: '',
        }),
      });

      if (updateRes.ok) {
        console.log(`✓ Updated collection rules: ${name}`);
        updated++;
      }
    }
  }

  console.log(`\n=================================================`);
  console.log(`Setup complete!`);
  console.log(`Collections created: ${created}`);
  console.log(`Collections verified/updated: ${updated}`);
  console.log(`POS and Central Warehouse real-time sync is ready!`);
  console.log(`=================================================\n`);
}

main().catch((err) => {
  console.error(`Fatal error:`, err);
  process.exit(1);
});
