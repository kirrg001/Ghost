const shared = require('../../shared');
const localUtils = require('./utils');

module.exports = {
    get http() {
        return shared.http;
    },

    get serializers() {
        return require('./utils/serializers');
    },

    /**
     * Content API Controllers
     *
     * @NOTE:
     *
     * Please create separate controllers for Content & Admin API. The goal is to expose `api.v2.content` and
     * `api.v2.admin` soon. Need to figure out how serializers & validation works then.
     */
    get pagesPublic() {
        return shared.pipeline(require('./pages-public'), localUtils, 'content');
    },

    get tagsPublic() {
        return shared.pipeline(require('./tags-public'), localUtils, 'content');
    },

    get publicSettings() {
        return shared.pipeline(require('./settings-public'), localUtils, 'content');
    },

    get postsPublic() {
        return shared.pipeline(require('./posts-public'), localUtils, 'content');
    },

    get authorsPublic() {
        return shared.pipeline(require('./authors-public'), localUtils, 'content');
    }
};
