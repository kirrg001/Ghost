'use strict';

const debug = require('ghost-ignition').debug('services:url:resources'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Queue = require('./queue'),
    Resource = require('./Resource'),
    common = require('../../lib/common');

/**
 * These are the default resources and filters.
 * The default filter is the basic resource ground, it's like a minimal filter.
 * This is a simple version of a data cache.
 *
 * @TODO: move events here
 */
const resourcesConfig = [
    {
        type: 'posts',
        apiOptions: {
            filter: 'visibility:public+status:published',
            fields: 'id,slug,title,status,visibility,featured,page,updated_at,created_at,published_at',
            include: [
                {
                    type: 'tags',
                    innerJoin: {
                        relation: 'posts_tags',
                        condition: ['tags.id', '=', 'tag_id']
                    },
                    select: ['post_id', 'tags.id', 'tags.slug'],
                    whereIn: 'post_id',
                    where: ['sort_order', '=', 0]
                },
                {
                    type: 'users',
                    alias: 'authors',
                    innerJoin: {
                        relation: 'posts_authors',
                        condition: ['users.id', '=', 'author_id']
                    },
                    select: ['post_id', 'users.id', 'users.slug'],
                    whereIn: 'post_id',
                    where: ['sort_order', '=', 0]
                }
            ]
        }
    },
    {
        type: 'tags',
        apiOptions: {
            filter: 'visibility:public',
            fields: 'id,slug,visibility,updated_at,created_at'
        }
    },
    {
        type: 'users',
        apiOptions: {
            filter: 'visibility:public',
            fields: 'id,email,slug,visibility,updated_at,created_at'
        }
    }
];

/**
 * NOTE: We are querying knex directly, because the Bookshelf ORM overhead is too slow.
 */
class Resources {
    constructor() {
        this.queues = {};
        this.data = {};
        this.listeners();
    }

    listeners() {
        common.events.on('db.ready', () => {
            debug('db ready');

            _.map(resourcesConfig, (resourceConfig) => {
                this.data[resourceConfig.type] = [];
                this.queues[resourceConfig.type] = new Queue(resourceConfig.type);
                this.fetch(resourceConfig);
            });
        });

        common.events.onMany([
            'post.published',
            'page.published'
        ], (model) => {
            let type = model.tableName;
            const resource = new Resource(type, model.toJSON());

            this.data[type].push(resource);

            this.queues[type].start({
                event: 'added',
                action: 'added:' + model.id,
                eventData: resource
            });
        });

        /**
         * CASE:
         *  - post is published
         *  - resource exists, but nobody owns it
         *
         * CASE:
         *   - post is published
         *   - resource exists and is owned
         *   - but the data changed and it's no longer owned
         */
        common.events.onMany([
            'post.published.edited'
        ], (model) => {
            let type = model.tableName;

            this.data[type].every((resource) => {
                if (resource.data.id === model.id) {
                    if (resource.isTaken()) {
                        resource.update(model.toJSON());
                    } else {
                        resource.update(model.toJSON(), {noEvent: true});

                        // pretend it was added ;)
                        this.queues[type].start({
                            event: 'added',
                            action: 'added:' + model.id,
                            eventData: resource
                        });
                    }

                    // break!
                    return false;
                }

                return true;
            });
        });

        common.events.onMany([
            'post.unpublished',
            'page.unpublished'
        ], (model) => {
            let type = model.tableName,
                index = null;

            this.data[type].every((resource, _index) => {
                if (resource.data.id === model.id) {

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
                debug('can\'t find resource', model.id);
                return;
            }

            delete this.data[type][index];
        });
    }

    hasType(type) {
        return _.find(resourcesConfig, {type: type});
    }

    free(resource) {
        // pretend it was added ;)
        this.queues[resource.getType()].start({
            event: 'added',
            action: 'added:' + resource.data.id,
            eventData: resource
        });
    }

    onAll(type, cb) {
        this.queues[type].add({
            event: 'init',
            tolerance: 100
        }, () => {
            return cb(this.data[type]);
        });
    }

    onAdded(type, cb) {
        this.queues[type].add({
            event: 'added'
        }, cb);
    }

    fetch(resourceConfig) {
        const gql = require('ghost-gql'),
            db = require('../../data/db');

        debug('fetch', resourceConfig.type, resourceConfig.apiOptions);

        let query = db.knex(resourceConfig.type);

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

                this.queues[resourceConfig.type].start({
                    event: 'init',
                    tolerance: 100
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
                                obj[item.id] = item;
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
                            object[relation] = [relations[relation][object.id]];
                        });

                        this.data[resourceConfig.type].push(new Resource(resourceConfig.type, object));
                    });

                    debug('attached relations', resourceConfig.type);
                    this.queues[resourceConfig.type].start({
                        event: 'init',
                        tolerance: 100
                    });
                });
        });
    }
}

// Singleton
module.exports = new Resources();
