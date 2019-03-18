const localUtils = require('./utils');

describe('Admin API: Use Cases', function () {
    let options;

    before(function () {
        return localUtils.server.start()
            .then((_options) => {
                options = _options;
            });
    });

    after(function () {
        return localUtils.server.stop();
    });

    it('can add a post', function () {
        console.log(options.data);
        return options.request
            .post(localUtils.constants.URL.admin(`posts/`))
            .set('Origin', options.ghostConfig.url)
            .set('Authorization',
                `Ghost ${localUtils.constants.API_KEYS.ADMIN({
                    endpoint: localUtils.constants.URL.admin('posts/'),
                    apiKeyId: options.data.ApiKey[0].id
                })}`
            )
            .send({
                posts: [
                    localUtils.API[options.api_version]['admin'].post.in.create()
                ]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', localUtils.constants.CACHE_RULES.private)
            .expect(200)
            .then(function (res) {
                res.body.should.be.a.Valid_API_Posts_Response({
                    length: 1
                });

                res.headers.should.be.a.Valid_API_Headers_Response();
            });
    });
});
