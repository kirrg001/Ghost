var models = require('../models'),
    utils  = require('../utils'),
    errors  = require('../errors'),
    strategies;

strategies = {

    /**
     * ClientPasswordStrategy
     *
     * This strategy is used to authenticate registered OAuth clients.  It is
     * employed to protect the `token` endpoint, which consumers use to obtain
     * access tokens.  The OAuth 2.0 specification suggests that clients use the
     * HTTP Basic scheme to authenticate (not implemented yet).
     * Use of the client password strategy is implemented to support ember-simple-auth.
     */
    clientPasswordStrategy: function clientPasswordStrategy(clientId, clientSecret, done) {
        return models.Client.findOne({slug: clientId}, {withRelated: ['trustedDomains']})
            .then(function then(model) {
                if (model) {
                    var client = model.toJSON({include: ['trustedDomains']});
                    if (client.status === 'enabled' && client.secret === clientSecret) {
                        return done(null, client);
                    }
                }
                return done(null, false);
            });
    },

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
    bearerStrategy: function bearerStrategy(accessToken, done) {
        return models.Accesstoken.findOne({token: accessToken})
            .then(function then(model) {
                if (model) {
                    var token = model.toJSON();
                    if (token.expires > Date.now()) {
                        return models.User.findOne({id: token.user_id})
                            .then(function then(model) {
                                if (model) {
                                    var user = model.toJSON(),
                                        info = {scope: '*'};
                                    return done(null, {id: user.id}, info);
                                }
                                return done(null, false);
                            });
                    } else {
                        return done(null, false);
                    }
                } else {
                    return done(null, false);
                }
            });
    },

    /**
     * Ghost Strategy
     * patronusRefreshToken: will be null for now, because we don't need it right now
     */
    ghostStrategy: function ghostStrategy(req, patronusAccessToken, patronusRefreshToken, profile, done) {
        var user;

        models.User.findOne({email: profile.email})
            .then(function (_user) {
                user = _user;

                if (!user) {
                    return done(null, false);
                }

                return models.User.edit({patronus_access_token: patronusAccessToken}, {id: user.id});
            })
            .then(function (_user) {
                user = _user;

                if (!user) {
                    return done(null, false);
                }

                done(null, user, profile);
            })
            .catch(function (err) {
                done(err);
            });
    }
};

module.exports = strategies;
