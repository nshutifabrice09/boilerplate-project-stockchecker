const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  test('Viewing one stock: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices/')
      .query({ stock: 'GOOG' }) // replace 'GOOG' with the stock symbol you want to test
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData'); // make sure the response has stockData
        assert.equal(res.body.stockData.stock, 'GOOG'); // check the stock symbol
        assert.property(res.body.stockData, 'price'); // check that price exists
        done();
      });
  });

});

