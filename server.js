const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection pool setup
let pool = null;
let dbConnected = false;

async function connectDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  const dbHost = process.env.TIDB_HOST;
  
  if (!dbUrl && !dbHost) {
    console.warn('\n======================================================');
    console.warn('WARNING: No database configuration variables found.');
    console.warn('Set DATABASE_URL or TIDB_HOST in a .env file.');
    console.warn('System will start in DEMO mode with memory-only mock data.');
    console.warn('======================================================\n');
    return;
  }

  try {
    const config = {};
    if (dbUrl) {
      console.log('Connecting to TiDB/MySQL database using connection URL...');
      pool = mysql.createPool(dbUrl);
    } else {
      console.log(`Connecting to TiDB/MySQL database at ${dbHost}:${process.env.TIDB_PORT || 3306}...`);
      
      let sslOption = null;
      if (process.env.TIDB_SSL_CA) {
        sslOption = { ca: fs.readFileSync(process.env.TIDB_SSL_CA) };
      } else if (dbHost.includes('prod') || dbHost.includes('aws') || dbHost.includes('tidbcloud')) {
        sslOption = { rejectUnauthorized: true }; // Serverless clusters require SSL
      }

      pool = mysql.createPool({
        host: dbHost,
        port: parseInt(process.env.TIDB_PORT || '3306', 10),
        user: process.env.TIDB_USER || 'root',
        password: process.env.TIDB_PASSWORD || '',
        database: process.env.TIDB_DATABASE || 'mineazy_spenders',
        ssl: sslOption,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    }

    // Ping the database
    const conn = await pool.getConnection();
    console.log('Successfully connected to TiDB/MySQL database cluster!');
    conn.release();
    dbConnected = true;

    // Run schema initialization DDL queries
    await initializeSchema();
  } catch (err) {
    console.error('\n======================================================');
    console.error('ERROR: Failed to connect to the database cluster.');
    console.error(err.message);
    console.error('Running in DEMO mode with memory-only mock state.');
    console.error('======================================================\n');
    dbConnected = false;
    pool = null;
  }
}

// In-Memory Fallback State (Demo Mode)
const DEFAULT_CATEGORIES = ['Workshop', 'Processing', 'Bearings', 'Bolts & Nuts', 'HDPE Fittings', 'Chemicals'];

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
  { txid: 'TX-10001', invoiceNo: 'ME-10041', clientId: 'cli_1', date: '2026-01-14', category: 'Workshop', amount: 350000.00, notes: 'Sunsynk 50kW Hybrid Solar Inverter system & lithium batteries for regional office' },
  { txid: 'TX-10002', invoiceNo: 'ME-10042', clientId: 'cli_1', date: '2026-02-28', category: 'Chemicals', amount: 480000.00, notes: 'Sodium Cyanide briquettes (98% purity, 10-ton shipment)' },
  { txid: 'TX-10003', invoiceNo: 'ME-10043', clientId: 'cli_1', date: '2026-04-10', category: 'Processing', amount: 820000.00, notes: 'Apex Shaking Tables (gravity ore concentrator) - 4 units' },
  { txid: 'TX-10004', invoiceNo: 'ME-10044', clientId: 'cli_1', date: '2026-06-18', category: 'Bearings', amount: 75000.00, notes: 'SKF Spherical Roller Bearings for secondary jaw crusher mill' },
  { txid: 'TX-10005', invoiceNo: 'ME-10045', clientId: 'cli_1', date: '2026-07-05', category: 'Bolts & Nuts', amount: 25000.00, notes: 'M24 High Tensile structural hex bolts & heavy washers' },
  { txid: 'TX-10006', invoiceNo: 'ME-10046', clientId: 'cli_2', date: '2026-01-20', category: 'Processing', amount: 1150000.00, notes: 'Industrial Ball Mill grinding cylinder shell & installation gears' },
  { txid: 'TX-10007', invoiceNo: 'ME-10047', clientId: 'cli_2', date: '2026-03-15', category: 'HDPE Fittings', amount: 320000.00, notes: 'HDPE PN16 dewatering pipes (110mm, 2.5km) & Plasson couplings' },
  { txid: 'TX-10008', invoiceNo: 'ME-10048', clientId: 'cli_2', date: '2026-05-02', category: 'Workshop', amount: 180000.00, notes: 'Atlas Copco 15kW heavy duty screw air compressor unit' },
  { txid: 'TX-10009', invoiceNo: 'ME-10049', clientId: 'cli_2', date: '2026-07-02', category: 'Chemicals', amount: 240000.00, notes: 'Activated Carbon coconut-based granules for Carbon-in-Pulp circuit' },
  { txid: 'TX-10010', invoiceNo: 'ME-10050', clientId: 'cli_3', date: '2026-02-10', category: 'Processing', amount: 690000.00, notes: 'Forged steel grinding balls (70mm) - 50 tons for ball mill feed' },
  { txid: 'TX-10011', invoiceNo: 'ME-10051', clientId: 'cli_3', date: '2026-04-05', category: 'Chemicals', amount: 95000.00, notes: 'Hydrated lime powder (pH regulator) & floatation frother agents' },
  { txid: 'TX-10012', invoiceNo: 'ME-10052', clientId: 'cli_3', date: '2026-06-12', category: 'Bearings', amount: 62000.00, notes: 'FAG Tapered Roller Bearings for belt conveyor pulleys' },
  { txid: 'TX-10013', invoiceNo: 'ME-10053', clientId: 'cli_4', date: '2026-02-22', category: 'Processing', amount: 480000.00, notes: 'Electrowinning cell gold recovery replacement anode set' },
  { txid: 'TX-10014', invoiceNo: 'ME-10054', clientId: 'cli_4', date: '2026-05-19', category: 'HDPE Fittings', amount: 140000.00, notes: 'High-pressure slurry pipeline valves, tees, and flange adaptors' },
  { txid: 'TX-10015', invoiceNo: 'ME-10055', clientId: 'cli_5', date: '2026-03-05', category: 'Workshop', amount: 210000.00, notes: 'Lincoln Electric heavy duty engine-driven welder generator units' },
  { txid: 'TX-10016', invoiceNo: 'ME-10056', clientId: 'cli_5', date: '2026-05-30', category: 'Bolts & Nuts', amount: 45000.00, notes: 'Foundation anchor bolts (M36) for plant mill mounting' },
  { txid: 'TX-10017', invoiceNo: 'ME-10057', clientId: 'cli_6', date: '2026-02-02', category: 'Workshop', amount: 160000.00, notes: 'Deye 30kW solar inverter system & backup battery cabinet' },
  { txid: 'TX-10018', invoiceNo: 'ME-10058', clientId: 'cli_7', date: '2026-04-18', category: 'Chemicals', amount: 85000.00, notes: 'Analytical grade nitric acid & flotation collector chemicals' },
  { txid: 'TX-10019', invoiceNo: 'ME-10059', clientId: 'cli_7', date: '2026-06-25', category: 'HDPE Fittings', amount: 35000.00, notes: 'HDPE compression elbows, branch tees, and ball valves' }
];

