/*globals describe, it, after, before */

var should = require('should'),
    moment = require('moment'),
    Promise = require('bluebird'),
    testUtils = require('../../utils'),
    config = require(__dirname + '/../../../server/config'),
    sequence = require(config.paths.corePath + '/server/utils/sequence'),
    errors = require(config.paths.corePath + '/server/errors'),
    api = require(config.paths.corePath + '/server/api'),
    models = require(config.paths.corePath + '/server/models');

describe('Schedules API', function () {
    var scope = {};

    scope.beforeDescribe = function (done) {
        scope.posts = [];

        sequence([
            testUtils.teardown,
            testUtils.setup('clients', 'users:roles', 'perms:init')
        ]).then(function () {
            done();
        }).catch(done);
    };

    scope.afterDescribe = function (done) {
        testUtils.teardown(done);
    };

    describe('fn: getScheduledPosts', function () {
        before(scope.beforeDescribe);
        after(scope.afterDescribe);

        describe('success', function () {
            it('insert x posts/pages', function (done) {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.editor,
                    author_id: testUtils.users.ids.editor,
                    published_by: testUtils.users.ids.editor,
                    created_at: moment().add(2, 'days').set('hours', 8).toDate(),
                    published_at: moment().add(5, 'days').toDate(),
                    status: 'scheduled',
                    slug: '2'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment().add(2, 'days').set('hours', 12).toDate(),
                    published_at: moment().add(5, 'days').toDate(),
                    status: 'scheduled',
                    page: 1,
                    slug: '5'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    created_at: moment().add(5, 'days').set('hours', 6).toDate(),
                    published_at: moment().add(10, 'days').toDate(),
                    status: 'scheduled',
                    slug: '1'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment().add(6, 'days').set('hours', 10).set('minutes', 0).toDate(),
                    published_at: moment().add(7, 'days').toDate(),
                    status: 'scheduled',
                    slug: '3'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    created_at: moment().add(6, 'days').set('hours', 11).toDate(),
                    published_at: moment().add(8, 'days').toDate(),
                    status: 'scheduled',
                    slug: '4'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.owner,
                    author_id: testUtils.users.ids.owner,
                    published_by: testUtils.users.ids.owner,
                    status: 'draft',
                    slug: '6'
                }));

                Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, {context: {internal: true}, importing: true});
                })).then(function () {
                    return done();
                }).catch(done);
            });

            it('all', function (done) {
                api.schedules.getScheduledPosts()
                    .then(function (result) {
                        result.posts.length.should.eql(5);
                        Object.keys(result.posts[0].toJSON()).should.eql(['id', 'published_at', 'created_at', 'author', 'url']);
                        done();
                    })
                    .catch(done);
            });

            it('for specific datetime', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(2, 'days').startOf('day').toDate(),
                    to: moment().add(2, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(2);
                    done();
                }).catch(done);
            });

            it('for specific datetime', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(2, 'days').startOf('day').toDate(),
                    to: moment().add(2, 'days').set('hours', 8).toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(5, 'days').startOf('day').toDate(),
                    to: moment().add(6, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(3);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(6, 'days').set('hours', 10).set('minutes', 30).toDate(),
                    to: moment().add(6, 'days').endOf('day').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(1);
                    done();
                }).catch(done);
            });

            it('for specific date', function (done) {
                api.schedules.getScheduledPosts({
                    from: moment().add(1, 'days').toDate()
                }).then(function (result) {
                    result.posts.length.should.eql(5);
                    done();
                }).catch(done);
            });
        });

        describe('error', function () {
            it('from is invalid', function (done) {
                api.schedules.getScheduledPosts({
                    from: 'bee'
                }).catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.ValidationError).should.eql(true);
                    done();
                });
            });
        });
    });

    describe('fn: publishPost', function () {
        before(scope.beforeDescribe);
        after(scope.afterDescribe);

        describe('success', function () {
            it('insert x posts', function (done) {
                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().add(3, 'days').toDate(),
                    status: 'scheduled',
                    slug: 'first'
                }));

                scope.posts.push(testUtils.DataGenerator.forKnex.createPost({
                    created_by: testUtils.users.ids.author,
                    author_id: testUtils.users.ids.author,
                    published_by: testUtils.users.ids.author,
                    published_at: moment().add(4, 'days').toDate(),
                    status: 'scheduled',
                    slug: 'second'
                }));

                Promise.all(scope.posts.map(function (post) {
                    return models.Post.add(post, {context: {internal: true}});
                })).then(function (result) {
                    // returns id 1 and 2, but hard to check, because PG returns a different order
                    result.length.should.eql(2);
                    return done();
                }).catch(done);
            });

            it('client with specific perms has access to publish post', function (done) {
                api.schedules.publishPost({id: 1, context: {client: 'ghost-scheduler', external: true}})
                    .then(function (result) {
                        result.post.id.should.eql(1);
                        result.post.status.should.eql('published');
                        done();
                    })
                    .catch(done);
            });
        });

        describe('error', function () {
            it('ghost admin has no access', function (done) {
                api.schedules.publishPost({id: 1, context: {client: 'ghost-admin'}})
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                        done();
                    });
            });

            it('owner has no access (this is how it is right now!)', function (done) {
                api.schedules.publishPost({id: 2, context: {user: testUtils.users.ids.author}})
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.NoPermissionError).should.eql(true);
                        done();
                    });
            });

            it('other user has no access', function (done) {
                testUtils.fixtures.insertOne('users', 'createUser', 4)
                    .then(function (result) {
                        api.schedules.publishPost({id: 1, context: {user: result[0]}})
                            .catch(function (err) {
                                should.exist(err);
                                (err instanceof errors.NoPermissionError).should.eql(true);
                                done();
                            });
                    });
            });

            it('invalid params', function (done) {
                api.schedules.publishPost({id: 'bla', context: {client: 'ghost-scheduler'}})
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.ValidationError).should.eql(true);
                        done();
                    });
            });
        });
    });
});
