var request = require('superagent'),
    util = require('util'),
    config = require(__dirname + '/../../core/server/config'),
    errors = require(config.paths.corePath + '/server/errors'),
    SchedulingBase = require(config.paths.corePath + '/server/scheduling/SchedulingBase');

/**
 * you can add config to config.scheduling.postScheduling
 * config.scheduling.postScheduling.schedulerUrl = 'http://192.168.0.1:8080';
 * config.scheduling.postScheduling.active = 'SchedulingPro';
 */
var SchedulingPro = function (options) {
    options = options || {};
    SchedulingBase.call(this);

    this.schedulerUrl = options.schedulerUrl;
    this.retryTimeout = options.retryTimeout || 1000 * 5;
};

util.inherits(SchedulingPro, SchedulingBase);

SchedulingPro.prototype.run = function () {};

SchedulingPro.prototype.request = function (options, done) {
    var path = options.path,
        httpMethod = options.httpMethod,
        body = options.body,
        retry = options.retry = options.hasOwnProperty('retry') ? options.retry : 3,
        self = this,
        timeout = null;

    request[httpMethod](this.schedulerUrl + path)
        .send(body)
        .end(function (err, response) {
            if (err) {
                // CASE: 422 validation or 500, do not try again
                if (response && response.status !== 200) {
                    if (response.status === 422) {
                        return done(new errors.ValidationError(response.body && response.body.message));
                    }

                    return done(new errors.InternalServerError(response.body && response.body.message));
                }

                // CASE: service down
                if (retry <= 0) {
                    return done(err);
                }

                timeout = setTimeout(function () {
                    clearTimeout(timeout);
                    options.retry = retry - 1;
                    self.request(options, done);
                }, self.retryTimeout);

                return;
            }

            done && done(null, response);
        });
};

SchedulingPro.prototype.schedule = function (object) {
    var time = object.time,
        blogUrl = object.url,
        extra = object.extra;

    this.request({
        path: '/jobs',
        httpMethod: 'post',
        body: {
            url: blogUrl,
            time: time,
            params: {
                method: extra.httpMethod,
                clearCache: true
            }
        }
    }, function (err) {
        if (err) {
            return errors.logError(err);
        }
    });
};

SchedulingPro.prototype.reschedule = function (object) {
    var blogUrl = object.url,
        self = this;

    this.request({
        path: '/jobs',
        httpMethod: 'delete',
        body: {
            url: blogUrl
        }
    }, function (err) {
        if (err) {
            // for now we display every error on the shell to know what is going on
            errors.logError(err);

            // do not reschedule if 5xx
            if (err.statusCode !== 422) {
                return;
            }
        }

        self.schedule(object);
    });
};

SchedulingPro.prototype.unschedule = function (object) {
    var blogUrl = object.url;

    this.request({
        path: '/jobs',
        httpMethod: 'delete',
        body: {
            url: blogUrl
        }
    }, function (err) {
        if (err) {
            return errors.logError(err);
        }
    });
};

module.exports = SchedulingPro;
