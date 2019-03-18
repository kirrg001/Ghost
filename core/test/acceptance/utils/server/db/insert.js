const Promise = require('bluebird');
const knex = require('knex');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const AdminSDK = require('@tryghost/admin-api');

module.exports = (options, {dataSet}) => {
    const connection = knex({
        client: 'sqlite3',
        connection: {
            filename: options.ghostConfig.database__connection__filename
        }
    });

    const lines = fs.readFileSync(path.join(__dirname, dataSet, 'bootstrap.txt'), 'utf-8').split('\n');

    return Promise.each(lines, (line, i) => {
        if (!line.length) {
            return;
        }

        return connection.raw(line);
    }).then(() => {
        const data = require(`./${dataSet}/data`);
        const api = new AdminSDK({
            url: options.ghostConfig.url,
            version: 'v2',
            key: `5c8fcdb00e71350476ff9e9b:${_.repeat('a', 64)}`
        });

        return Promise.each(Object.keys(data), (resourceName) => {
            console.log(resourceName);
            return Promise.map(data[resourceName], (entry) => {
                return api[resourceName].add(entry);
            }, {concurrency: 100});
        });
    });
};
