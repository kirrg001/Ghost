/*globals describe, it, before, after*/

var sinon = require('sinon'),
    Promise = require('bluebird'),
    config = require(__dirname + '/../../../server/config'),
    scheduling = require(config.paths.corePath + '/server/scheduling'),
    postScheduling = require(config.paths.corePath + '/server/scheduling/post-scheduling');

describe('Scheduling', function () {
    before(function () {
        sinon.stub(postScheduling, 'init').returns(Promise.resolve());
    });

    after(function () {
        postScheduling.init.restore();
    });

    describe('success', function () {
        it('ensure post scheduling init is called', function (done) {
            scheduling.init({
                postScheduling: {}
            }).then(function () {
                postScheduling.init.called.should.eql(true);
                done();
            }).catch(done);
        });
    });
});
