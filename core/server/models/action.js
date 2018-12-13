const _ = require('lodash');
const ghostBookshelf = require('./base');

const candidates = [];

_.each(ghostBookshelf._models, (model) => {
    candidates.push([model, model.prototype.tableName.replace(/s$/, '')]);
});

const Action = ghostBookshelf.Model.extend({
    tableName: 'actions',

    relationships: ['context'],

    relationshipBelongsTo: {
        context: 'contexts'
    },

    actor() {
        return this.morphTo('actor', ['actor_type', 'actor_id'], ...candidates);
    },

    resource() {
        return this.morphTo('resource', ['resource_type', 'resource_id'], ...candidates);
    },

    context() {
        return this.belongsTo('Context', 'context_id');
    },

    permittedAttributes() {
        let filteredKeys = ghostBookshelf.Model.prototype.permittedAttributes.apply(this, arguments);

        this.relationships.forEach((key) => {
            filteredKeys.push(key);
        });

        return filteredKeys;
    }
}, {
    add(data, unfilteredOptions = {}) {
        const options = this.filterOptions(unfilteredOptions, 'add');
        return ghostBookshelf.Model.add.call(this, data, options);
    },

    filterData(data) {
        const filteredData = ghostBookshelf.Model.filterData.apply(this, arguments);
        const extraData = _.pick(data, this.prototype.relationships);

        _.merge(filteredData, extraData);
        return filteredData;
    }
});

module.exports = {
    Action: ghostBookshelf.model('Action', Action)
};
