var Promise = require('bluebird'),
    errors = require(__dirname + '/../errors'),
    postScheduling = require('./post-scheduling');

/**
 * scheduling modules:
 *   - post scheduling: publish posts/pages when scheduled
 */
exports.init = function init(options) {
    options = options || {};

    var config = options.config;

    if (!config.postScheduling) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    return postScheduling.init({
        config: config.postScheduling
    });
};
