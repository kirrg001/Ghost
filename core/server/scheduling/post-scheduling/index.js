var Promise = require('bluebird'),
    utils = require(__dirname + '/../utils'),
    events = require(__dirname + '/../../events'),
    errors = require(__dirname + '/../../errors'),
    models = require(__dirname + '/../../models'),
    _private = {};

_private.normalize = function normalize(options) {
    var object = options.object,
        apiUrl = options.apiUrl,
        client = options.client;

    return {
        time: object.get('published_at'),
        url: apiUrl + 'schedules/posts/' + object.get('id') + '?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret'),
        extra: {
            httpMethod: 'PUT'
        }
    };
};

_private.loadClient = function loadClient() {
    return models.Client.findOne({filter: 'slug:ghost-scheduler', columns: ['slug', 'secret']});
};

exports.init = function init(options) {
    options = options || {};

    var config = options.postScheduling,
        apiUrl = options.apiUrl,
        adapter = null,
        client = null;

    if (!config) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    if (!apiUrl) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    return _private.loadClient()
        .then(function (_client) {
            client = _client;

            return utils.createAdapter(config);
        })
        .then(function (_adapter) {
            adapter = _adapter;

            return adapter.bootstrap();
        })
        .then(function () {
            events.onMany([
                'post.scheduled',
                'page.scheduled'
            ], function (object) {
                adapter.schedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            events.onMany([
                'post.rescheduled',
                'page.rescheduled'
            ], function (object) {
                adapter.reschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });

            events.onMany([
                'post.unscheduled',
                'page.unscheduled'
            ], function (object) {
                adapter.unschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });
        });
};
