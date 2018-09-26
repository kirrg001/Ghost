const shared = require('../shared');

const http = (apiImpl) => {
    return (req, res, next) => {
        const options = new shared.Options({
            data: req.body,
            query: req.query,
            params: req.params,
            file: req.file,
            files: req.files,
            apiOptions: {
                context: {
                    user: req.user.id
                }
            }
        });

        apiImpl(options)
            .then((result) => {
                res.status(apiImpl.statusCode || 200);

                res.set(shared.headers.get(result, apiImpl.headers));

                if (apiImpl.response && apiImpl.response.format === 'plain') {
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
