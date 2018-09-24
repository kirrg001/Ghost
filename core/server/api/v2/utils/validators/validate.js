const Promise = require('bluebird');
const _ = require('lodash');
const common = require('../../../lib/common');
const validation = require('../../../data/validation');

const DEFAULT_OPTIONS = ['context'];
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

const validateQueryOptions = (apiOptions, queryOptionsValues = {}) => {
    if (apiOptions.include) {
        apiOptions.include = prepareInclude(apiOptions.include, queryOptionsValues.include);
    }

    if (apiOptions.fields) {
        apiOptions.fields = prepareFields(apiOptions.fields, queryOptionsValues.fields);
    }

    if (apiOptions.formats) {
        apiOptions.formats = prepareFormats(apiOptions.formats, queryOptionsValues.formats);
    }
};

const validateApiOptions = (apiOptions) => {
    const noValidation = ['context', 'include', 'filter', 'forUpdate', 'transacting', 'formats'];
    const globalValidations = {
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
        email: {isEmail: true}
    };
    let errors = [];

    _.each(apiOptions, (value, key) => {
        if (noValidation.indexOf(key) !== -1) {
            return;
        }

        if (globalValidations[key]) {
            errors = errors.concat(validation.validate(value, key, globalValidations[key]));
        } else {
            // all other keys should be alpha-numeric with dashes/underscores, like tag, author, status, etc
            errors = errors.concat(validation.validate(value, key, globalValidations.slug));
        }
    });

    return errors;
};

const trimAndLowerCase = (params) => {
    params = params || '';
    if (_.isString(params)) {
        params = params.split(',');
    }

    return params.map((item) => {
        return item.trim().toLowerCase();
    });
};

const prepareInclude = (include, allowedIncludes) => {
    return _.intersection(trimAndLowerCase(include), allowedIncludes);
};

const prepareFields = (fields) => {
    return trimAndLowerCase(fields);
};

const prepareFormats = (formats, allowedFormats) => {
    return _.intersection(trimAndLowerCase(formats), allowedFormats);
};

/**
 * ### Validate API input structure
 * Check an object passed to the API is in the correct format
 */
const validateData = (object, docName, editId) => {
    if (_.isEmpty(object) || _.isEmpty(object[docName]) || _.isEmpty(object[docName][0])) {
        throw new common.errors.BadRequestError({
            message: common.i18n.t('errors.api.utils.noRootKeyProvided', {docName: docName})
        });
    }

    // will remove unwanted null values
    _.each(object[docName], (value, index) => {
        if (!_.isObject(object[docName][index])) {
            return;
        }

        object[docName][index] = _.omitBy(object[docName][index], _.isNull);
    });

    if (editId && object[docName][0].id && editId !== object[docName][0].id) {
        throw new common.errors.BadRequestError({
            message: common.i18n.t('errors.api.utils.invalidIdProvided')
        });
    }
};

module.exports = function validate(options, apiConfig) {
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

    validateQueryOptions(options.apiOptions, apiConfig.queryOptionsValues);

    const validationErrors = validateApiOptions(options.apiOptions);

    if (!_.isEmpty(validationErrors)) {
        return Promise.reject(validationErrors[0]);
    }

    if (Object.keys(options.data).length) {
        try {
            validateData(options.data, apiConfig.docName, options.modelOptions.id);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    if (apiConfig.urlProperties) {
        if (typeof apiConfig.urlProperties === 'function') {
            apiConfig.urlProperties = apiConfig.urlProperties(options);
        }

        options.data = Object.assign(options.data, _.pick(options.query, apiConfig.urlProperties));
        options.data = Object.assign(options.data, _.pick(options.params, apiConfig.urlProperties));
    }

    return Promise.resolve();
};
