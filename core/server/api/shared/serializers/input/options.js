const _ = require('lodash');
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];
const DEFAULT_OPTIONS = ['context'];

module.exports = {
    all(config, options) {
        Object.assign(options.apiOptions, _.pick(options.query, DEFAULT_OPTIONS));
        Object.assign(options.apiOptions, _.pick(options.params, DEFAULT_OPTIONS));

        if (options.apiOptions.context.internal) {
            Object.assign(options.apiOptions, _.pick(options.query, INTERNAL_OPTIONS));
            Object.assign(options.apiOptions, _.pick(options.params, INTERNAL_OPTIONS));
        }

        if (config.queryOptions) {
            if (typeof config.queryOptions === 'function') {
                config.queryOptions = config.queryOptions(options);
            }

            Object.assign(options.apiOptions, _.pick(options.params, config.queryOptions));
            Object.assign(options.apiOptions, _.pick(options.query, config.queryOptions));
        }

        if (config.queryData) {
            if (typeof config.queryData === 'function') {
                config.queryData = config.queryData(options);
            }

            options.queryData = Object.assign(options.queryData, _.pick(options.query, config.queryData));
            options.queryData = Object.assign(options.queryData, _.pick(options.params, config.queryData));
        }
    }
};
