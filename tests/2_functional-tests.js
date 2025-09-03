const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

  test('stockData includes stock (string), price (number), and likes (number)', function(done) {
    chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG' })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.property(res.body, 'stockData');

            const stockData = res.body.stockData;

            assert.property(stockData, 'stock');
            assert.isString(stockData.stock, 'Stock symbol should be a string');

            assert.property(stockData, 'price');
            assert.isNumber(stockData.price, 'Price should be a number');
        
            assert.property(stockData, 'likes');
            assert.isNumber(stockData.likes, 'Likes should be a number');
        
            done();
        });
    });

});
