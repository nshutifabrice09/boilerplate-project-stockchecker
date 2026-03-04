const express = require('express');
const axios = require('axios');
const router = express.Router();

// Simple IP anonymization (keep first 3 octets for IPv4)
function anonymizeIP(ipAddress) {
  if (!ipAddress) return '0.0.0.0';
  
  // Remove IPv6 prefix
  let cleanIp = ipAddress.replace('::ffff:', '');
  
  if (cleanIp.includes(':')) {
    // IPv6 - simplify for testing
    return cleanIp.split(':').slice(0, 2).join(':') + '::';
  }
  
  // IPv4 - keep first 3 octets
  const parts = cleanIp.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  return '0.0.0.0';
}

// Fetch stock price
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

// Get likes with IP deduplication
async function getStockLikes(symbol, like, clientIp, db) {
  const anonymizedIP = anonymizeIP(clientIp);
  const upperSymbol = symbol.toUpperCase();
  
  try {
    // Check if stock exists
    let stock = await db.query(
      'SELECT id, likes FROM stocks WHERE symbol = $1',
      [upperSymbol]
    );
    
    let stockId;
    let currentLikes;
    
    if (stock.rows.length === 0) {
      // Create new stock
      const newStock = await db.query(
        'INSERT INTO stocks (symbol, likes) VALUES ($1, 0) RETURNING id, likes',
        [upperSymbol]
      );
      stockId = newStock.rows[0].id;
      currentLikes = 0;
    } else {
      stockId = stock.rows[0].id;
      currentLikes = stock.rows[0].likes;
    }
    
    // Handle like
    if (like === 'true' || like === true) {
      // Check if IP already liked
      const ipCheck = await db.query(
        'SELECT id FROM stock_ips WHERE stock_id = $1 AND ip_address = $2',
        [stockId, anonymizedIP]
      );
      
      if (ipCheck.rows.length === 0) {
        // Add IP and increment likes
        await db.query(
          'INSERT INTO stock_ips (stock_id, ip_address) VALUES ($1, $2)',
          [stockId, anonymizedIP]
        );
        
        const update = await db.query(
          'UPDATE stocks SET likes = likes + 1 WHERE id = $1 RETURNING likes',
          [stockId]
        );
        currentLikes = update.rows[0].likes;
      }
    }
    
    return currentLikes;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Main endpoint
router.get('/stock-prices', async (req, res) => {
  const db = req.app.get('db');
  
  try {
    let { stock, like } = req.query;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Handle multiple stocks
    if (Array.isArray(stock)) {
      // Get data for both stocks
      const stock1 = await fetchStockPrice(stock[0]);
      const stock2 = await fetchStockPrice(stock[1]);
      
      const likes1 = await getStockLikes(stock[0], like, clientIp, db);
      const likes2 = await getStockLikes(stock[1], like, clientIp, db);
      
      const relLikes = likes1 - likes2;
      
      return res.json({
        stockData: [
          {
            stock: stock1.symbol,
            price: stock1.price,
            rel_likes: relLikes
          },
          {
            stock: stock2.symbol,
            price: stock2.price,
            rel_likes: -relLikes
          }
        ]
      });
    }
    
    // Handle single stock
    const stockData = await fetchStockPrice(stock);
    const likes = await getStockLikes(stock, like, clientIp, db);
    
    res.json({
      stockData: {
        stock: stockData.symbol,
        price: stockData.price,
        likes: likes
      }
    });
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;