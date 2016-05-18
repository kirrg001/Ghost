/*globals describe, before, beforeEach, afterEach, it*/

var config = require('../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    events = require(config.paths.corePath + '/server/events'),
    models = require(config.paths.corePath + '/server/models'),
    moment = require('moment'),
    should = require('should');

describe('When Model...', function () {
    var scope = {posts: []};

    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(function (done) {
        testUtils.setup()(function(err) {
            if (err) {
                return done(err);
            }

            scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                published_at: moment().add(2, 'days').toDate(),
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
        events.emit('settings:activeTimezone:edited', models.Settings.forge({activeTimezone: 'America/Los_Angeles'}));
        done();
    });
});
