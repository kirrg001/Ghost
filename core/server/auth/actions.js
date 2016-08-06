var passport = require('passport');

//@TODO: rename this to ghost strategy and offer functions
exports.changePassword = function (options) {
    var accessToken = options.accessToken,
        oldPassword = options.oldPassword,
        newPassword = options.newPassword;

    return passport._strategies.ghost.changePassword(options);
};
