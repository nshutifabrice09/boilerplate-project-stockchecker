const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');

chai.use(chaiHttp);
const { assert } = chai;
const request = chai.request(server).keepOpen();

suite('Functional Tests', function() {
  const db = server.get('db');
  
  // Clear database before tests
  before(async () => {
    await db.query('DELETE FROM stock_ips');
    await db.query('DELETE FROM stocks');
    console.log('Database cleared for tests');
  });

  // Test 1: Viewing one stock
  test('Viewing one stock: GET request to /api/stock-prices/', (done) => {
    request
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        assert.isAtLeast(res.body.stockData.price, 0);
        done();
      });
  });

  // Test 2: Viewing one stock and liking it
  test('Viewing one stock and liking it: GET request to /api/stock-prices/', (done) => {
    request
      .get('/api/stock-prices')
      .query({ stock: 'MSFT', like: 'true' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.property(res.body.stockData, 'stock');
        assert.property(res.body.stockData, 'price');
        assert.property(res.body.stockData, 'likes');
        assert.equal(res.body.stockData.stock, 'MSFT');
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        assert.isAtLeast(res.body.stockData.likes, 1);
        done();
      });
  });

  // Test 3: Viewing the same stock and liking it again (should not increase likes)
  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', (done) => {
    let firstLikeCount;
    
    // First like
    request
      .get('/api/stock-prices')
      .query({ stock: 'AAPL', like: 'true' })
      .end((err, res1) => {
        assert.equal(res1.status, 200);
        firstLikeCount = res1.body.stockData.likes;
        
        // Small delay to ensure different timestamps
        setTimeout(() => {
          // Second like from same IP (should not increase)
          request
            .get('/api/stock-prices')
            .query({ stock: 'AAPL', like: 'true' })
            .end((err, res2) => {
              assert.equal(res2.status, 200);
              assert.equal(res2.body.stockData.stock, 'AAPL');
              assert.equal(res2.body.stockData.likes, firstLikeCount, 'Likes should not increase for same IP');
              done();
            });
        }, 100);
      });
  });

  // Test 4: Viewing two stocks
  test('Viewing two stocks: GET request to /api/stock-prices/', (done) => {
    request
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        
        // Check first stock
        assert.property(res.body.stockData[0], 'stock');
        assert.property(res.body.stockData[0], 'price');
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.isNumber(res.body.stockData[0].price);
        assert.isNumber(res.body.stockData[0].rel_likes);
        
        // Check second stock
        assert.property(res.body.stockData[1], 'stock');
        assert.property(res.body.stockData[1], 'price');
        assert.property(res.body.stockData[1], 'rel_likes');
        assert.isNumber(res.body.stockData[1].price);
        assert.isNumber(res.body.stockData[1].rel_likes);
        
        // Verify rel_likes are opposites
        assert.equal(res.body.stockData[0].rel_likes, -res.body.stockData[1].rel_likes);
        
        done();
      });
  });

  // Test 5: Viewing two stocks and liking them
  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', (done) => {
    request
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'], like: 'true' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        
        // Check both stocks have rel_likes property
        assert.property(res.body.stockData[0], 'rel_likes');
        assert.property(res.body.stockData[1], 'rel_likes');
        assert.isNumber(res.body.stockData[0].rel_likes);
        assert.isNumber(res.body.stockData[1].rel_likes);
        
        // Verify rel_likes are opposites (difference between likes)
        assert.equal(res.body.stockData[0].rel_likes, -res.body.stockData[1].rel_likes);
        
        done();
      });
  });

  after(() => {
    request.close();
  });
});