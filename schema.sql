-- MINEAZY BIG SPENDERS TRACKING DATABASE SCHEMA

-- 1. Categories table
CREATE TABLE IF NOT EXISTS categories (
  name VARCHAR(100) PRIMARY KEY
);

-- 2. Clients profile table
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(50) PRIMARY KEY,
  company VARCHAR(255) NOT NULL,
  contact VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  tier VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  joinDate VARCHAR(50) NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  loyalty_points INT DEFAULT 0
);

-- 3. Purchases/Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  txid VARCHAR(50) PRIMARY KEY,
  invoiceNo VARCHAR(50) NOT NULL,
  clientId VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  date VARCHAR(50) NOT NULL,
  notes TEXT,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- 4. Users table (Authentication & Management)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
