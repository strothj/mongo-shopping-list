/* eslint-disable no-console */
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const config = require('./config');

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

const Item = require('./models/item');

function dbItemToJsonItem(item) {
  return { id: item._id, name: item.name }; // eslint-disable-line no-underscore-dangle
}

app.get('/items', (req, res) => {
  Item.find((err, items) => {
    if (err) {
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }
    res.json(items.map(item => dbItemToJsonItem(item)));
  });
});

function createItem(req, res) {
  Item.create({
    name: req.body.name,
  }, (err, item) => {
    if (err) {
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }
    res.status(201).json(dbItemToJsonItem(item));
  });
}

app.post('/items', (req, res) => {
  if (!req.body.name || req.body.id) {
    res.status(400).json({
      message: 'Malformed Message',
    });
    return;
  }
  createItem(req, res);
});

app.put('/items/:id', (req, res) => {
  const update = { $set: { name: req.body.name } };
  const options = { upsert: true };
  if ((req.body.id !== req.params.id) || !req.body.name) {
    res.status(400).json({
      message: 'Malformed Message',
    });
    return;
  }
  Item.findByIdAndUpdate(req.params.id, update, options, (err, item) => {
    if (err) {
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }
    res.status(200).json(item);
  });
});

app.delete('/items/:id', (req, res) => {
  Item.findByIdAndRemove(req.params.id, (err, item) => {
    if (err) {
      res.status(500).json({
        message: 'Internal Server Error',
      });
      return;
    }
    res.status(200).json(item);
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
