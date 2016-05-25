var mail = require(__dirname + '../../../../server/mail'),
    testUtils = require('../../utils'),
    lodash = require('lodash'),
    Promise = require('bluebird');

describe('Mail: Utils', function () {
    it('generate newsletter', function (done) {
        var posts = [
                testUtils.DataGenerator.forKnex.createPost({
                    title: '1 Post!',
                    meta_description: 'A lovely journey.'
                }),
                testUtils.DataGenerator.forKnex.createPost({title: '2 Post!', meta_description: 'This is a...'}),
                testUtils.DataGenerator.forKnex.createPost({title: '3 Post!', meta_description: 'A beautiful mind!'})
            ],
            postsHtml = '';

        Promise.all(lodash.map(posts, function (post) {
            return mail.utils.generateContent({
                template: 'newsletter/post',
                data: post
            });
        })).each(function (result) {
            postsHtml += result.html;
        }).then(function () {
            mail.utils.generateContent({
                template: 'newsletter/index',
                data: {posts: postsHtml}
            }).then(function (result) {
                var ghostMailer = new mail.GhostMailer();

                return ghostMailer.send({
                    to: 'kate@ghost.org',
                    subject: 'lol',
                    html: result.html,
                    text: result.text
                });
            }).then(function () {
                done();
            }).catch(function (err) {
                done(err);
            })
        }).catch(done);
    });
});
