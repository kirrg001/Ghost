const ghostBookshelf = require('./base');

const Action = ghostBookshelf.Model.extend({
    tableName: 'actions',

    resource: function () {
        return this.morphTo('resource', ['performer_type', 'performer_id'], ['User', 'user'], ['Integration', 'integration']);
    }
}, {
    permittedOptions: function permittedOptions(methodName) {
        var options = ghostBookshelf.Model.permittedOptions.call(this, methodName),

            // whitelists for the `options` hash argument on methods, by method name.
            // these are the only options that can be passed to Bookshelf / Knex.
            validOptions = {
                findOne: ['columns', 'importing', 'withRelated', 'require'],
                findPage: ['page', 'limit', 'columns', 'filter', 'order', 'status', 'staticPages'],
                findAll: ['columns', 'filter'],
                destroy: ['destroyAll']
            };

        if (validOptions[methodName]) {
            options = options.concat(validOptions[methodName]);
        }

        return options;
    }
});

module.exports = {
    Action: ghostBookshelf.model('Action', Action)
};
