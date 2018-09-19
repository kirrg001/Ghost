const models = require('../../../models');
const localUtils = require('../utils');

module.exports = {
    add: {
        statusCode: 201,
        response: {
            format: 'plain'
        },
        headers: {
            disposition: {
                type: 'csv',
                value: 'Attachment; filename="redirects.json'
            },
            cacheInvalidate: true
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        call(options) {
            return models.Post.edit(options.data, options.modelOptions)
                .then((model) => {
                    if (model.updated('status') !== model.get('status')) {
                        this.headers.cacheInvalidate = true;
                    }

                    return model;
                });
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        validate: {
            docName: 'posts',
            dataAttributes: ['id', 'slug', 'status', 'uuid'],
            extraAllowedModelOptions: ['formats', 'absolute_urls'],
            allowedIncludes: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields', 'authors', 'authors.roles'],
            allowedFormats: models.Post.allowedFormats
        },
        call(options) {
            return models.Post.edit(options.data, options.modelOptions)
                .then((model) => {
                    if (model.updated('status') !== model.get('status')) {
                        this.headers.cacheInvalidate = true;
                    }

                    return model;
                });
        }
    }
};
