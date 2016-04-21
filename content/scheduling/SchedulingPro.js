var Promise = require('bluebird'),
    request = require('superagent'),
    util = require('util'),
    lodash = require('lodash'),
    config = require(__dirname + '/../../core/server/config'),
    errors = require(config.paths.corePath + '/server/errors'),
    SchedulingBase = require(config.paths.corePath + '/server/scheduling/SchedulingBase'),
    _private = {
        ghostProSchedulerUrl: 'http://localhost:1111'
    };

/**
 * @TODO:
 * - retry into config!!!(not possible right now!)
 * - ping the scheduler in bootstrap?
 * - timeout, url schedule service --> config
 * - more tests!?
 * - go over description again and check whats missing
 * - do not use request lib (optional, superagent takes ~60ms)
 */
_private.request = function (options, done) {
    var path = options.path,
        method = options.method,
        body = options.body,
        retry = options.retry = options.hasOwnProperty('retry') ? options.retry : 3;

    request[method](_private.ghostProSchedulerUrl + path)
        .send(body)
        .end(function (err, response) {
            if (err) {
                // CASE: 422 validation or 500, do not try again
                if (response && response.status !== 200) {
                    return done(new errors.ValidationError());
                }

                // CASE: service down
                if (retry <= 0) {
                    return done(err);
                }

                return setTimeout(function () {
                    options.retry = retry - 1;
                    _private.request(options, done);
                }, 100);
            }

            done && done(null, response);
        });
};


var SchedulingPro = function () {
    SchedulingBase.call(this);
};

util.inherits(SchedulingPro, SchedulingBase);

SchedulingPro.prototype.bootstrap = function () {
    Promise.resolve();
};

SchedulingPro.prototype.schedule = function (object) {
    var time = object.time,
        url = object.url,
        extra = object.extra;

    _private.request({
        path: '/jobs',
        method: 'post',
        body: {
            url: url,
            time: time,
            params: extra
        }
    }, function (err) {
        if (err) {
            return errors.logError(err);
        }
    });
};

SchedulingPro.prototype.reschedule = function (object) {
    var url = object.url,
        self = this;

    _private.request({
        path: '/jobs',
        method: 'delete',
        body: {
            url: url
        }
    }, function (err) {
        if (err) {
            return errors.logError(err);
        }

        self.schedule(object);
    });
};

SchedulingPro.prototype.unschedule = function (object) {
    var url = object.url;

    _private.request({
        path: '/jobs',
        method: 'delete',
        body: {
            url: url
        }
    }, function (err) {
        if (err) {
            return errors.logError(err);
        }
    });
};

module.exports = SchedulingPro;
