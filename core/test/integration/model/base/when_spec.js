/*globals describe, before, beforeEach, afterEach, it*/

var config = require('../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    events = require(config.paths.corePath + '/server/events'),
    models = require(config.paths.corePath + '/server/models'),
    /*jshint unused:false*/
    should = require('should'),
    moment = require('moment');

describe('When Model...', function () {
    var scope = {
        posts: [],
        publishedAtFutureMoment: moment().add(2, 'days').startOf('hour'),
        timezoneOffset: 420,
        newTimezone: 'America/Los_Angeles',
        oldTimezone: 'Europe/London'
    };

    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    describe('db has scheduled posts', function () {
        before(function (done) {
            testUtils.setup()(function (err) {
                if (err) {
                    return done(err);
                }

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: scope.publishedAtFutureMoment.toDate(),
                    status: 'scheduled',
                    slug: '1'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    published_at: moment('2016-01-02T08:00:00').toDate(),
                    status: 'scheduled',
                    slug: '2'
                }));

                testUtils.fixtures.insertPosts(scope.posts)
                    .then(function () {
                        return done();
                    })
                    .catch(done);
            });
        });

        it('activeTimezone changes change', function (done) {
            events.emit('settings.activeTimezone.edited', {
                attributes: {value: scope.newTimezone},
                _updatedAttributes: {value: scope.oldTimezone}
            });

            (function retry() {
                models.Post.findAll({context: {internal: true}}).then(function (results) {
                    if (results.models.length && results.models[1].get('status') === 'draft' &&
                        moment(results.models[0].get('published_at')).diff(scope.publishedAtFutureMoment.clone().subtract(scope.timezoneOffset, 'minutes')) === 0) {
                        return done();
                    }

                    setTimeout(retry, 500);
                });
            })();
        });
    });

    describe('db has no scheduled posts', function () {
        before(function (done) {
            testUtils.setup()(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
        });

        it('no scheduled posts', function (done) {
            events.emit('settings.activeTimezone.edited', {
                attributes: {value: scope.newTimezone},
                _updatedAttributes: {value: scope.oldTimezone}
            });

            models.Post.findAll({context: {internal: true}}).then(function (results) {
                results.length.should.eql(0);
                done();
            });
        });
    });
});
