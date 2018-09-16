const ghostBookshelf  = require('./base');

let PostMeta;

PostMeta = ghostBookshelf.Model.extend({
    tableName: 'posts_meta'
});

module.exports = {
    PostMeta: ghostBookshelf.model('PostMeta', PostMeta)
};
