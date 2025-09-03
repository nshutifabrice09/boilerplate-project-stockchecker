const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  test('Viewing two stocks and liking them: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices/')
      .query({ stock: ['GOOG', 'AAPL'], like: true }) // two stocks with like
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'stockData');
        assert.isArray(res.body.stockData, 'stockData should be an array');
        assert.lengthOf(res.body.stockData, 2);

        // First stock
        assert.equal(res.body.stockData[0].stock, 'GOOG');
        assert.property(res.body.stockData[0], 'price');
        assert.property(res.body.stockData[0], 'rel_likes'); // relative likes

        // Second stock
        assert.equal(res.body.stockData[1].stock, 'AAPL');
        assert.property(res.body.stockData[1], 'price');
        assert.property(res.body.stockData[1], 'rel_likes'); // relative likes

        // Optional: relative likes logic check
        const relLikesSum = res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes;
        assert.equal(relLikesSum, 0, 'Relative likes should sum to 0');

        done();
      });
  });

});