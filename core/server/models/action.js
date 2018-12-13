const ghostBookshelf = require('./base');

const Action = ghostBookshelf.Model.extend({
    tableName: 'actions',

    resource: function () {
        return this.morphTo('resource', ['performer_type', 'performer_id'], ['User', 'user'], ['Integration', 'integration']);
    }
});

module.exports = {
    Action: ghostBookshelf.model('Action', Action)
};
