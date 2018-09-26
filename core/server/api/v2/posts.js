const Promise = require('bluebird');
const models = require('../../models');
const common = require('../../lib/common');
const allowedIncludes = ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles'];

module.exports = {
    docName: 'posts',
    browse: {
        validation: {
            queryOptions: [
                'include',
                'filter',
                'status',
                'fields',
                'formats',
                'absolute_urls',
                'staticPages',
                'page',
                'limit',
                'order',
                'debug'
            ],
            queryOptionsValues: {
                include: allowedIncludes,
                formats: ['mobiledoc', 'html', 'plaintext']
            }
        },
        permissions: true,
        query(options) {
            return models.Post.findPage(options.modelOptions);
        }
    },
    read: {
        validation: {
            queryData: ['id', 'slug', 'status', 'uuid'],
            queryOptions: ['include', 'fields', 'formats', 'absolute_urls'],
            queryOptionsValues: {
                include: allowedIncludes,
                formats: ['mobiledoc', 'html', 'plaintext']
            }
        },
        permissions: {
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        query(options) {
            return models.Post.findOne(options.queryData, options.modelOptions)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        }));
                    }

                    return model;
                });
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        validation: {
            queryOptions: ['include', 'id'],
            queryOptionsValues: {
                include: allowedIncludes
            }
        },
        permissions: {
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        query(options) {
            return models.Post.edit(options.data.posts[0], options.modelOptions)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        }));
                    }

                    // CASE 1: post status changed to `published`
                    // CASE 2: published post was updated
                    if (model.updated('status') !== model.get('status') || model.get('status') === 'published') {
                        this.headers.cacheInvalidate = true;
                    }

                    if (model.get('status') === 'draft' && model.updated('status') !== 'published') {
                        this.headers.cacheInvalidate = {
                            value: `/p/${model.get('uuid')}/`
                        };
                    }

                    return model;
                });
        }
    },
    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        validation: {
            queryOptions: ['include'],
            queryOptionsValues: {
                include: allowedIncludes
            }
        },
        permissions: {
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        query(options) {
            return models.Post.add(options.data.posts[0], options.modelOptions)
                .then((model) => {
                    if (model.get('status') === 'published') {
                        this.headers.cacheInvalidate = true;
                    }

                    if (model.get('status') === 'draft') {
                        this.headers.cacheInvalidate = {
                            value: `/p/${model.get('uuid')}/`
                        };
                    }

                    return model;
                });
        }
    },
    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        validation: {
            queryOptions: ['id']
        },
        permissions: {
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        query(options) {
            options.modelOptions.require = true;

            return models.Post.destroy(options.modelOptions)
                .return(null)
                .catch(models.Post.NotFoundError, () => {
                    throw new common.errors.NotFoundError({
                        message: common.i18n.t('errors.api.posts.postNotFound')
                    });
                });
        }
    }
};
