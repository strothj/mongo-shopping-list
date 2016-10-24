global.DATABASE_URL = 'mongodb://localhost/shopping-list-test';

const chai = require('chai');
const chaiHttp = require('chai-http');

const server = require('../server.js');
const Item = require('../models/item');

const should = chai.should();
const app = server.app;

chai.use(chaiHttp);

function itemSortById(a, b) {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function getActualFromDatabase() {
  return Item.find().exec() // eslint-disable-next-line no-underscore-dangle
    .then(dbItems => dbItems.map(item => ({ name: item.name, id: item._id.toString() })))
    .then(items => (items.sort(itemSortById)));
}

describe('Shopping List', () => {
  let expected;

  before((done) => {
    server.runServer((err) => {
      if (err) {
        done(err);
        return;
      }
      done();
    });
  });

  beforeEach(() => (
    Item.remove().exec()
      .then(() => (
        Item.create([
          { name: 'Broad beans' },
          { name: 'Tomatoes' },
          { name: 'Peppers' },
        ])
      ))
      .then((dbItems) => {
        expected = dbItems // eslint-disable-next-line no-underscore-dangle
          .map(item => ({ name: item.name, id: item._id.toString() }))
          .sort(itemSortById);
      })
  ));

  after(() => Item.remove().exec());

  it('should list items on GET', () => (
    chai.request(app)
      .get('/items')
      .then((res) => {
        res.should.have.status(200);
        res.should.be.json;
        const actual = res.body.sort(itemSortById);
        expected.should.deep.equal(actual);
      })
  ));

  it('should add an item on POST', () => (
    chai.request(app)
      .post('/items')
      .send({ name: 'Kale' })
      .then((res) => {
        res.should.have.status(201);
        res.should.be.json;
        res.should.be.a('object');
        const newItem = res.body;
        newItem.should.have.property('id');
        newItem.id.should.be.a('string');
        newItem.should.have.property('name');
        newItem.name.should.be.a('string');
        newItem.name.should.equal('Kale');
        expected.push(newItem);
        expected = expected.sort(itemSortById);
      })
      .then(getActualFromDatabase)
      .then((actual) => {
        expected.should.deep.equal(actual);
      })
  ));

  it('should edit an item on put', () => {
    expected[2].name = 'Bob';
    return chai.request(app)
      .put(`/items/${expected[2].id}`)
      .send(expected[2])
      .then((res) => {
        res.should.have.status(204);
      })
      .then(getActualFromDatabase)
      .then((actual) => {
        expected.should.deep.equal(actual);
      });
  });

  it('should delete an item on delete', () => {
    const deletedItemId = expected.splice(1, 1)[0].id;
    return chai.request(app)
      .delete(`/items/${deletedItemId}`)
      .then((res) => {
        res.should.have.status(204);
      })
      .then(getActualFromDatabase)
      .then((actual) => {
        expected.should.deep.equal(actual);
      });
  });

  it('should return error on post of existing id', (done) => {
    const existingItem = expected[2];
    chai.request(app)
      .post('/items')
      .send(existingItem)
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(400);
        getActualFromDatabase()
          .then((actual) => {
            expected.should.deep.equal(actual);
            done();
          });
      });
  });

  it('should return error on post with empty body', (done) => {
    chai.request(app)
      .post('/items')
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(400);
        getActualFromDatabase()
          .then((actual) => {
            expected.should.deep.equal(actual);
            done();
          });
      });
  });

  it('should return error on post with non-json body', (done) => {
    chai.request(app)
      .post('/items')
      .field('name', 'Bob')
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(400);
        getActualFromDatabase()
          .then((actualItems) => {
            actualItems.should.have.lengthOf(3);
            done();
          });
      });
  });

  it('should return error on put without id on endpoint', (done) => {
    const expectedId = expected[0].id;
    chai.request(app)
      .put('/items/')
      .send({ name: 'Apple', id: expectedId })
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(404);
        getActualFromDatabase()
          .then((actual) => {
            expected.should.deep.equal(actual);
            done();
          });
      });
  });

  it('should return error on put with different id in endpoint than body', (done) => {
    chai.request(app)
      .put(`/items/${expected[0].id}`)
      .send({ name: 'Bob', id: expected[1].id })
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(400);
        getActualFromDatabase()
          .then((actual) => {
            expected.should.deep.equal(actual);
            done();
          });
      });
  });

  it('should create item on put to id that does not exist', () => {
    const nonexistantItem = expected[0];
    return Item.remove({ _id: nonexistantItem.id }).exec()
      .then(() => (
        chai.request(app)
          .put(`/items/${nonexistantItem.id}`)
          .send(nonexistantItem)
      ))
      .then(getActualFromDatabase)
      .then((actual) => {
        expected.should.deep.equal(actual);
      });
  });

  it('should return error on put without body data', (done) => {
    chai.request(app)
      .put(`/items/${expected[0].id}`)
      .send({})
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(400);
        done();
      });
  });

  it('should return error on put with non-json body', (done) => {
    chai.request(app)
      .put(`/items/${expected[0].id}`)
      .field('name', 'Bob')
      .field('id', expected[0].id)
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(400);
        done();
      });
  });

  it('should return error on delete on item that does not exist', (done) => {
    const nonexistantItem = expected[0];
    Item.remove({ _id: nonexistantItem.id }).exec()
      .then(() => {
        chai.request(app)
          .delete(`/items/${nonexistantItem.id}`)
          .end((err, res) => {
            should.not.equal(err, null);
            res.should.have.status(404);
            done();
          });
      });
  });

  it('should return error on delete without id in endpoint', (done) => {
    chai.request(app)
      .delete('/items/')
      .end((err, res) => {
        should.not.equal(err, null);
        res.should.have.status(404);
        done();
      });
  });
});
