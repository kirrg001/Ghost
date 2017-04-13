var moment = require('moment-timezone'),
    _ = require('lodash'),
    errors = require('../../errors'),
    debug = require('ghost-ignition').debug('models:plugin:collision');

module.exports = function (Bookshelf) {
    var ParentModel = Bookshelf.Model,
        Model;

    Model = Bookshelf.Model.extend({
        /**
         * Collision protection.
         *
         * NOTE: The `sync` method is called for any query e.g. update, add, delete, fetch
         *
         * NOTE: We had the option to override Bookshelf's `save` method, but hooking into the `sync` method gives us
         *       the ability to access the `changed` object. Bookshelf already knows which attributes has changed.
         *
         * NOTE: Bookshelf's timestamp function can't be overridden, as it's synchronous, there is no way to return an Error.
         *
         */
        sync: function timestamp(options) {
            var parentSync = ParentModel.prototype.sync.apply(this, arguments),
                originalUpdateSync = parentSync.update,
                self = this;

            if (this.tableName !== 'posts' ||
                !self.serverData ||
                ((options.method !== 'update' && options.method !== 'patch') || !options.method)
            ) {
                return parentSync;
            }

            /**
             * Only hook into the update sync
             *
             * NOTE: Even if the client sends a different `id` property, it get's ignored by bookshelf.
             *       Because you can't change the `id` of an existing post.
             * @TODO: TAGS?????????? tags always change, why
             */
            parentSync.update = function update(attrs) {
                var changed = _.omit(self.changed, [
                        'created_at', 'updated_at', 'author_id', 'id', 'tags',
                        'published_by', 'updated_by'
                    ]),
                    clientUpdatedAt = moment(self.clientData.updated_at || self.serverData.updated_at),
                    serverUpdatedAt = moment(self.serverData.updated_at);

                debug('changed', changed);

                if (Object.keys(changed).length) {
                    if (clientUpdatedAt.diff(serverUpdatedAt) !== 0) {
                        return Promise.reject(new errors.InternalServerError({
                            message: 'Uh-oh. We already have a newer version of this post saved.' +
                            'To prevent losing your text, please copy your changes somewhere else and then refresh this page.',
                            code: 'UPDATE_COLLISION'
                        }));
                    }
                }

                return originalUpdateSync.apply(this, arguments);
            };

            return parentSync;
        },


        /**
         * We have to remember current server data and client data.
         * The `sync` method has no access to it.
         * `updated_at` is already set to "Date.now" when sync.update is called.
         */
        save: function save(data, options) {
            this.clientData = _.cloneDeep(data) || {};
            this.serverData = _.cloneDeep(this.attributes);

            return ParentModel.prototype.save.apply(this, arguments);
        }
    });

    Bookshelf.Model = Model;
};
