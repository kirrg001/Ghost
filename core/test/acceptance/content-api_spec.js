const localUtils = require('./utils');

describe('Content API: Use Cases', function () {
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

    it('can browse authors', function () {
        return options.request
            .get(localUtils.constants.URL.content(`authors/?key=${localUtils.constants.API_KEYS.CONTENT}`))
            .set('Origin', options.config.url)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', localUtils.constants.CACHE_RULES.private)
            .expect(200)
            .then(function (res) {
                res.body.should.be.a.Valid_API_Authors_Response({
                    length: 2,
                    api_version: options.api_version,
                    type: 'content'
                });

                res.headers.should.be.a.Valid_API_Headers_Response();

                // Default order 'name asc' check
                res.body.authors[0].slug.should.eql('joe-bloggs');
                res.body.authors[1].slug.should.eql('slimer-mcectoplasm');
            });
    });
});
