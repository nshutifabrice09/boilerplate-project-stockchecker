const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  // Viewing one stock
  test('Viewing one stock', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG' })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.price);
        assert.isNumber(res.body.stockData.likes);
        done();
      });
  });

  // Viewing one stock and liking it
  test('Viewing one stock and liking it', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: true })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.price);
        assert.isAtLeast(res.body.stockData.likes, 1); // like added
        done();
      });
  });

  // Viewing the same stock and liking it again (should not double-count)
  test('Viewing the same stock and liking it again', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'GOOG', like: true })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.equal(res.body.stockData.stock, 'GOOG');
        assert.isNumber(res.body.stockData.price);
        assert.isAtLeast(res.body.stockData.likes, 1); // like count shouldn't increase again
        done();
      });
  });

  // Viewing two stocks
  test('Viewing two stocks', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'AAPL'] })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        res.body.stockData.forEach(stock => {
          assert.isString(stock.stock);
          assert.isNumber(stock.price);
          assert.isNumber(stock.likes || 0);
        });
        done();
      });
  });

  // Viewing two stocks and liking them
  test('Viewing two stocks and liking them', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['GOOG', 'AAPL'], like: true })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.stockData);
        assert.lengthOf(res.body.stockData, 2);
        res.body.stockData.forEach(stock => {
          assert.isString(stock.stock);
          assert.isNumber(stock.price);
          assert.isAtLeast(stock.likes, 1); // like counted for each
        });
        done();
      });
  });

});