const Promise = require('bluebird');
const _ = require('lodash');
const validation = require('../../../data/validation');

const DEFAULT_OPTIONS = ['context', 'include'];
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

module.exports = {
    validate(config, options) {
        options.apiOptions = Object.assign(options.apiOptions, _.pick(options.query, DEFAULT_OPTIONS));
        options.apiOptions = Object.assign(options.apiOptions, _.pick(options.params, DEFAULT_OPTIONS));

        if (options.apiOptions.context.internal) {
            options.apiOptions = Object.assign(options.apiOptions, _.pick(options.query, INTERNAL_OPTIONS));
            options.apiOptions = Object.assign(options.apiOptions, _.pick(options.params, INTERNAL_OPTIONS));
        }

        if (config.dataAttributes) {
            options.data = Object.assign(options.data, _.pick(options.query, config.dataAttributes));
            options.data = Object.assign(options.data, _.pick(options.params, config.dataAttributes));
        }

        if (config.extraAllowedApiOptions) {
            options.apiOptions = Object.assign(options.apiOptions, _.pick(options.params, config.extraAllowedApiOptions));
            options.apiOptions = Object.assign(options.apiOptions, _.pick(options.query, config.extraAllowedApiOptions));
        }

        options.modelOptions = this.convertToModelOptions(config.allowedIncludes, config.allowedFormats, {forModel: true}, options.apiOptions);

        let validationErrors = this.validateData(options.data);

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        validationErrors = this.validateModelOptions(options.modelOptions);

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        return Promise.resolve();
    },

    convertToModelOptions(allowedIncludes, allowedFormats, convertOptions = {forModel: true}, options) {
        const modelOptions = {};

        if (options.include) {
            if (!convertOptions.forModel) {
                modelOptions.include = this.prepareInclude(options.include, allowedIncludes);
            } else {
                modelOptions.withRelated = this.prepareInclude(options.include, allowedIncludes);
            }
        }

        if (options.fields) {
            modelOptions.columns = this.prepareFields(options.fields);
        }

        if (options.formats) {
            modelOptions.formats = this.prepareFormats(options.formats, allowedFormats);
        }

        if (options.formats && options.columns) {
            modelOptions.columns = options.columns.concat(modelOptions.formats);
        }

        modelOptions.context = options.context;

        return modelOptions;
    },

    validateModelOptions(options) {
        const globalValidations = {
            id: {matches: /^[a-f\d]{24}$|^1$|me/i},
            page: {matches: /^\d+$/},
            limit: {matches: /^\d+|all$/},
            from: {isDate: true},
            to: {isDate: true},
            columns: {matches: /^[\w, ]+$/},
            order: {matches: /^[a-z0-9_,. ]+$/i}
        };

        let errors = [];

        _.each(options, (value, key) => {
            if (globalValidations[key]) {
                errors = errors.concat(validation.validate(value, key, globalValidations[key]));
            } else {
                // all other keys should be alpha-numeric with dashes/underscores, like tag, author, status, etc
                errors = errors.concat(validation.validate(value, key, globalValidations.slug));
            }
        });

        return errors;
    },

    validateData(options) {
        const globalValidations = {
            id: {matches: /^[a-f\d]{24}$|^1$|me/i},
            uuid: {isUUID: true},
            slug: {isSlug: true},
            name: {},
            email: {isEmail: true}
        };

        let errors = [];

        _.each(options, (value, key) => {
            if (globalValidations[key]) {
                errors = errors.concat(validation.validate(value, key, globalValidations[key]));
            } else {
                // all other keys should be alpha-numeric with dashes/underscores, like tag, author, status, etc
                errors = errors.concat(validation.validate(value, key, globalValidations.slug));
            }
        });

        return errors;
    },

    trimAndLowerCase(params) {
        params = params || '';
        if (_.isString(params)) {
            params = params.split(',');
        }

        return params.map((item) => {
            return item.trim().toLowerCase();
        });
    },

    prepareInclude(include, allowedIncludes) {
        return _.intersection(this.trimAndLowerCase(include), allowedIncludes);
    },

    prepareFields(fields) {
        return this.trimAndLowerCase(fields);
    },

    prepareFormats(formats, allowedFormats) {
        return _.intersection(this.trimAndLowerCase(formats), allowedFormats);
    }
};
