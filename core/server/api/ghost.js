var ghost,
    usersAPI = require('./users'),
    Promise = require('bluebird'),
    request = require('superagent');

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
        return new Promise(function (resolve, reject) {
            request.get('http://daisy-url/billing')
                .query('access_token=' + options.access_token)
                .end(function (err, response) {
                    if (err) {
                        return reject(err);
                    }

                    resolve(response);
                })
        });
    }
};

module.exports = ghost;
