/*globals describe, it, before, after*/
var config = require(__dirname + '/../../../server/config'),
    errors = require(config.paths.corePath + '/server/errors'),
    path = require('path'),
    moment = require('moment'),
    lodash = require('lodash'),
    should = require('should'),
    sinon = require('sinon');

describe('Scheduling Default Adapter', function () {
    var scope = {};

    before(function () {
        scope.SchedulingDefault = require(config.paths.corePath + '/server/scheduling/SchedulingDefault');
        scope.adapter = new scope.SchedulingDefault();
    });

    after(function () {
    });

    describe('success', function () {
        it('addJob (schedule)', function () {
            sinon.stub(scope.adapter, '_run');
            sinon.stub(scope.adapter, '_execute');

            var dates = [
                moment().add(1, 'day').subtract(30, 'seconds').toDate(),
                moment().add(7, 'minutes').toDate(),
                moment().add(12, 'minutes').toDate(),
                moment().add(20, 'minutes').toDate(),
                moment().add(15, 'minutes').toDate(),
                moment().add(15, 'minutes').add(10, 'seconds').toDate(),
                moment().add(15, 'minutes').subtract(30, 'seconds').toDate(),
                moment().add(50, 'seconds').toDate()
            ];

            dates.forEach(function (time) {
                scope.adapter._addJob({
                    time: time,
                    url: 'something'
                });
            });

            should.not.exist(scope.adapter.allJobs[moment(dates[1]).valueOf()]);
            should.not.exist(scope.adapter.allJobs[moment(dates[7]).valueOf()]);
            scope.adapter._execute.calledTwice.should.eql(true);

            var keys = Object.keys(scope.adapter.allJobs);

            keys.length.should.eql(dates.length - 2);
            keys.should.eql([
                moment(dates[2]).valueOf().toString(),
                moment(dates[6]).valueOf().toString(),
                moment(dates[4]).valueOf().toString(),
                moment(dates[5]).valueOf().toString(),
                moment(dates[3]).valueOf().toString(),
                moment(dates[0]).valueOf().toString()
            ]);

            scope.adapter._run.restore();
            scope.adapter._execute.restore();
            scope.adapter.allJobs = {};
        });

        it('run', function (done) {
            sinon.stub(scope.adapter, '_execute', function (nextJobs) {
                Object.keys(nextJobs).length.should.eql(182);
                Object.keys(scope.adapter.allJobs).length.should.eql(1000 - 182);
                scope.adapter._execute.restore();
                done();
            });

            var timestamps = lodash.map(lodash.range(1000), function (i) {
                    return moment().add(i, 'seconds').valueOf();
                }),
                allJobs = {};

            timestamps.forEach(function (timestamp) {
                allJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter.allJobs = allJobs;
            scope.adapter.interval = 1000;
            scope.adapter.offsetInMinutes = 2;
            scope.adapter._run();
        });

        it('execute', function (done) {
            var pinged = 0,
                jobs = 3;

            sinon.stub(scope.adapter, '_run');
            sinon.stub(scope.adapter, '_pingUrl', function () {
                pinged = pinged + 1;
            });

            var timestamps = lodash.map(lodash.range(jobs), function (i) {
                    return moment().add(1, 'seconds').add(i * 100, 'milliseconds').valueOf();
                }),
                nextJobs = {};

            timestamps.forEach(function (timestamp) {
                nextJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter._execute(nextJobs);

            (function retry() {
                if (pinged !== jobs) {
                    return setTimeout(retry, 100);
                }

                scope.adapter._run.restore();
                scope.adapter._pingUrl.restore();
                done();
            })();
        });

        it('delete job (unschedule)', function (done) {
            sinon.stub(scope.adapter, '_run');
            sinon.stub(scope.adapter, '_pingUrl');

            // add 3 jobs to delete
            var jobs = {};
            jobs[moment().add(500, 'milliseconds').valueOf()] = [{url: '/first', time: 1234}];
            jobs[moment().add(550, 'milliseconds').valueOf()] = [{url: '/first', time: 1235}];
            jobs[moment().add(600, 'milliseconds').valueOf()] = [{url: '/second', time: 1236}];

            lodash.map(jobs, function(value) {
                scope.adapter._deleteJob(value[0]);
            });

            // add another, which will be pinged
            jobs[moment().add(650, 'milliseconds').valueOf()] = [{url: '/third', time: 1237}];

            // simulate execute is called
            scope.adapter._execute(jobs);

            (function retry() {
                if (Object.keys(scope.adapter.deletedJobs).length) {
                    return setTimeout(retry, 100);
                }

                Object.keys(scope.adapter.deletedJobs).length.should.eql(0);
                scope.adapter._pingUrl.calledOnce.should.eql(true);
                scope.adapter._run.restore();
                scope.adapter._pingUrl.restore();
                done();
            })();
        });
    });
});
