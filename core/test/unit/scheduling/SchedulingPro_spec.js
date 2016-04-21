/*globals describe, it, before, after*/
var config = require(__dirname + '/../../../server/config'),
    errors = require(config.paths.corePath + '/server/errors'),
    path = require('path'),
    should = require('should'),
    _ = require('lodash'),
    express = require('express'),
    http = require('http'),
    bodyParser = require('body-parser'),
    Module = require('module'),
    sinon = require('sinon');

describe('Scheduling Ghost Pro Adapter', function () {
    var scope = {
        schedulerUrl: 'http://localhost:1111',
        originalRequireFn: Module.prototype.require,
        createServer: function () {
            var app = express(),
                service = http.createServer(app),
                jobDeleted = false,
                jobCreated = false;

            app.use(bodyParser.json());

            app.post('/jobs', function (req, res) {
                should.exist(req.body.time);
                should.exist(req.body.url);
                should.exist(req.body.params.method);
                should.exist(req.body.params.clearCache);

                if (!_.isNumber(req.body.time)) {
                    return res.sendStatus(422);
                }

                jobCreated = true;
                res.sendStatus(200);
            });

            app.delete('/jobs', function (req, res) {
                should.exist(req.body.url);
                jobDeleted = true;
                res.sendStatus(200);
            });

            service.listen(1111);

            return {
                wasJobCreated: function () {
                    return jobCreated;
                },
                wasJobDeleted: function () {
                    return jobDeleted;
                },
                close: function (done) {
                    service.close(done);
                }
            }
        }
    };

    before(function () {
        Module.prototype.require = function (path) {
            if (path.match(/scheduling\/SchedulingBase/)) {
                return Object;
            }

            return scope.originalRequireFn.apply(this, arguments);
        };

        sinon.spy(errors, 'logError');

        scope.SchedulingPro = require(config.paths.contentPath + '/scheduling/SchedulingPro');
        scope.adapter = new scope.SchedulingPro({schedulerUrl: scope.schedulerUrl, retryTimeout: 50});
    });

    after(function () {
        Module.prototype.require = scope.originalRequireFn;
        errors.logError.restore();
    });

    describe('success', function () {
        it('schedule', function (done) {
            var server = scope.createServer();

            scope.adapter.schedule({
                time: 12212112,
                url: 'blog.com/bee/boo',
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (server.wasJobCreated()) {
                    return server.close(done);
                }

                setTimeout(retry, 100);
            }());
        });

        it('reschedule', function (done) {
            var server = scope.createServer();

            scope.adapter.reschedule({
                time: 12212112,
                url: 'blog.com/bee/boo',
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (server.wasJobDeleted() && server.wasJobCreated()) {
                    return server.close(done);
                }

                setTimeout(retry, 100);
            }());
        });

        it('unschedule', function (done) {
            var server = scope.createServer();

            scope.adapter.unschedule({
                time: 12212112,
                url: 'blog.com/bee/boo',
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (server.wasJobDeleted()) {
                    return server.close(done);
                }

                setTimeout(retry, 100);
            }());
        });
    });

    describe('error', function () {
        it('service is down', function (done) {
            scope.adapter.schedule({
                time: 12212112,
                url: 'blog.com/bee/boo',
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (errors.logError.called === true) {
                    errors.logError.called = false;
                    return done();
                }

                setTimeout(retry, 100);
            }());
        });

        it('422', function (done) {
            var server = scope.createServer();

            scope.adapter.schedule({
                time: 'lul',
                url: 'blog.com/bee/boo',
                extra: {
                    httpMethod: 'GET'
                }
            });

            (function retry() {
                if (errors.logError.called === true) {
                    return server.close(done);
                }

                setTimeout(retry, 100);
            }());
        });
    });
});
