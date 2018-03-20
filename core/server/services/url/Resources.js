'use strict';

const debug = require('ghost-ignition').debug('services:url:resources'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Resource = require('./Resource'),
    common = require('../../lib/common');

/**
 * These are the default resources and filters.
 * These are the minimum filters for public accessibility of resources.
 *
 * @TODO:
 * - optimise how we select the fields
 * - choose all fields, but exclude none exposed fields
 * - exclude formats
 * - how to
 */
const resourcesConfig = [
    {
        type: 'posts',
        apiOptions: {
            filter: 'visibility:public+status:published+page:0',
            fields: 'id,slug,title,status,visibility,featured,updated_at,created_at,published_at',
            include: [
                {
                    type: 'tags',
                    alias: 'primary_tag',
                    innerJoin: {
                        relation: 'posts_tags',
                        condition: ['tags.id', '=', 'tag_id']
                    },
                    select: ['post_id', 'tags.id', 'tags.slug'],
                    keep: ['id', 'slug'],
                    whereIn: 'post_id',
                    where: ['sort_order', '=', 0]
                },
                {
                    type: 'users',
                    alias: 'primary_author',
                    innerJoin: {
                        relation: 'posts_authors',
                        condition: ['users.id', '=', 'author_id']
                    },
                    select: ['post_id', 'users.id', 'users.slug'],
                    keep: ['id', 'slug'],
                    whereIn: 'post_id',
                    where: ['sort_order', '=', 0]
                }
            ]
        },
        events: {
            add: ['post.published'],
            update: ['post.published.edited'],
            remove: ['post.unpublished']
        }
    },
    {
        type: 'pages',
        modelName: 'posts',
        apiOptions: {
            filter: 'visibility:public+status:published+page:1',
            fields: 'id,slug,title,status,visibility,featured,updated_at,created_at,published_at'
        },
        events: {
            add: ['page.published'],
            update: ['page.published.edited'],
            remove: ['page.unpublished']
        }
    },
    {
        type: 'tags',
        apiOptions: {
            filter: 'visibility:public',
            fields: 'id,slug,visibility,updated_at,created_at'
        },
        events: {
            add: ['tag.added'],
            update: ['tag.edited'],
            remove: ['tag.deleted']
        }
    },
    {
        type: 'users',
        apiOptions: {
            filter: 'visibility:public',
            fields: 'id,slug,visibility,updated_at,created_at'
        },
        events: {
            add: ['user.activated'],
            update: ['user.activated.edited'],
            remove: ['user.deactivated']
        }
    }
];

/**
 * NOTE: We are querying knex directly, because the Bookshelf ORM overhead is too slow.
 */
class Resources {
    constructor(queue) {
        this.queue = queue;
        this.data = {};
        this._listeners();
    }

    _listeners() {
        /**
         * Is triggered when the database is ready.
         * See server/data/db/health.
         *
         * This is the trigger to start fetching our resources.
         */
        common.events.on('settings.cache.ready', () => {
            const ops = [];
            debug('db ready. settings cache ready.');

            _.each(resourcesConfig, (resourceConfig) => {
                this.data[resourceConfig.type] = [];
                ops.push(this._fetch(resourceConfig));
            });

            Promise.all(ops)
                .then(() => {
                    // CASE: all resources are fetched, start the queue
                    this.queue.start({
                        event: 'init',
                        tolerance: 100
                    });
                });
        });

        /**
         * Register model events.
         * If models are added, updated, removed - we have to know that.
         */
        _.each(resourcesConfig, (resourceConfig) => {
            common.events.onMany(resourceConfig.events.add, (model) => {
                this._onResourceAdded(resourceConfig.type, model);
            });

            common.events.onMany(resourceConfig.events.update, (model) => {
                this._onResourceUpdated(resourceConfig.type, model);
            });

            common.events.onMany(resourceConfig.events.remove, (model) => {
                this._onResourceRemoved(resourceConfig.type, model);
            });
        });
    }

    _fetch(resourceConfig) {
        const gql = require('ghost-gql'),
            db = require('../../data/db');

        debug('_fetch', resourceConfig.type, resourceConfig.apiOptions);

        let query = db.knex(resourceConfig.modelName || resourceConfig.type);

        // select fields
        query.select(resourceConfig.apiOptions.fields.split(','));

        // filter data
        gql.knexify(query, gql.parse(resourceConfig.apiOptions.filter));

        return query.then((objects) => {
            debug('fetched', resourceConfig.type);
            let props = {};

            if (!resourceConfig.apiOptions.include) {
                _.each(objects, (object) => {
                    this.data[resourceConfig.type].push(new Resource(resourceConfig.type, object));
                });

                return;
            }

            _.each(resourceConfig.apiOptions.include, (toInclude) => {
                props[toInclude.alias || toInclude.type] = (() => {
                    debug('fetch include', toInclude.alias || toInclude.type);

                    let query = db.knex(toInclude.type);

                    _.each(toInclude.select, (key) => {
                        query.select(key);
                    });

                    query.innerJoin(
                        toInclude.innerJoin.relation,
                        toInclude.innerJoin.condition[0],
                        toInclude.innerJoin.condition[1],
                        toInclude.innerJoin.condition[2]
                    );

                    query.whereIn(toInclude.whereIn, _.map(objects, 'id'));
                    query.where(toInclude.where[0], toInclude.where[1], toInclude.where[2]);

                    return query
                        .then((relations) => {
                            debug('fetched included', toInclude.alias || toInclude.type);

                            // arr => obj (faster access)
                            return relations.reduce((obj, item) => {
                                obj[item[toInclude.whereIn]] = _.pick(item, toInclude.keep);
                                return obj;
                            }, {});
                        });
                })();
            });

            return Promise.props(props)
                .then((relations) => {
                    debug('attach relations', resourceConfig.type);

                    _.each(objects, (object) => {
                        _.each(Object.keys(relations), (relation) => {
                            if (!relations[relation][object.id]) {
                                return;
                            }

                            object[relation] = relations[relation][object.id];
                        });

                        this.data[resourceConfig.type].push(new Resource(resourceConfig.type, object));
                    });

                    debug('attached relations', resourceConfig.type);
                });
        });
    }

    _onResourceAdded(type, model) {
        const resource = new Resource(type, _.pick(model.toJSON(), _.find(resourcesConfig, {type: type}).apiOptions.fields.split(',')));

        this.data[type].push(resource);

        this.queue.start({
            event: 'added',
            action: 'added:' + model.id,
            eventData: {
                id: model.id,
                type: type
            }
        });
    }

    /**
     * CASE:
     *  - post was fetched on bootstrap
     *  - that means, the post is already published
     *  - resource exists, but nobody owns it
     *  - if the model changes, it can be that somebody will then own the post
     *
     * CASE:
     *   - post was fetched on bootstrap
     *   - that means, the post is already published
     *   - resource exists and is owned by somebody
     *   - but the data changed and is maybe no longer owned?
     *   - e.g. featured:false changes and your filter requires featured posts
     */
    _onResourceUpdated(type, model) {
        this.data[type].every((resource) => {
            if (resource.data.id === model.id) {
                resource.update(model.toJSON());

                // CASE: pretend it was added
                if (!resource.isTaken()) {
                    this.queue.start({
                        event: 'added',
                        action: 'added:' + model.id,
                        eventData: {
                            id: model.id,
                            type: type
                        }
                    });
                }

                // break!
                return false;
            }

            return true;
        });
    }

    _onResourceRemoved(type, model) {
        let index = null;

        this.data[type].every((resource, _index) => {
            if (resource.data.id === model._previousAttributes.id) {
                if (resource.isTaken()) {
                    resource.remove();
                }

                index = _index;

                // break!
                return false;
            }

            return true;
        });

        // CASE: there are possible cases that the resource was not fetched e.g. visibility is internal
        if (index === null) {
            debug('can\'t find resource', model._previousAttributes.id);
            return;
        }

        delete this.data[type][index];
    }

    removeResource(type, resource) {
        const index = _.findIndex(this.data[type], {uid: resource.id});
        delete this.data[type][index];
    }

    getAll(type) {
        return this.data[type];
    }

    getByIdAndType(type, id) {
        return _.find(this.data[type], {data: {id: id}});
    }

    create(type, data) {
        const resource = new Resource(type, data);

        if (!this.data[type]) {
            this.data[type] = [];
        }

        this.data[type].push(resource);
        return resource;
    }
}

module.exports = Resources;
