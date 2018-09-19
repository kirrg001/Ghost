const _ = require('lodash');
const shared = require('../../shared');

const http = (apiImpl) => {
    return (req, res, next) => {
        let object = req.body;
        let options = Object.assign({}, req.file, {ip: req.ip}, req.query, req.params, {
            context: {
                user: req.user
            }
        });

        if (req.files) {
            options.files = req.files;
        }

        if (_.isEmpty(object)) {
            object = options;
            options = {};
        }

        return apiImpl.call(object, options)
            .tap((result) => {
                res.status(apiImpl.statusCode || 200);

                res.set(shared.headers.get(result, apiImpl.headers));

                if (apiImpl.response.format === 'plain') {
                    return res.send(result);
                }

                // CASE: api method wants to handle the express response (e.g. streams)
                if (typeof result === 'function') {
                    return result(req, res, next);
                }

                res.json(result || {});
            })
            .catch((err) => {
                next(err);
            });
    };
};

module.exports = http;
