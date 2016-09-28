var passport = require('passport');

exports.getProfile = function userProfile(req, res, next) {
    var accessToken = req.query.accessToken;

    passport._strategies.ghost.userProfile(accessToken, function (err, profile) {
        if (err) {
            return next(err);
        }

        req.query.patronusUser = profile;
        next();
    });
};