let demoCategories = [...DEFAULT_CATEGORIES];
let demoClients = [...MOCK_CLIENTS];
let demoTransactions = [...MOCK_TRANSACTIONS];

// DDL Run & Seed Database
async function initializeSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) return;

  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

  for (const statement of statements) {
    await pool.query(statement);
  }

  // Seed Categories if empty
  const [catRows] = await pool.query('SELECT COUNT(*) as count FROM categories');
  if (catRows[0].count === 0) {
    console.log('Seeding initial categories to database...');
    for (const cat of DEFAULT_CATEGORIES) {
      await pool.query('INSERT INTO categories (name) VALUES (?)', [cat]);
    }
  }

  // Seed Clients & Transactions if empty
  const [clientRows] = await pool.query('SELECT COUNT(*) as count FROM clients');
  if (clientRows[0].count === 0) {
    console.log('Seeding initial VIP client profiles to database...');
    for (const c of MOCK_CLIENTS) {
      await pool.query(
        'INSERT INTO clients (id, company, contact, email, phone, tier, status, joinDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.company, c.contact, c.email, c.phone, c.tier, c.status, c.joinDate]
      );
    }
    for (const t of MOCK_TRANSACTIONS) {
      await pool.query(
        'INSERT INTO transactions (txid, invoiceNo, clientId, amount, category, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.txid, t.invoiceNo, t.clientId, t.amount, t.category, t.date, t.notes]
      );
    }
    console.log('Mock database seeding completed.');
  }
}

// REST API Endpoints

