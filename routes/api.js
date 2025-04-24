'use strict';
const axios = require('axios');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const crypto = require('crypto');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      const ip = req.ip;
      const hashedIp = crypto.createHash('sha256').update(ip).digest('hex');

      const fetchStockData = async (symbol) => {
        const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
        const response = await axios.get(url);
        return { symbol: response.data.symbol, price: response.data.latestPrice };
      };

      const processStock = async (symbol) => {
        const stockData = await fetchStockData(symbol);
        let stockDoc = await Stock.findOne({ symbol: stockData.symbol });

        if (!stockDoc) {
          stockDoc = new Stock({ symbol: stockData.symbol, likes: like ? [hashedIp] : [] });
        } else {
          if (like && !stockDoc.likes.includes(hashedIp)) {
            stockDoc.likes.push(hashedIp);
          }
        }

        await stockDoc.save();
        return {
          stock: stockData.symbol,
          price: stockData.price,
          likes: stockDoc.likes.length
        };
      };

      try {
        if (Array.isArray(stock)) {
          const [stock1, stock2] = await Promise.all([
            processStock(stock[0]),
            processStock(stock[1])
          ]);
          const rel_likes1 = stock1.likes - stock2.likes;
          const rel_likes2 = stock2.likes - stock1.likes;

          res.json({
            stockData: [
              { stock: stock1.stock, price: stock1.price, rel_likes: rel_likes1 },
              { stock: stock2.stock, price: stock2.price, rel_likes: rel_likes2 }
            ]
          });
        } else {
          const stockData = await processStock(stock);
          res.json({ stockData });
        }
      } catch (error) {
        res.status(500).json({ error: 'Error retrieving stock data' });
      }
    });
};
