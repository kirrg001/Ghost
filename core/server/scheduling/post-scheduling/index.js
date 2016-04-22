var Promise = require('bluebird'),
    utils = require(__dirname + '/../utils'),
    config = require(__dirname + '/../../config'),
    events = require(config.paths.corePath + '/server/events'),
    errors = require(config.paths.corePath + '/server/errors'),
    _private = {};

_private.normalize = function normalize(options) {
    var object = options.object;

    try {
        object = object.toJSON();
    } catch (err) {}

    return {
        time: object.published_at,
        url: 'http:' + config.apiUrl() + '/schedules/posts/' + object.id + '?client_id=ghost-scheduler&client_secret=8da23db4e748',
        extra: {
            method: 'PUT'
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
