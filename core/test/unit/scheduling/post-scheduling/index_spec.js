/*globals describe, it, before, after*/

var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    config = require(__dirname + '/../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    errors = require(config.paths.corePath + '/server/errors'),
    events = require(config.paths.corePath + '/server/events'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils'),
    SchedulingDefault = require(config.paths.corePath + '/server/scheduling/SchedulingDefault'),
    postScheduling = require(config.paths.corePath + '/server/scheduling/post-scheduling');

describe('Scheduling: Post Scheduling', function () {
    var scope = {};

    before(function () {
        scope.adapter = new SchedulingDefault();

        sinon.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(scope.adapter));
        sinon.spy(scope.adapter, 'schedule');
    });

    after(function () {
        schedulingUtils.createAdapter.restore();
        scope.adapter.schedule.restore();
    });

    describe('fn:init', function () {
        describe('success', function () {
            it('....', function (done) {
                var post = testUtils.DataGenerator.forKnex.createPost({id: 1337, markdown: 'something'});

                postScheduling.init({
                    config: {
                        url: 'localhost:1111/trigger/me'
                    }
                }).then(function () {
                    events.emit('post.scheduled', post);
                    scope.adapter.schedule.called.should.eql(true);

                    scope.adapter.schedule.calledWith({
                        time: post.published_at,
                        url: 'localhost:1111/trigger/me/schedules/posts/' + post.id,
                        extra: {
                            httpMethod: 'PUT'
                        }
                    }).should.eql(true);

                    done();
                }).catch(done);
            });
        });

        describe('error', function () {
            it('no url passed', function (done) {
                postScheduling.init()
                    .catch(function (err) {
                        should.exist(err);
                        (err instanceof errors.IncorrectUsage).should.eql(true);
                        done();
                    });
            });
        });
    });
});
