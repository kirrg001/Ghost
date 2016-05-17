/*globals describe,it*/

var lodash = require('lodash'),
    moment = require('moment-timezone'),
/*jshint unused:false*/
    should = require('should');

/**
 * this test suite should work for the following two cases:
 * - server time is UTC
 * - server time is not UTC and we force UTC
 */
describe('monkey patch', function () {
    describe('timezoned-date', function () {
        it('special format for new Date', function () {
            new Date(-5e13 - 1).toISOString().should.eql('0385-07-25T07:06:39.999Z');
        });

        it('subtract timestamp from Date', function () {
            var threshold = new Date('2016-05-23 06:00:00') - 10000000;
            threshold.should.eql(1463973200000);
            new Date(threshold).toString().should.eql('Mon May 23 2016 03:13:20 GMT+0000 (UTC)');
        });

        it('compare date', function () {
            new Date('2016-05-23').toString().should.eql('Mon May 23 2016 00:00:00 GMT+0000 (UTC)');
        });

        it('compare date', function () {
            new Date('2016-05-23T07:59:16.000').toString().should.eql('Mon May 23 2016 07:59:16 GMT+0000 (UTC)');
        });

        it('toJSON', function () {
            new Date('2016-05-23 08:01:00').toJSON().should.eql('2016-05-23T08:01:00.000Z');
        });

        it('lodash cloneDeep', function () {
            moment(lodash.cloneDeep(new Date())).isValid().should.eql(true);
            moment(lodash.cloneDeep(new Date('2016-05-23 11:39:29'))).toDate().toString().should.eql('Mon May 23 2016 11:39:29 GMT+0000 (UTC)');
        });

        it('moment format', function () {
            moment('2016-01-02 08:00:00').format('YYYY-MM-DD HH:mm:ss').should.eql('2016-01-02 08:00:00');
        });

        it('moment add', function () {
            moment('2016-01-02 08:00:00').add(2, 'hours').toDate().toString().should.eql('Sat Jan 02 2016 10:00:00 GMT+0000 (UTC)');
        });

        it('moment timezone', function () {
            moment('2016-01-02 08:00:00').tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss').should.eql('2016-01-02 00:00:00');
        });

        it('valueOf', function () {
            new Date(2000, 0, 1, 13, 32, 34, 234).valueOf().should.eql(946733554234);
        });

        it('toUTCString', function () {
            new Date('2016-02-01').toUTCString().should.eql('Mon, 01 Feb 2016 00:00:00 GMT');
        });

        it('toDateString', function () {
            new Date('2016-01-01 00:00:00').toDateString().should.eql('Fri Jan 01 2016');
        });

        it('toTimeString', function () {
            new Date('2016-01-01 00:00:00').toTimeString().should.eql('00:00:00 GMT+0000 (UTC)');
        });

        it('setHours', function () {
            var date = new Date(2015, 9, 25);
            date.setHours(1);
            date.toString().should.eql('Sun Oct 25 2015 01:00:00 GMT+0000 (UTC)');
            date.setHours(2);
            date.toString().should.eql('Sun Oct 25 2015 02:00:00 GMT+0000 (UTC)');
            date.setHours(3);
            date.toString().should.eql('Sun Oct 25 2015 03:00:00 GMT+0000 (UTC)');
        });
    });
});
