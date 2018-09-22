const models = require('../../../models');

module.exports = {
    browse: {
        validation: {
            docName: 'posts',
            queryOptions: ['include', 'status', 'formats', 'absolute_urls', 'fields'],
            queryOptionsValues: {
                include: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'authors', 'authors.roles'],
                formats: models.Post.allowedFormats
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse',
            content: true
        },
        query(options) {
            options.modelOptions.filter = 'page:false';
            return models.Post.findPage(options.modelOptions);
        }
    }
};
