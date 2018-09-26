const _ = require('lodash');
const INTERNAL_OPTIONS = ['transacting', 'forUpdate', 'context'];

module.exports = {
    all(config, options) {
        if (!options.apiOptions.context.internal) {
            Object.assign(options.apiOptions, _.omit(options.apiOptions, INTERNAL_OPTIONS));
        }

        if (config.queryOptions) {
            if (typeof config.queryOptions === 'function') {
                config.queryOptions = config.queryOptions(options);
            }

            Object.assign(options.apiOptions, _.pick(options.params, config.queryOptions));
            Object.assign(options.apiOptions, _.pick(options.query, config.queryOptions));
        }

        options.queryData = {};

        if (config.queryData) {
            if (typeof config.queryData === 'function') {
                config.queryData = config.queryData(options);
            }

            options.queryData = Object.assign(options.queryData, _.pick(options.query, config.queryData));
            options.queryData = Object.assign(options.queryData, _.pick(options.params, config.queryData));
        }
    }
};
