const models = require('../../models/index');

module.exports = {
    browse: {
        validation: {
            docName: 'posts',
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
                include: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles'],
                formats: models.Post.allowedFormats
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse'
        },
        query(options) {
            return models.Post.findPage(options.modelOptions);
        }
    }
};
