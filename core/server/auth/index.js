var passport = require('./passport'),
    oauth = require('./oauth');

exports.init = function (options) {
    oauth.init();

    return passport.init(options)
        .then(function (response) {
            return {auth: response.passport};
        });
};

exports.oauth = oauth;
