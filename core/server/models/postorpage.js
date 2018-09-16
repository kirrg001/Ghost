const ghostBookshelf = require('./base');
const _ = require('lodash');

// temporary model
const PostOrPage = ghostBookshelf.Model.extend({}, {
    findPage: function (options) {
        options.limit = options.limit || 15;
        options.page = options.page || 1;

        return ghostBookshelf
            .knex
            .raw(`SELECT * from (SELECT * FROM posts WHERE status=\'published\' UNION SELECT * FROM pages where status=\'published\' order by published_at limit ${options.limit} offset ${(options.page - 1) * options.limit});`)
            .then((result) => {
                return ghostBookshelf
                    .knex
                    .raw(`SELECT * from posts_meta where post_id IN (${_.map(result, (item) => { return `"${item.id}"`;})});`)
                    .then((metaResult) => {
                        result.forEach((item) => {
                            item.meta = _.find(metaResult, {post_id: item.id});
                        });

                        return {posts: result};
                    });
            });
    }
});

module.exports = {
    PostOrPage: ghostBookshelf.model('PostOrPage', PostOrPage)
};
