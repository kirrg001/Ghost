should.Assertion.add(
    'Valid_API_Authors_Response',

    function (options = {}) {
        const response = this.obj;

        should.exist(response.authors);
        should.exist(response.meta);

        response.authors.length.should.eql(options.length);

        if (response.authors.length) {
            const API = require('./API')[options.api_version][options.type];
            Object.keys(response.authors[0]).should.eql(API.author.out.fields);
        }

        const url = require('url');
        should.exist(url.parse(response.authors[0].url).protocol);
        should.exist(url.parse(response.authors[0].url).host);
    });

should.Assertion.add(
    'Valid_API_Posts_Response',

    function (options = {}) {
        const response = this.obj;

        should.exist(response.authors);
        should.exist(response.meta);

        response.authors.length.should.eql(options.length);

        if (response.authors.length) {
            const API = require('./API')[options.api_version][options.type];
            Object.keys(response.authors[0]).should.eql(API.post.out.fields);
        }

        const url = require('url');
        should.exist(url.parse(response.authors[0].url).protocol);
        should.exist(url.parse(response.authors[0].url).host);
    });

should.Assertion.add(
    'Valid_API_Headers_Response',

    function () {
        const headers = this.obj;
        should.not.exist(headers['x-cache-invalidate']);
    });
