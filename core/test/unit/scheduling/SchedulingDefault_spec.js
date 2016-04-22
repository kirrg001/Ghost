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
        it('addJob', function () {
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
            var pinged = 0;

            sinon.stub(scope.adapter, '_pingUrl', function () {
                pinged = pinged + 1;
            });

            var timestamps = lodash.map(lodash.range(5), function (i) {
                    return moment().add(1, 'seconds').add(i, 'seconds').valueOf();
                }),
                nextJobs = {};

            timestamps.forEach(function (timestamp) {
                nextJobs[timestamp] = [{url: 'xxx'}];
            });

            scope.adapter._execute(nextJobs);

            (function retry() {
                if (pinged !== 5) {
                    return setTimeout(retry, 1000);
                }

                done();
            })();
        });
    });
});
