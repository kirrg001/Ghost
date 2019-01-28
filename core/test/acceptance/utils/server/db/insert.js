const Promise = require('bluebird');

module.exports = (options) => {
    // @TODO: Ghost currently can't set the database connection for the model layer, sucks
    const config = require('../../../../../server/config');
    config.set('database:connection:filename', options.database__connection__filename);

    const models = require('../../../../../server/models');
    const db = require('../../../../../server/data/db');
    models.init();

    // CASE: clear all users, posts and tags
    return db.knex.truncate('users')
        .then(() => {
            return db.knex.truncate('tags');
        })
        .then(() => {
            return db.knex.truncate('posts');
        })
        .then(() => {
            const data = require('./data1');

            return Promise.each(Object.keys(data), (modelName) => {
                return Promise.map(data[modelName], (entry) => {
                    return models[modelName].add(entry, {context: {internal: true}});
                }, {concurrency: 100});
            });
        });
};
