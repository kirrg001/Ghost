const Promise = require('bluebird');
const _ = require('lodash');
const validation = require('../../../data/validation');

const GLOBAL_VALIDATORS = {
    id: {matches: /^[a-f\d]{24}$|^1$|me/i},
    page: {matches: /^\d+$/},
    limit: {matches: /^\d+|all$/},
    from: {isDate: true},
    to: {isDate: true},
    columns: {matches: /^[\w, ]+$/},
    order: {matches: /^[a-z0-9_,. ]+$/i},
    uuid: {isUUID: true},
    slug: {isSlug: true},
    name: {},
    email: {isEmail: true},
    context: {isObject: true},
    filter: {isString: true},
    forUpdate: true,
    transacting: true
};

const validate = (attrs, config) => {
    let errors = [];

    _.each(attrs, (value, key) => {
        if (config.queryOptionsValues && config.queryOptionsValues[key]) {
            errors = errors.concat(validation.validate(value, key, config.queryOptionsValues[key]));
        } else {
            if (GLOBAL_VALIDATORS[key]) {
                errors = errors.concat(validation.validate(value, key, GLOBAL_VALIDATORS[key]));
            }
        }
    });

    return errors;
};

module.exports = {
    all(config, options) {
        let validationErrors;

        if (options.apiOptions) {
            validationErrors = validate(options.apiOptions);
        }

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        if (options.queryData) {
            validationErrors = validate(options.queryData);
        }

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        return Promise.resolve();
    }
};
