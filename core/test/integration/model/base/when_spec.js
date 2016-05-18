/*globals describe, before, beforeEach, afterEach, it*/
var testUtils       = require('../../utils'),
    events          = require('../../../server/events'),
    should          = require('should');

describe('When Model...', function () {
    var scope = {};

    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('posts'));

    it('activeTimezone did not change', function (done) {
        events.emit('settings.activeTimezone.edited', settings);
        done();
    });

    it('insert x posts/pages', function (done) {
        scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.users.ids.author,
            author_id: testUtils.users.ids.author,
            published_by: testUtils.users.ids.author,
            created_at: moment('2016-01-01T06:00:00').toDate(),
            published_at: moment('2016-05-01T06:00:00').toDate(),
            status: 'scheduled',
            slug: '1'
        }));

        scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.users.ids.editor,
            author_id: testUtils.users.ids.editor,
            published_by: testUtils.users.ids.editor,
            created_at: moment('2016-01-02T06:00:00').toDate(),
            published_at: moment('2016-01-02T08:00:00').toDate(),
            status: 'scheduled',
            slug: '2'
        }));

        scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.users.ids.owner,
            author_id: testUtils.users.ids.owner,
            published_by: testUtils.users.ids.owner,
            created_at: moment('2016-01-06T06:00:00').toDate(),
            published_at: moment('2016-01-06T10:00:00').toDate(),
            status: 'scheduled',
            slug: '3'
        }));

        scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.users.ids.owner,
            author_id: testUtils.users.ids.owner,
            published_by: testUtils.users.ids.owner,
            published_at: moment('2016-01-06T11:00:00').toDate(),
            created_at: moment('2016-01-06T09:00:00').toDate(),
            status: 'scheduled',
            slug: '4'
        }));

        scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.users.ids.owner,
            author_id: testUtils.users.ids.owner,
            published_by: testUtils.users.ids.owner,
            published_at: moment('2016-02-01T12:00:00').toDate(),
            created_at: moment('2016-02-01T11:00:00').toDate(),
            status: 'scheduled',
            page: 1,
            slug: '5'
        }));

        scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
            created_by: testUtils.users.ids.owner,
            author_id: testUtils.users.ids.owner,
            published_by: testUtils.users.ids.owner,
            status: 'draft',
            slug: '6'
        }));

        testUtils.fixtures.insertPosts(scope.posts)
            .then(function () {
                return done();
            })
            .catch(done);
    });
});
