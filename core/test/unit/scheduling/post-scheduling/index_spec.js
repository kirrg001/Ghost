/*globals describe, it, before, after*/

var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    config = require(__dirname + '/../../../../server/config'),
    testUtils = require(config.paths.corePath + '/test/utils'),
    errors = require(config.paths.corePath + '/server/errors'),
    events = require(config.paths.corePath + '/server/events'),
    models = rewire(config.paths.corePath + '/server/models'),
    schedulingUtils = require(config.paths.corePath + '/server/scheduling/utils'),
    SchedulingDefault = require(config.paths.corePath + '/server/scheduling/SchedulingDefault'),
    postScheduling = rewire(config.paths.corePath + '/server/scheduling/post-scheduling');

describe('Scheduling: Post Scheduling', function () {
    var scope = {events: {}};

    before(function () {
        models.init();

        scope.apiUrl = 'localhost:1111/';
        scope.client = models.Client.forge(testUtils.DataGenerator.forKnex.createClient({slug: 'ghost-scheduler'}));
        scope.post = models.Post.forge(testUtils.DataGenerator.forKnex.createPost({id: 1337, markdown: 'something'}));
        scope.adapter = new SchedulingDefault();

        sinon.stub(events, 'onMany', function (events, stubDone) {
            events.forEach(function (event) {
                scope.events[event] = stubDone;
            });
        });

        sinon.stub(schedulingUtils, 'createAdapter').returns(Promise.resolve(scope.adapter));

        models.Client.findOne = function () {
            return Promise.resolve(scope.client);
        };

        postScheduling.__set__('models', models);
        sinon.spy(scope.adapter, 'schedule');
    });

    after(function () {
        schedulingUtils.createAdapter.restore();
        scope.adapter.schedule.restore();
        events.onMany.restore();
    });

    describe('fn:init', function () {
        describe('success', function () {
            it('will be scheduled', function (done) {
                postScheduling.init({
                    apiUrl: scope.apiUrl,
                    postScheduling: {}
                }).then(function () {
                    scope.events['post.scheduled'](scope.post);
                    scope.adapter.schedule.called.should.eql(true);

                    scope.adapter.schedule.calledWith({
                        time: scope.post.get('published_at'),
                        url: scope.apiUrl + 'schedules/posts/' + scope.post.get('id') + '?client_id=' + scope.client.get('slug') + '&client_secret=' + scope.client.get('secret'),
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
