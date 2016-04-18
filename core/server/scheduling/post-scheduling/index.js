var Promise = require('bluebird'),
    utils = require(__dirname + '/../utils'),
    events = require(__dirname + '/../../events'),
    errors = require(__dirname + '/../../errors'),
    _private = {};

_private.normalize = function normalize(options) {
    var object = options.object,
        url = options.url;

    return {
        time: object.published_at,
        url: url + '/schedules/posts/' + object.id,
        extra: {
            httpMethod: 'PUT'
        }
    };
};

exports.init = function init(options) {
    options = options || {};

    var config = options.config,
        adapter = null;

    if (!config || !config.url) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    return utils.createAdapter(config)
        .then(function (_adapter) {
            adapter = _adapter;

            return adapter.bootstrap();
        }).then(function () {
            events.onMany([
                'post.scheduled',
                'page.scheduled'
            ], function (object) {
                adapter.schedule(_private.normalize({object: object, url: config.url}));
            });

            events.onMany([
                'post.rescheduled',
                'page.rescheduled'
            ], function (object) {
                adapter.reschedule(_private.normalize({object: object, url: config.url}));
            });

            events.onMany([
                'post.unscheduled',
                'page.unscheduled'
            ], function (object) {
                adapter.unschedule(_private.normalize({object: object, url: config.url}));
            });
        });
};
