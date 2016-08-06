var ghost,
    usersAPI = require('./users');

ghost = {
    getUserProfile: function getUserProfile(options) {
        return usersAPI.read(options)
            .then(function (response) {
                return {
                    users: response.users,
                    profile: options.profile
                };
            })
    },

    //@TODO: move to moya
    getBilling: function getBilling(options) {
        throw new Error('implement me');
    }
};

module.exports = ghost;
