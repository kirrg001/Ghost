const Promise = require('bluebird');
const models = require('../../../models');
const common = require('../../../lib/common');
const allowedIncludes = ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles'];

module.exports = {
    browse: {
        validation: {
            docName: 'posts',
            queryOptions: ['include', 'filter', 'status', 'fields', 'formats', 'absolute_urls', 'staticPages'],
            queryOptionsValues: {
                include: allowedIncludes,
                formats: models.Post.allowedFormats
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        call(options) {
            return models.Post.findPage(options.modelOptions);
        }
    },
    read: {
        validation: {
            docName: 'posts',
            urlProperties: ['id', 'slug', 'status', 'uuid'],
            queryOptions: ['include', 'fields', 'formats', 'absolute_urls'],
            queryOptionsValues: {
                include: allowedIncludes,
                formats: models.Post.allowedFormats
            }
        },
        permissions: {
            docName: 'posts',
            method: 'read',
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        call(options) {
            return models.Post.findOne(options.data, options.modelOptions)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.posts.postNotFound')
                        }));
                    }

                    return {
                        posts: [model.toJSON(options.modelOptions)]
                    };
                });
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        validation: {
            docName: 'posts',
            queryOptions: ['include', 'id'],
            queryOptionsValues: {
                include: allowedIncludes
            }
        },
        permissions: {
            docName: 'posts',
            method: 'edit',
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        call(options) {
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

                    return {
                        posts: [model.toJSON(options.modelOptions)]
                    };
                });
        }
    },
    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        validation: {
            docName: 'posts',
            queryOptions: ['include'],
            queryOptionsValues: {
                include: allowedIncludes
            },
            allowedIncludes: allowedIncludes
        },
        permissions: {
            docName: 'posts',
            method: 'add',
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        call(options) {
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

                    return {posts: [model.toJSON(options.modelOptions)]};
                });
        }
    },
    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        validation: {
            docName: 'posts',
            queryOptions: ['id']
        },
        permissions: {
            docName: 'posts',
            method: 'destroy',
            unsafeAttrs: ['author_id', 'status', 'authors']
        },
        call(options) {
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
