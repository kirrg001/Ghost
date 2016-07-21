var bunyan = require('bunyan'),
    lodash = require('lodash'),
    moment = require('moment'),
    PrettyStream = require('./PrettyStream'),
    __private__ = {
        loggers: {},
        serializers: {}
    };


/**
 * we manually report an error if uncaught because...
 * if in req serializer error --> it would get reported to req.stack
 */
__private__.serializers = {
    meta: function(obj) {
        return obj;
    },
    req: function(req) {
        return {
            'headers': req.headers,
            'body': req.body,
            'query': req.query,
            'url': req.url,
            'method': req.method,
            'params': req.params,
            'originalUrl': req.originalUrl,
            'statusCode': req.statusCode
        };
    },
    res: function(res) {
        return {
            _headers: res._headers,
            statusCode: res.statusCode
        };
    },
    err: function(err) {
        return {
            name: err.name,
            stack: err.stack
        };
    }
};


__private__.log = {
    info: function(options) {
        var req = options.req,
            res = options.res;

        lodash.each(__private__.loggers, function(logger) {
            logger.log.info({
                meta: __private__.meta,
                req: req,
                res: res,
                index: '[' + __private__.env + '-' + __private__.indexName + '-]' + moment().format('YYYY.MM.DD')
            });
        });
    },
    error: function(options) {
        var req = options.req,
            res = options.res,
            err = options.err;

        lodash.each(__private__.loggers, function(logger) {
            logger.log.error({
                meta: __private__.meta,
                req: req,
                res: res,
                err: err,
                index: '[' + __private__.env + '-' + __private__.indexName + '-]' + moment().format('YYYY.MM.DD')
            });
        });
    }
};


var prettyStdOut = new PrettyStream({ printOnly: Object.keys(__private__.serializers) });
prettyStdOut.pipe(process.stdout);


exports.init = function(options) {
    var streams = [],
        transports = options.transports,
        level = options.level || 'info',
        env = options.env || 'production',
        indexName = options.indexName || 'ghost-blog',
        meta = options.meta || {};

    __private__.loggers = {};
    __private__.env = env;
    __private__.meta = meta;
    __private__.indexName = indexName;

    lodash.each(transports, function(transport) {
        if (transport === 'file') {
            streams.push({
                name: 'file',
                stream: {
                    path: './ghost.log',
                    level: level
                }
            });
        }

        if (transport === 'stdout') {
            streams.push({
                name: 'stdout',
                stream: {
                    stream: prettyStdOut,
                    level: level
                }
            });
        }
    });

    // the env defines which streams are available
    lodash.each(streams, function(stream) {
        __private__.loggers[stream.name] = {
            name: stream.name,
            log: bunyan.createLogger({
                name: 'Log',
                streams: [stream.stream],
                serializers: __private__.serializers
            })
        };
    });
};


// simple message on stdout
exports.info = function() {
    var print = '';

    lodash.each(arguments, function(value) {
        print += value;
        print += ' ';
    });

    __private__.loggers['stdout'].log.info(print);
};


exports.error = function(options) {
    var err = options.err,
        req = options.req,
        res = options.res;

    __private__.log.error({ err: err, req: req, res: res });
};


exports.request = function(options) {
    var req = options.req,
        res = options.res;

    __private__.log.info({ req: req, res: res });
};
