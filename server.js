require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Security middleware with strict CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://cdn.freecodecamp.org"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      // Fix: upgradeInsecureRequests should be [] (enabled) or false (disabled)
      upgradeInsecureRequests: false // Empty array enables it
    },
    reportOnly: false
  },
  // Other security headers
  hsts: false,
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' }
}));
// Add this to allow the favicon from freeCodeCamp
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// PostgreSQL connection pool with error handling
const pool = new Pool({
  connectionString: process.env.PG_URI,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database tables with improved schema
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create stocks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stocks (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10) UNIQUE NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create stock_ips table for tracking likes
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_ips (
        id SERIAL PRIMARY KEY,
        stock_id INTEGER REFERENCES stocks(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(stock_id, ip_address)
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_ips_ip ON stock_ips(ip_address);
      CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
      CREATE INDEX IF NOT EXISTS idx_stock_ips_created ON stock_ips(created_at);
    `);

    // Create or replace function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for stocks table
    await client.query(`
      DROP TRIGGER IF EXISTS update_stocks_updated_at ON stocks;
      CREATE TRIGGER update_stocks_updated_at
        BEFORE UPDATE ON stocks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('✅ Database initialized successfully');
    console.log('📊 Tables created: stocks, stock_ips');
    
    // Log table statistics
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM stocks) as stock_count,
        (SELECT COUNT(*) FROM stock_ips) as ip_count
    `);
    console.log(`📈 Current stats: ${stats.rows[0].stock_count} stocks, ${stats.rows[0].ip_count} likes tracked`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database
initDB().catch(console.error);

// Make pool available to routes
app.set('db', pool);
app.set('pool', pool); // Alias for compatibility

// API Routes
app.use('/api', require('./routes/api'));

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    availableEndpoints: {
      home: 'GET /',
      health: 'GET /health',
      stockPrices: 'GET /api/stock-prices?stock=SYMBOL',
      stockWithLike: 'GET /api/stock-prices?stock=SYMBOL&like=true',
      multipleStocks: 'GET /api/stock-prices?stock=SYMBOL1&stock=SYMBOL2'
    }
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  // Different error responses based on environment
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack,
      type: err.name
    });
  }
});

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  try {
    // Close database pool
    await pool.end();
    console.log('✅ Database connections closed');
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API Base: http://localhost:${PORT}/api`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n📝 Example API calls:`);
  console.log(`   • Single stock: http://localhost:${PORT}/api/stock-prices?stock=GOOG`);
  console.log(`   • With like: http://localhost:${PORT}/api/stock-prices?stock=MSFT&like=true`);
  console.log(`   • Two stocks: http://localhost:${PORT}/api/stock-prices?stock=GOOG&stock=MSFT`);
  console.log(`   • Two stocks with likes: http://localhost:${PORT}/api/stock-prices?stock=GOOG&stock=MSFT&like=true`);
});

// Handle various shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app; // For testing