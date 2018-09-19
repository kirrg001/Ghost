const Promise = require('bluebird');
const models = require('../../../models');
const common = require('../../../lib/common');

module.exports = {
    read: {
        validation: {
            docName: 'posts',
            dataAttributes: ['id', 'slug', 'status', 'uuid'],
            extraAllowedApiOptions: ['formats', 'absolute_urls'],
            allowedIncludes: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields', 'authors', 'authors.roles'],
            allowedFormats: models.Post.allowedFormats
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
    }
};
