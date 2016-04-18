/*globals describe, it*/

var should = require('should'),
    fs = require('fs'),
    config = require(__dirname + '/../../../server/config'),
    errors = require(config.paths.corePath + '/server/errors'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils');

describe('Scheduling: utils', function () {
    describe('success', function () {
        it('create good adapter', function (done) {
            schedulingUtils.createAdapter({
                scheduler: __dirname + '/../../../server/scheduling/SchedulingDefault'
            }).then(function (adapter) {
                should.exist(adapter);
                done();
            }).catch(done);
        });

        it('create good adapter', function (done) {
            var jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(__dirname + \'/../../../server/scheduling/SchedulingBase\');' +
                'var AnotherAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(AnotherAdapter, SchedulingBase);' +
                'AnotherAdapter.prototype.bootstrap = function (){};' +
                'AnotherAdapter.prototype.schedule = function (){};' +
                'AnotherAdapter.prototype.reschedule = function (){};' +
                'AnotherAdapter.prototype.unschedule = function (){};' +
                'module.exports = AnotherAdapter';

            fs.writeFileSync(__dirname + '/another-scheduler.js', jsFile);
            schedulingUtils.createAdapter({
                scheduler: 'another-scheduler',
                loadPath: __dirname + '/'
            }).then(function (adapter) {
                should.exist(adapter);
                done();
            }).finally(function () {
                fs.unlinkSync(__dirname + '/another-scheduler.js');
            }).catch(done);
        });
    });

    describe('error', function () {
        it('create without adapter path', function (done) {
            schedulingUtils.createAdapter()
                .catch(function (err) {
                    should.exist(err);
                    done();
                });
        });

        it('create with unknown adapter', function (done) {
            schedulingUtils.createAdapter({
                scheduler: '/follow/the/heart'
            }).catch(function (err) {
                should.exist(err);
                done();
            });
        });

        it('create with adapter, but missing fn\'s', function (done) {
            var jsFile = '' +
                'var util = require(\'util\');' +
                'var SchedulingBase = require(__dirname + \'/../../../server/scheduling/SchedulingBase\');' +
                'var BadAdapter = function (){ SchedulingBase.call(this); };' +
                'util.inherits(BadAdapter, SchedulingBase);' +
                'BadAdapter.prototype.schedule = function (){};' +
                'module.exports = BadAdapter';

            fs.writeFileSync(__dirname + '/bad-adapter.js', jsFile);
            schedulingUtils.createAdapter({
                scheduler: __dirname + '/bad-adapter'
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.IncorrectUsage).should.eql(true);
                done();
            }).finally(function () {
                fs.unlinkSync(__dirname + '/bad-adapter.js');
            });
        });
    });
});
