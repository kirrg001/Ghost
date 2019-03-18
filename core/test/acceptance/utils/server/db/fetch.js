const _ = require('lodash');
const Promise = require('bluebird');

module.exports = () => {
    const models = require('../../../../../server/models');
    models.init();

    const keys = Object.keys(models);
    const data = {};

    return Promise.map(keys, (key) => {
        if (key === 'Base') {
            return;
        }

        if (key === 'init') {
            return;
        }

        console.log(key);
        return models[key]
            .findAll({columns: ['id']})
            .then((response) => {
                data[key] = response;
            });
    }).return(data);
};
