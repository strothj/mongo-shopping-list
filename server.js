/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const config = require('./config');

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

const Item = require('./models/item');

app.get('/items', (req, res) => {
  Item.find((err, items) => {
    if (err) {
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }
    res.json(items);
  });
});

app.post('/items', (req, res) => {
  Item.create({
    name: req.body.name,
  }, (err, item) => {
    if (err) {
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }
    res.status(201).json(item);
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Not Found',
  });
});

const runServer = (callback) => {
  mongoose.connect(config.DATABASE_URL, (err) => {
    if (err && callback) {
      callback(err);
      return;
    }

    app.listen(config.PORT, () => {
      console.log(`Listening on localhost: ${config.PORT}`);
      if (callback) {
        callback();
      }
    });
  });
};

if (require.main === module) {
  runServer((err) => {
    if (err) {
      console.error(err);
    }
  });
}

exports.app = app;
exports.runServer = runServer;
