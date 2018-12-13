const ghostBookshelf = require('./base');

const Context = ghostBookshelf.Model.extend({
    tableName: 'contexts'
}, {});

module.exports = {
    Context: ghostBookshelf.model('Context', Context)
};
