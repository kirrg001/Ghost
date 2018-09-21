const models = require('../../../models');

module.exports = {
    browse: {
        validation: {
            docName: 'posts',
            extraAllowedApiOptions: ['status', 'formats', 'absolute_urls'],
            allowedIncludes: ['created_by', 'updated_by', 'published_by', 'author', 'tags', 'fields', 'authors', 'authors.roles'],
            allowedFormats: models.Post.allowedFormats
        },
        permissions: {
            docName: 'posts',
            method: 'browse',
            content: true
        },
        call(options) {
            options.modelOptions.filter = 'page:true';
            return models.Post.findPage(options.modelOptions);
        }
    }
};
