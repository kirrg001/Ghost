const models = require('../../models/index');

module.exports = {
    docName: 'pages',
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
                include: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles'],
                formats: models.Post.allowedFormats
            }
        },
        permissions: true,
        query(options) {
            return models.Post.findPage(options.modelOptions);
        }
    }
};
