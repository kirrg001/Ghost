var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy,
    BearerStrategy = require('passport-http-bearer').Strategy,
    GhostOAuth2Strategy = require('passport-ghost').Strategy,
    passport = require('passport'),
    Promise = require('bluebird'),
    authStrategies = require('./auth-strategies'),
    config = require('../config'),
    models = require('../models'),
    _private = {};

_private.registerClient = function (ghostOAuth2Strategy) {
    return new Promise(function (resolve, reject) {
        var retry = function (retryCount, done) {
            models.Client.findOne({name: 'patronus'}, {context: {internal: true}})
                .then(function (client) {
                    if (client) {
                        console.log('patronus client already created...');

                        return done(null, {
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
                        })
                        .then(function (client) {
                            console.log('successfully registered client', client);

                            return done(null, {
                                client_id: client.get('uuid'),
                                client_secret: client.get('secret')
                            });
                        })
                        .catch(function (err) {
                            console.log('error from patronus', err);

                            if (retryCount < 0) {
                                return done(new Error('could not register client for patronus:' + err.code || err.message));
                            }

                            console.log('waiting for retry for getting patronus client...');

                            var timeout = setTimeout(function () {
                                clearTimeout(timeout);
                                retryCount = retryCount - 1;
                                retry(retryCount, done);
                            }, 3000);
                        });
                })
                .catch(reject);
        };

        retry(10, function (err, client) {
            if (err) {
                return reject(err);
            }

            resolve(client);
        });
    });
};

exports.init = function (options) {
    var type = options.type;

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
            changePasswordURL: 'http://localhost:8080/oauth2/password',
            passReqToCallback: true
        }, authStrategies.ghostStrategy);

        _private.registerClient(ghostOAuth2Strategy)
            .then(function (client) {
                console.log('ghostOAuth2Strategy: set client', client);
                ghostOAuth2Strategy.setClient(client);
                passport.use(ghostOAuth2Strategy);
                return resolve({passport: passport.initialize()});
            })
            .catch(reject);
    });
};
