var passport = require('./passport'),
    actions = require('./actions'),
    oauth = require('./oauth');

exports.init = function (options) {
    oauth.init();

    return passport.init(options)
        .then(function (response) {
            return {auth: response.passport};
        });
};

exports.oauth = oauth;
exports.actions = actions;
