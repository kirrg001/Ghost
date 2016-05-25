var Promise = require('bluebird'),
    moment = require('moment'),
    utils = require(__dirname + '/../utils'),
    events = require(__dirname + '/../../events'),
    errors = require(__dirname + '/../../errors'),
    models = require(__dirname + '/../../models'),
    _private = {};

/**
 * @TODO: if never executed, oldTime is null, extend adapter!
 */
_private.normalize = function normalize(options) {
    var object = options.object,
        apiUrl = options.apiUrl,
        client = options.client,
        rrule = utils.rrule.parseString(object.rrule),
        time = null;

    // CASE: newsletter was never executed, take the next iterator date
    if (!object.lastExecutedAt) {
        time = rrule.all(function (date, index) {
            return index < 1;
        });
    } else {
        time = rrule.all(function (date) {
            return moment(date).diff(object.lastExecutedAt).diff() > 0;
        });

        time = time[0];
    }

    return {
        time: time,
        url: apiUrl + '/schedules/newsletter?client_id=' + client.get('slug') + '&client_secret=' + client.get('secret'),
        extra: {
            httpMethod: 'PUT',
            oldTime: object.lastExecutedAt
        }
    };
};

_private.loadClient = function loadClient() {
    return models.Client.findOne({slug: 'ghost-scheduler'}, {columns: ['slug', 'secret']});
};

exports.init = function init(options) {
    options = options || {};

    var config = options.newsletter,
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

            adapter.schedule(_private.normalize({
                object: {
                    lastExecutedAt: config.newsletter.lastExecutedAt,
                    rrule: config.newsletter.rrule
                }, apiUrl: apiUrl, client: client
            }));
            return Promise.resolve();
        })
        .then(function () {
            adapter.run();
        })
        .then(function () {
            events.onMany([
                'settings.newsletter.edited'
            ], function (object) {
                // @TODO: check if we have to reschedule, unschedule
                adapter.reschedule(_private.normalize({object: object, apiUrl: apiUrl, client: client}));
            });
        });
};
