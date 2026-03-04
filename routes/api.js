const express = require('express');
const axios = require('axios');
const Stock = require('../models/Stock');
const router = express.Router();

// Helper to anonymize IP (truncate IPv4 to /24, IPv6 to /48)
function anonymizeIP(ip) {
  if (ip.includes(':')) {
    // IPv6 - keep first 48 bits (4 hextets)
    return ip.split(':').slice(0, 4).join(':') + ':0000:0000:0000:0000';
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

// Helper to get likes with IP deduplication
async function getStockLikes(symbol, like, clientIP) {
  const anonymizedIP = anonymizeIP(clientIP);
  
  if (like === 'true' || like === true) {
    // Check if this IP has already liked this stock
    const existingLike = await Stock.findOne({
      symbol: symbol.toUpperCase(),
      ips: anonymizedIP
    });

    if (!existingLike) {
      // Add like and IP to record
      await Stock.findOneAndUpdate(
        { symbol: symbol.toUpperCase() },
        { 
          $inc: { likes: 1 },
          $push: { ips: anonymizedIP }
        },
        { upsert: true, new: true }
      );
    }
  }

  // Get current likes count
  const stockData = await Stock.findOne({ symbol: symbol.toUpperCase() });
  return stockData ? stockData.likes : 0;
}

router.get('/stock-prices', async (req, res) => {
  try {
    const { stock, like } = req.query;
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Handle multiple stocks
    if (Array.isArray(stock)) {
      // Get data for both stocks
      const stocksData = await Promise.all(
        stock.map(async (symbol) => {
          const priceData = await fetchStockPrice(symbol);
          const likes = await getStockLikes(symbol, like, clientIP);
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
    const likes = await getStockLikes(stock, like, clientIP);
    
    res.json({
      stockData: {
        stock: priceData.symbol,
        price: priceData.price,
        likes
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;