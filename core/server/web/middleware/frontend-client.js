var api = require('../../api'),
    labs = require('../../services/labs'),
    common = require('../../lib/common'),
    frontendClient;

// @TODO: null frontendclient if the client changes?
module.exports = function getFrontendClient(req, res, next) {
    if (labs.isSet('publicAPI') !== true) {
        return next();
    }

    if (frontendClient) {
        if (frontendClient.status === 'enabled') {
            res.locals.client = {
                id: frontendClient.slug,
                secret: frontendClient.secret
            };
        }

        next();
        return;
    }

    return api.clients
        .read({slug: 'ghost-frontend', fields: 'slug, secret'})
        .then(function handleClient(client) {
            client = client.clients[0];

            if (client.status === 'enabled') {
                res.locals.client = {
                    id: client.slug,
                    secret: client.secret
                };
            }

            frontendClient = client;

            next();
        })
        .catch(function (err) {
            // Log the error, but carry on as this is non-critical
            common.logging.error(err);
            next();
        });
};
