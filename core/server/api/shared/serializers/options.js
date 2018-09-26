const _ = require('lodash');
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];
const DEFAULT_OPTIONS = ['context'];

module.exports = {
    all(options, apiConfig) {
        Object.assign(options.apiOptions, _.pick(options.query, DEFAULT_OPTIONS));
        Object.assign(options.apiOptions, _.pick(options.params, DEFAULT_OPTIONS));

        if (options.apiOptions.context.internal) {
            Object.assign(options.apiOptions, _.pick(options.query, INTERNAL_OPTIONS));
            Object.assign(options.apiOptions, _.pick(options.params, INTERNAL_OPTIONS));
        }

        if (apiConfig.queryOptions) {
            if (typeof apiConfig.queryOptions === 'function') {
                apiConfig.queryOptions = apiConfig.queryOptions(options);
            }

            Object.assign(options.apiOptions, _.pick(options.params, apiConfig.queryOptions));
            Object.assign(options.apiOptions, _.pick(options.query, apiConfig.queryOptions));
        }

        if (apiConfig.queryData) {
            if (typeof apiConfig.queryData === 'function') {
                apiConfig.queryData = apiConfig.queryData(options);
            }

            options.queryData = Object.assign(options.queryData, _.pick(options.query, apiConfig.queryData));
            options.queryData = Object.assign(options.queryData, _.pick(options.params, apiConfig.queryData));
        }
    }
};
