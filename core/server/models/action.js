const _ = require('lodash');
const ghostBookshelf = require('./base');

const candidates = [];

_.each(ghostBookshelf._models, (model) => {
    candidates.push([model, model.prototype.tableName.replace(/s$/, '')]);
});

// Context Implementation: https://github.com/kirrg001/Ghost/commit/b8717de16450faccf15efbd91182dd1ccca22971
const Action = ghostBookshelf.Model.extend({
    tableName: 'actions',

    actor() {
        return this.morphTo('actor', ['actor_type', 'actor_id'], ...candidates);
    },

    resource() {
        return this.morphTo('resource', ['resource_type', 'resource_id'], ...candidates);
    }
}, {
    add(data, unfilteredOptions = {}) {
        const options = this.filterOptions(unfilteredOptions, 'add');
        return ghostBookshelf.Model.add.call(this, data, options);
    }
});

module.exports = {
    Action: ghostBookshelf.model('Action', Action)
};
