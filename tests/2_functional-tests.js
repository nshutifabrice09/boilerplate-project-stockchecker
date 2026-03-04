const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const Stock = require('../models/Stock');

chai.use(chaiHttp);
const { assert } = chai;
const request = chai.request(server).keepOpen();

suite('Functional Tests', function() {
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
  });

  test('Viewing one stock: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.property(res.body.stockData, 'stock');
    assert.property(res.body.stockData, 'price');
    assert.property(res.body.stockData, 'likes');
    assert.equal(res.body.stockData.stock, 'GOOG');
    assert.isNumber(res.body.stockData.price);
    assert.isNumber(res.body.stockData.likes);
  });

  test('Viewing one stock and liking it: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: 'MSFT', like: true });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.equal(res.body.stockData.stock, 'MSFT');
    assert.isNumber(res.body.stockData.likes);
    assert.isAtLeast(res.body.stockData.likes, 1);
  });

  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', async () => {
    // First like
    const res1 = await request
      .get('/api/stock-prices')
      .query({ stock: 'AAPL', like: true });

    const likesAfterFirst = res1.body.stockData.likes;

    // Second like from same IP
    const res2 = await request
      .get('/api/stock-prices')
      .query({ stock: 'AAPL', like: true });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.stockData.likes, likesAfterFirst);
  });

  test('Viewing two stocks: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.isArray(res.body.stockData);
    assert.lengthOf(res.body.stockData, 2);
    
    res.body.stockData.forEach((item) => {
      assert.property(item, 'stock');
      assert.property(item, 'price');
      assert.property(item, 'rel_likes');
      assert.isNumber(item.price);
      assert.isNumber(item.rel_likes);
    });
  });

  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'], like: true });

    assert.equal(res.status, 200);
    assert.isArray(res.body.stockData);
    assert.lengthOf(res.body.stockData, 2);
    
    // Verify rel_likes calculation (difference between likes)
    const likes1 = res.body.stockData[0].rel_likes;
    const likes2 = res.body.stockData[1].rel_likes;
    assert.equal(likes1, -likes2);
  });

  after(async () => {
    await db.end();
    request.close();
  });
});
  // Clear database before tests
  before(async () => {
    await Stock.deleteMany({});
  });

  // Helper function defined outside test blocks - this is fine
  const getClientIP = (res) => {
    return res.request.socket.remoteAddress;
  };

  test('Viewing one stock: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.property(res.body.stockData, 'stock');
    assert.property(res.body.stockData, 'price');
    assert.property(res.body.stockData, 'likes');
    assert.equal(res.body.stockData.stock, 'GOOG');
    assert.isNumber(res.body.stockData.price);
    assert.isNumber(res.body.stockData.likes);
  });

  test('Viewing one stock and liking it: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: 'MSFT', like: true });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.equal(res.body.stockData.stock, 'MSFT');
    assert.isNumber(res.body.stockData.likes);
    assert.isAtLeast(res.body.stockData.likes, 1);
  });

  test('Viewing the same stock and liking it again: GET request to /api/stock-prices/', async () => {
    // First like
    const res1 = await request
      .get('/api/stock-prices')
      .query({ stock: 'AAPL', like: true });

    const likesAfterFirst = res1.body.stockData.likes;

    // Second like from same IP
    const res2 = await request
      .get('/api/stock-prices')
      .query({ stock: 'AAPL', like: true });

    assert.equal(res2.status, 200);
    assert.equal(res2.body.stockData.likes, likesAfterFirst);
  });

  test('Viewing two stocks: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'] });

    assert.equal(res.status, 200);
    assert.property(res.body, 'stockData');
    assert.isArray(res.body.stockData);
    assert.lengthOf(res.body.stockData, 2);
    
    res.body.stockData.forEach((item) => {
      assert.property(item, 'stock');
      assert.property(item, 'price');
      assert.property(item, 'rel_likes');
      assert.isNumber(item.price);
      assert.isNumber(item.rel_likes);
    });
  });

  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', async () => {
    const res = await request
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'MSFT'], like: true });

    assert.equal(res.status, 200);
    assert.isArray(res.body.stockData);
    assert.lengthOf(res.body.stockData, 2);
    
    // Verify rel_likes calculation (difference between likes)
    const likes1 = res.body.stockData[0].rel_likes;
    const likes2 = res.body.stockData[1].rel_likes;
    assert.equal(likes1, -likes2);
  });

  after(() => {
    request.close();
  });
});