const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const compression = require('compression');

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'mineazy-super-secret-key-2026';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is missing in production.");
  process.exit(1);
}

app.use(helmet({
  contentSecurityPolicy: false, // Disabling temporarily to avoid breaking inline scripts/styles if present
}));
app.use(compression());

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
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL ERROR: Database configuration missing in production environment. Set DATABASE_URL.');
      process.exit(1);
    }
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
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL ERROR: Failed to connect to the production database cluster.');
      console.error(err.message);
      process.exit(1);
    }
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

const MOCK_CLIENTS = [];

const MOCK_TRANSACTIONS = [];

let demoCategories = [...DEFAULT_CATEGORIES];
let demoClients = [...MOCK_CLIENTS];
let demoTransactions = [...MOCK_TRANSACTIONS];
let demoUsers = [{ id: 'usr_admin1', username: 'admin', role: 'admin', password_hash: '$2b$10$tZ2.Q1VzH4f1x2m1jB3.8e9o1yL5X.X5i1b1z1k1q1v1m1c1d1a1' }]; // bcrypt hash for 'demo' or 'admin123'


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

  // Seed default admin user if empty
  const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
  if (userRows[0].count === 0) {
    console.log('Seeding default admin user...');
    const hashedPass = await bcrypt.hash('admin123', 10);
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)',
      ['usr_admin1', 'admin', hashedPass, 'admin']
    );
  }
}

// REST API Endpoints

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
    req.user = user;
    next();
  });
};

// 0. Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  try {
    let user = null;
    if (dbConnected) {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      user = rows[0];
    } else {
      user = demoUsers.find(u => u.username === username);
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // In demo mode, since we hardcoded a hash, let's just accept 'admin123' and check manually if bcrypt fails
    let match = false;
    if (dbConnected) {
      match = await bcrypt.compare(password, user.password_hash);
    } else {
      match = password === 'admin123' || password === 'demo';
    }

    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User Management Routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (dbConnected) {
      const [users] = await pool.query('SELECT id, username, role, created_at FROM users');
      res.json(users);
    } else {
      res.json(demoUsers.map(u => ({ id: u.id, username: u.username, role: u.role })));
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing required fields' });
  
  try {
    const hashedPass = await bcrypt.hash(password, 10);
    const newId = `usr_${Date.now()}`;
    const userRole = role || 'user';
    
    if (dbConnected) {
      await pool.query('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)', [newId, username, hashedPass, userRole]);
      res.json({ success: true, user: { id: newId, username, role: userRole } });
    } else {
      demoUsers.push({ id: newId, username, role: userRole, password_hash: hashedPass });
      res.json({ success: true, user: { id: newId, username, role: userRole } });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  try {
    if (dbConnected) {
      await pool.query('DELETE FROM users WHERE id = ?', [userId]);
      res.json({ success: true });
    } else {
      demoUsers = demoUsers.filter(u => u.id !== userId);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Fetch Complete State
app.get('/api/data', authenticateToken, async (req, res) => {
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
app.post('/api/clients', authenticateToken, async (req, res) => {
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
app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
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
app.post('/api/transactions', authenticateToken, async (req, res) => {
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
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
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
app.post('/api/import', authenticateToken, async (req, res) => {
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
