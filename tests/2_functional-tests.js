const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  test('GET /api/stock-prices with stock query parameter returns stockData', function(done){
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: 'AAPL' }) 
      .end(function(err, res) {
        assert.equal(res.status, 200);          
        assert.property(res.body, 'stockData');  
        done();
      });
  });

});
