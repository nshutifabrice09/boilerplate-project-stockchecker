const express = require('express');
const axios = require('axios');
const router = express.Router();

// Helper to anonymize IP (truncate IPv4 to /24, IPv6 to /48)
function anonymizeIP(ip) {
  // Remove IPv6 prefix if present
  ip = ip.replace('::ffff:', '');
  
  if (ip.includes(':')) {
    // IPv6 - keep first 48 bits (4 hextets)
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':') + ':0000:0000:0000:0000';
  }
  // IPv4 - keep first 24 bits (first 3 octets)
  const parts = ip.split('.');
  return parts.slice(0, 3).join('.') + '.0';
}

// Helper to fetch stock price
async function fetchStockPrice(symbol) {
  try {
    const response = await axios.get(
      `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`
    );
    return {
      symbol: response.data.symbol,
      price: response.data.latestPrice
    };
  } catch (error) {
    throw new Error('Invalid stock symbol');
  }
}

// Helper to get likes with IP deduplication using PostgreSQL
async function getStockLikes(symbol, like, clientIP, db) {
  const anonymizedIP = anonymizeIP(clientIP);
  
  try {
    // Start a transaction
    await db.query('BEGIN');
    
    // Get or create stock
    let stockResult = await db.query(
      `INSERT INTO stocks (symbol, likes) 
       VALUES ($1, 0) 
       ON CONFLICT (symbol) 
       DO UPDATE SET symbol = EXCLUDED.symbol 
       RETURNING id, likes`,
      [symbol.toUpperCase()]
    );
    
    const stockId = stockResult.rows[0].id;
    let currentLikes = stockResult.rows[0].likes;
    
    if (like === 'true' || like === true) {
      // Check if this IP has already liked this stock
      const ipCheck = await db.query(
        'SELECT id FROM stock_ips WHERE stock_id = $1 AND ip_address = $2',
        [stockId, anonymizedIP]
      );
      
      if (ipCheck.rows.length === 0) {
        // Add IP record
        await db.query(
          'INSERT INTO stock_ips (stock_id, ip_address) VALUES ($1, $2)',
          [stockId, anonymizedIP]
        );
        
        // Increment likes
        const updateResult = await db.query(
          'UPDATE stocks SET likes = likes + 1 WHERE id = $1 RETURNING likes',
          [stockId]
        );
        currentLikes = updateResult.rows[0].likes;
      }
    }
    
    await db.query('COMMIT');
    return currentLikes;
    
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

router.get('/stock-prices', async (req, res) => {
  const db = req.app.get('db');
  
  try {
    const { stock, like } = req.query;
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Handle multiple stocks
    if (Array.isArray(stock)) {
      // Get data for both stocks
      const stocksData = await Promise.all(
        stock.map(async (symbol) => {
          const priceData = await fetchStockPrice(symbol);
          const likes = await getStockLikes(symbol, like, clientIP, db);
          return { ...priceData, likes };
        })
      );

      // Calculate relative likes
      const likesDiff = stocksData[0].likes - stocksData[1].likes;
      const result = stocksData.map((data, index) => ({
        stock: data.symbol,
        price: data.price,
        rel_likes: index === 0 ? likesDiff : -likesDiff
      }));

      return res.json({ stockData: result });
    }

    // Handle single stock
    const priceData = await fetchStockPrice(stock);
    const likes = await getStockLikes(stock, like, clientIP, db);
    
    res.json({
      stockData: {
        stock: priceData.symbol,
        price: priceData.price,
        likes
      }
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;