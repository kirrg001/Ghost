var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    GhostOAuth2Strategy = require('passport-ghost').Strategy,
    passport = require('passport'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    config = require('../config'),
    models = require('../models');

exports.init = function (options) {
    var type = options.type || 'password';

    return new Promise(function (resolve, reject) {
        passport.use(new ClientPasswordStrategy(authStrategies.clientPasswordStrategy));
        passport.use(new BearerStrategy(authStrategies.bearerStrategy));

        if (type !== 'patronus') {
            return resolve({passport: passport.initialize()});
        }

        var ghostOAuth2Strategy = new GhostOAuth2Strategy({
            callbackURL: config.getBaseUrl() + '/ghost/',
            tokenURL: 'http://localhost:8080/oauth2/token',
            registerURL: 'http://localhost:8080/oauth2/client',
            userProfileURL: 'http://localhost:8080/oauth2/userinfo',
            passReqToCallback: true
        }, authStrategies.ghostStrategy);

        models.Client.findOne({name: 'patronus'}, {context: {internal: true}})
            .then(function (client) {
                if (client) {
                    return Promise.resolve({
                        client_id: client.get('uuid'),
                        client_secret: client.get('secret')
                    });
                }

                return ghostOAuth2Strategy.registerClient()
                    .then(function (credentials) {
                        //@TODO: uuid usage
                        return models.Client.add({
                            name: 'patronus',
                            slug: 'patronus',
                            uuid: credentials.client_id,
                            secret: credentials.client_secret
                        }, {context: {internal: true}});
                    });
            })
            .then(function (client) {
                ghostOAuth2Strategy.setClient(client);
                passport.use(ghostOAuth2Strategy);
                return resolve({passport: passport.initialize()});
            })
            .catch(reject);
    });
};
