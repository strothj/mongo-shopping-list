global.DATABASE_URL = 'mongodb://localhost/shopping-list-test';

const chai = require('chai');
const chaiHttp = require('chai-http');

const server = require('../server.js');
const Item = require('../models/item');

const should = chai.should();
const app = server.app;

chai.use(chaiHttp);

function getItems(callback) {
  Item.find((err, items) => {
    // eslint-disable-next-line no-underscore-dangle
    callback(items.map(item => ({ id: item._id.toString(), name: item.name })));
  });
}

describe('Shopping List', () => {
  let items;
  before((done) => {
    server.runServer(() => {
      done();
    });
  });

  beforeEach((done) => {
    Item.remove(() => {
      Item.create([
        { name: 'Broad beans' },
        { name: 'Tomatoes' },
        { name: 'Peppers' },
      ], (err, newItems) => {
        // eslint-disable-next-line no-underscore-dangle
        items = newItems.map(item => ({ name: item.name, id: item._id.toString() }));
        done();
      });
    });
  });

  it('should list items on GET', function (done) {
    chai.request(app)
      .get('/items')
      .end(function (err, res) {
        should.equal(err, null);
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.should.have.lengthOf(3);
        res.body[0].should.be.a('object');
        res.body[0].should.have.property('id');
        res.body[0].should.have.property('name');
        res.body[0].id.should.be.a('string');
        res.body[0].name.should.be.a('string');
        res.body[0].name.should.equal('Broad beans');
        res.body[1].name.should.equal('Tomatoes');
        res.body[2].name.should.equal('Peppers');
        done();
      });
  });
  it('should add an item on post', function (done) {
    chai.request(app)
      .post('/items')
      .send({ name: 'Kale' })
      .end(function (err, res) {
        should.equal(err, null);
        res.should.have.status(201);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('name');
        res.body.should.have.property('id');
        res.body.name.should.be.a('string');
        res.body.id.should.be.a('string');
        res.body.name.should.equal('Kale');
        const id = res.body.id;
        getItems((newItems) => {
          items = newItems;
          items.should.be.a('array');
          items.should.have.lengthOf(4);
          items[3].should.be.a('object');
          items[3].should.have.property('id');
          items[3].should.have.property('name');
          items[3].id.should.be.a('string');
          items[3].id.should.equal(id);
          items[3].name.should.be.a('string');
          items[3].name.should.equal('Kale');
          done();
        });
      });
  });
  it('should edit an item on put', function (done) {
    const expectedId = items[2].id;
    chai.request(app)
      .put(`/items/${expectedId}`)
      .send({ name: 'Bob', id: expectedId })
      .end(function (err, res) {
        should.equal(err, null);
        res.should.have.status(200);
        getItems((newItems) => {
          items = newItems;
          items[2].id.should.equal(expectedId);
          items[2].name.should.equal('Bob');
          done();
        });
      });
  });
  it('should delete an item on delete', function (done) {
    chai.request(app)
      .delete(`/items/${items[2].id}`)
      .end(function (err, res) {
        should.equal(err, null);
        res.should.have.status(200);
        getItems((newItems) => {
          items = newItems;
          items.should.have.lengthOf(2);
          items[0].name.should.equal('Broad beans');
          items[1].name.should.equal('Tomatoes');
          done();
        });
      });
  });
  it('should return error on post of existing id', function (done) {
    const existingId = items[2];
    chai.request(app)
      .post('/items')
      .send({ name: 'Another item', id: existingId })
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(400);
        // storage.items.should.have.lengthOf(3);
        done();
      });
  });
  it('should return error on post with empty body', function (done) {
    this.skip();
    chai.request(app)
      .post('/items')
      .send({})
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(400);
        // storage.items.should.have.lengthOf(3);
        done();
      });
  });
  it('should return error on post with non-json body', function (done) {
    this.skip();
    chai.request(app)
      .post('/items')
      .field('name', 'Bob')
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(400);
        // storage.items.should.have.lengthOf(3);
        done();
      });
  });
  it('should return error on put without id on endpoint', function (done) {
    this.skip();
    chai.request(app)
      .put('/items/')
      .send({ name: 'Apple', id: 0 })
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(404);
        // storage.items.should.have.lengthOf(3);
        // storage.items[0].name.should.equal('Broad beans');
        done();
      });
  });
  it('should return error on put with different id in endpoint than body', function (done) {
    this.skip();
    chai.request(app)
      .put('/items/1')
      .send({ name: 'Bob', id: 2 })
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(400);
        // storage.items.should.have.lengthOf(3);
        // storage.items[0].name.should.equal('Broad beans');
        // storage.items[0].id.should.equal(1);
        // storage.items[1].name.should.equal('Tomatoes');
        // storage.items[1].id.should.equal(2);
        done();
      });
  });
  it('should create item on put to id that does not exist', function (done) {
    this.skip();
    chai.request(app)
      .put('/items/4')
      .send({ name: 'Bob', id: 4 })
      .end(function (err, res) {
        should.equal(err, null);
        res.should.have.status(200);
        // storage.items.should.have.lengthOf(4);
        // storage.items[3].should.have.property('id');
        // storage.items[3].id.should.be.a('number');
        // storage.items[3].should.have.property('name');
        // storage.items[3].name.should.be.a('string');
        // storage.items[3].id.should.equal(4);
        // storage.items[3].name.should.equal('Bob');
        done();
      });
  });
  it('should return error on put without body data', function (done) {
    this.skip();
    chai.request(app)
      .put('/items/1')
      .send({})
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(400);
        done();
      });
  });
  it('should return error on put with non-json body', function (done) {
    this.skip();
    chai.request(app)
      .put('/items/1')
      .field('name', 'Bob')
      .field('id', 1)
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(400);
        done();
      });
  });
  it('should return error on delete on item that does not exist', function (done) {
    this.skip();
    chai.request(app)
      .delete('/items/4')
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(404);
        // storage.items.should.have.lengthOf(3);
        done();
      });
  });
  it('should return error on delete without id in endpoint', function (done) {
    this.skip();
    chai.request(app)
      .delete('/items/')
      .end(function (err, res) {
        should.not.equal(err, null);
        res.should.have.status(404);
        done();
      });
  });

  after((done) => {
    Item.remove(() => { done(); });
  });
});