// 1. Fetch Complete State
app.get('/api/data', async (req, res) => {
  try {
    if (dbConnected) {
      const [cats] = await pool.query('SELECT * FROM categories');
      const [clients] = await pool.query('SELECT * FROM clients');
      const [txs] = await pool.query('SELECT * FROM transactions');

      res.json({
        dbConnected: true,
        categories: cats.map(c => c.name),
        clients: clients,
        transactions: txs.map(t => ({
          ...t,
          amount: parseFloat(t.amount) // Ensure float return
        }))
      });
    } else {
      res.json({
        dbConnected: false,
        categories: demoCategories,
        clients: demoClients,
        transactions: demoTransactions
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add or Edit Client Profile
app.post('/api/clients', async (req, res) => {
  const { id, company, contact, email, phone, tier, status } = req.body;
  
  if (!company || !contact || !email) {
    return res.status(400).json({ error: 'Missing required company metadata fields.' });
  }

  try {
    if (dbConnected) {
      if (id) {
        // Edit mode
        await pool.query(
          'UPDATE clients SET company = ?, contact = ?, email = ?, phone = ?, tier = ?, status = ? WHERE id = ?',
          [company, contact, email, phone, tier, status, id]
        );
        res.json({ success: true, message: 'Client profile updated.' });
      } else {
        // Add mode
        const newId = `cli_${Date.now()}`;
        const joinDate = new Date().toISOString().split('T')[0];
        await pool.query(
          'INSERT INTO clients (id, company, contact, email, phone, tier, status, joinDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newId, company, contact, email, phone, tier, status, joinDate]
        );
        res.json({ success: true, client: { id: newId, company, contact, email, phone, tier, status, joinDate } });
      }
    } else {
      // Demo Mode
      if (id) {
        const idx = demoClients.findIndex(c => c.id === id);
        if (idx !== -1) {
          demoClients[idx] = { ...demoClients[idx], company, contact, email, phone, tier, status };
        }
        res.json({ success: true, message: 'Client profile updated in memory.' });
      } else {
        const newId = `cli_${Date.now()}`;
        const joinDate = new Date().toISOString().split('T')[0];
        const newClient = { id: newId, company, contact, email, phone, tier, status, joinDate };
        demoClients.push(newClient);
        res.json({ success: true, client: newClient });
      }
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Delete Client
app.delete('/api/clients/:id', async (req, res) => {
  const clientId = req.params.id;

  try {
    if (dbConnected) {
      await pool.query('DELETE FROM clients WHERE id = ?', [clientId]);
      res.json({ success: true, message: 'Client profile deleted.' });
    } else {
      demoClients = demoClients.filter(c => c.id !== clientId);
      demoTransactions = demoTransactions.filter(t => t.clientId !== clientId);
      res.json({ success: true, message: 'Client deleted in memory.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Log Transaction
app.post('/api/transactions', async (req, res) => {
  const { txid, invoiceNo, clientId, amount, category, date, notes } = req.body;

  if (!clientId || !amount || !category || !date) {
    return res.status(400).json({ error: 'Missing required purchase ledger fields.' });
  }

  try {
    if (dbConnected) {
      // 1. Check if category is dynamic and insert if new
      const [catRows] = await pool.query('SELECT * FROM categories WHERE name = ?', [category]);
      if (catRows.length === 0) {
        await pool.query('INSERT INTO categories (name) VALUES (?)', [category]);
      }

      // 2. Insert transaction
      const actualTxid = txid || `TX-${Math.floor(10000 + Math.random() * 90000)}`;
      await pool.query(
        'INSERT INTO transactions (txid, invoiceNo, clientId, amount, category, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [actualTxid, invoiceNo || '', clientId, amount, category, date, notes || '']
      );

      res.json({ success: true, txid: actualTxid });
    } else {
      // Demo Mode
      if (!demoCategories.includes(category)) {
        demoCategories.push(category);
      }
      const actualTxid = txid || `TX-${Math.floor(10000 + Math.random() * 90000)}`;
      const newTx = { txid: actualTxid, invoiceNo: invoiceNo || '', clientId, amount, category, date, notes: notes || '' };
      demoTransactions.push(newTx);
      res.json({ success: true, txid: actualTxid });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete Transaction
app.delete('/api/transactions/:id', async (req, res) => {
  const txid = req.params.id;

  try {
    if (dbConnected) {
      await pool.query('DELETE FROM transactions WHERE txid = ?', [txid]);
      res.json({ success: true });
    } else {
      demoTransactions = demoTransactions.filter(t => t.txid !== txid);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Overwrite database completely (Backup Import Restore API)
app.post('/api/import', async (req, res) => {
  const { clients, transactions, categories } = req.body;

  if (!Array.isArray(clients) || !Array.isArray(transactions)) {
    return res.status(400).json({ error: 'Import payload must contain clients and transactions arrays.' });
  }

  try {
    if (dbConnected) {
      // Truncate tables securely
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('TRUNCATE TABLE transactions');
      await pool.query('TRUNCATE TABLE clients');
      await pool.query('TRUNCATE TABLE categories');
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');

      // Re-seed Categories if supplied, or default
      const catsToInsert = Array.isArray(categories) && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
      for (const cat of catsToInsert) {
        await pool.query('INSERT INTO categories (name) VALUES (?)', [cat]);
      }

      // Re-seed Clients
      for (const c of clients) {
        await pool.query(
          'INSERT INTO clients (id, company, contact, email, phone, tier, status, joinDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [c.id, c.company, c.contact, c.email, c.phone, c.tier, c.status, c.joinDate]
        );
      }

      // Re-seed Transactions
      for (const t of transactions) {
        await pool.query(
          'INSERT INTO transactions (txid, invoiceNo, clientId, amount, category, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.txid, t.invoiceNo || '', t.clientId, t.amount, t.category, t.date, t.notes || '']
        );
      }

      res.json({ success: true, message: 'Database successfully restored.' });
    } else {
      // Demo Mode restore
      demoCategories = Array.isArray(categories) && categories.length > 0 ? categories : [...DEFAULT_CATEGORIES];
      demoClients = [...clients];
      demoTransactions = [...transactions];
      res.json({ success: true, message: 'Memory database successfully restored.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Database Setup & Boot Server
connectDatabase().then(() => {
  app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`Mineazy Big Spenders System listening at http://localhost:${port}`);
    console.log(`Database Connected: ${dbConnected ? 'YES (TiDB/MySQL)' : 'NO (Using memory fallback)'}`);
    console.log(`======================================================\n`);
  });
});
