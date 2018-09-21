const Promise = require('bluebird');
const _ = require('lodash');
const common = require('../../../lib/common');
const validation = require('../../../data/validation');

const DEFAULT_OPTIONS = ['context'];
const INTERNAL_OPTIONS = ['transacting', 'forUpdate'];

module.exports = {
    validate(apiConfig, options) {
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

        this.validateQueryOptions(options.apiOptions, apiConfig.queryOptionsValues);

        options.modelOptions = this.convertToModelOptions(options.apiOptions, {forModel: true});

        const validationErrors = this.validateModelOptions(options.modelOptions);

        if (!_.isEmpty(validationErrors)) {
            return Promise.reject(validationErrors[0]);
        }

        if (Object.keys(options.data).length) {
            try {
                options.data = this.validateData(options.data, apiConfig.docName, options.modelOptions.id);
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
    },

    validateQueryOptions(apiOptions, queryOptionsValues = {}) {
        if (apiOptions.include) {
            apiOptions.include = this.prepareInclude(apiOptions.include, queryOptionsValues.include);
        }

        if (apiOptions.fields) {
            apiOptions.fields = this.prepareFields(apiOptions.fields, queryOptionsValues.fields);
        }

        if (apiOptions.formats) {
            apiOptions.formats = this.prepareFormats(apiOptions.formats, queryOptionsValues.formats);
        }
    },

    convertToModelOptions(apiOptions, convertOptions = {forModel: true}) {
        const modelOptions = _.cloneDeep(apiOptions);

        if (modelOptions.include) {
            if (convertOptions.forModel) {
                modelOptions.withRelated = modelOptions.include;
                delete modelOptions.include;
            }
        }

        if (modelOptions.fields) {
            modelOptions.columns = modelOptions.fields;
            delete modelOptions.fields;
        }

        if (modelOptions.formats && modelOptions.columns) {
            modelOptions.columns = modelOptions.columns.concat(modelOptions.formats);
        }

        return modelOptions;
    },

    validateModelOptions(modelOptions) {
        const noValidation = ['context', 'withRelated', 'filter', 'forUpdate', 'transacting', 'formats'];
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

        _.each(modelOptions, (value, key) => {
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
    },

    /**
     * ### Check Object
     * Check an object passed to the API is in the correct format
     *
     * @TODO:
     * The weird thing about this function is..
     *   - that the API converts properties back to model notation
     *      - post.author -> post.author_id
     *   - and the model layer implementation of `toJSON` knows about these transformations as well
     *      - post.author_id -> post.author
     *   - this must live in one place
     *      - API IN <-> API OUT
     *      - this should be unrelated to the model layer
     *
     * @param {Object} object
     * @param {String} docName
     * @returns {Promise(Object)} resolves to the original object if it checks out
     */
    validateData(object, docName, editId) {
        if (_.isEmpty(object) || _.isEmpty(object[docName]) || _.isEmpty(object[docName][0])) {
            throw new common.errors.BadRequestError({
                message: common.i18n.t('errors.api.utils.noRootKeyProvided', {docName: docName})
            });
        }

        if (docName === 'posts') {
            /**
             * Convert author property to author_id to match the name in the database.
             *
             * @deprecated: `author`, will be removed in Ghost 3.0
             */
            if (object.posts[0].hasOwnProperty('author')) {
                object.posts[0].author_id = object.posts[0].author;
                delete object.posts[0].author;
            }

            /**
             * Ensure correct incoming `post.authors` structure.
             *
             * NOTE:
             * The `post.authors[*].id` attribute is required till we release Ghost 3.0.
             * Ghost 1.x keeps the deprecated support for `post.author_id`, which is the primary author id and needs to be
             * updated if the order of the `post.authors` array changes.
             * If we allow adding authors via the post endpoint e.g. `authors=[{name: 'newuser']` (no id property), it's hard
             * to update the primary author id (`post.author_id`), because the new author `id` is generated when attaching
             * the author to the post. And the attach operation happens in bookshelf-relations, which happens after
             * the event handling in the post model.
             *
             * It's solvable, but not worth right now solving, because the admin UI does not support this feature.
             *
             * TLDR; You can only attach existing authors to a post.
             *
             * @TODO: remove `id` restriction in Ghost 3.0
             */
            if (object.posts[0].hasOwnProperty('authors')) {
                if (!_.isArray(object.posts[0].authors) ||
                    (object.posts[0].authors.length && _.filter(object.posts[0].authors, 'id').length !== object.posts[0].authors.length)) {
                    throw new common.errors.BadRequestError({
                        message: common.i18n.t('errors.api.utils.invalidStructure', {key: 'posts[*].authors'})
                    });
                }

                /**
                 * CASE: we don't support updating nested-nested relations e.g. `post.authors[*].roles` yet.
                 *
                 * Bookshelf-relations supports this feature, BUT bookshelf's `hasChanged` fn will currently
                 * clash with this, because `hasChanged` won't be able to tell if relations have changed or not.
                 * It would always return `changed.roles = [....]`. It would always throw a model event that relations
                 * were updated, which is not true.
                 *
                 * Bookshelf-relations can tell us if a relation has changed, it knows that.
                 * But the connection between our model layer, Bookshelf's `hasChanged` fn and Bookshelf-relations
                 * is not present. As long as we don't support this case, we have to ignore this.
                 */
                if (object.posts[0].authors && object.posts[0].authors.length) {
                    _.each(object.posts[0].authors, (author, index) => {
                        if (author.hasOwnProperty('roles')) {
                            delete object.posts[0].authors[index].roles;
                        }

                        if (author.hasOwnProperty('permissions')) {
                            delete object.posts[0].authors[index].permissions;
                        }
                    });
                }
            }

            /**
             * Model notation is: `tag.parent_id`.
             * The API notation is `tag.parent`.
             *
             * See @TODO on the fn description. This information lives in two places. Not nice.
             */
            if (object.posts[0].hasOwnProperty('tags')) {
                if (_.isArray(object.posts[0].tags) && object.posts[0].tags.length) {
                    _.each(object.posts[0].tags, (tag, index) => {
                        if (tag.hasOwnProperty('parent')) {
                            object.posts[0].tags[index].parent_id = tag.parent;
                            delete object.posts[0].tags[index].parent;
                        }

                        if (tag.hasOwnProperty('posts')) {
                            delete object.posts[0].tags[index].posts;
                        }
                    });
                }
            }
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

        return object;
    }
};
