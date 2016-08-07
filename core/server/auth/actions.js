var passport = require('passport'),
    Promise = require('bluebird');

//@TODO: ghost strategy module
exports.getProfile = function userProfile(req, res, next) {
    var accessToken = req.query.accessToken;

    passport._strategies.ghost.userProfile(accessToken, function (err, profile) {
        if (err) {
            return next(err);
        }

        req.query.profile = profile;
        next();
    });
};

/*
exports.updateProfile = function userProfile(req, res, next) {
    var accessToken = req.query.accessToken;

    passport._strategies.ghost.updateProfile(accessToken, function (err, profile) {
        if (err) {
            return next(err);
        }

        req.query.profile = profile;
        next();
    });
};
*/
