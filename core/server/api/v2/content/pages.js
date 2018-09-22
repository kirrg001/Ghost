const models = require('../../../models');

module.exports = {
    browse: {
        validation: {
            docName: 'posts',
            queryOptions: ['status', 'formats', 'absolute_urls'],
            queryOptionsValues: {
                include: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields', 'authors', 'authors.roles'],
                formats: models.Post.allowedFormats
            }
        },
        permissions: {
            docName: 'posts',
            method: 'browse',
            content: true
        },
        query(options) {
            options.modelOptions.filter = 'page:true';
            return models.Post.findPage(options.modelOptions);
        }
    }
};
