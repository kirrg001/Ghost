var passport = require('passport'),
    Promise = require('bluebird');

//@TODO: rename this to ghost strategy and offer functions
exports.changePassword = function changePassword(req, res, next) {
    var accessToken = req.accessToken,
        password = req.body.password[0],
        oldPassword = password.oldPassword,
        newPassword = password.newPassword;

    passport._strategies.ghost.changePassword({
        accessToken: accessToken,
        oldPassword: oldPassword,
        newPassword: newPassword
    }, next);
};

exports.userProfile = function userProfile(req, res, next) {
    var accessToken = req.accessToken;

    passport._strategies.ghost.userProfile(accessToken, function (err, profile) {
        if (err) {
            return next(err);
        }

        req.profile = profile;
        next();
    });
};
