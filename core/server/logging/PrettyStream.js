var lodash = require('lodash'),
    Stream = require('stream').Stream,
    util = require('util'),
    format = util.format,
    prettyjson = require('prettyjson'),
    __private__ = {
        levelFromName: {
            10: 'trace',
            20: 'debug',
            30: 'info',
            40: 'warn',
            50: 'error',
            60: 'fatal'
        },
        colorForLevel: {
            10: 'grey',
            20: 'grey',
            30: 'cyan',
            40: 'magenta',
            50: 'red',
            60: 'inverse'
        },
        colors: {
            'bold': [1, 22],
            'italic': [3, 23],
            'underline': [4, 24],
            'inverse': [7, 27],
            'white': [37, 39],
            'grey': [90, 39],
            'black': [30, 39],
            'blue': [34, 39],
            'cyan': [36, 39],
            'green': [32, 39],
            'magenta': [35, 39],
            'red': [31, 39],
            'yellow': [33, 39]
        }
    };



function PrettyStream(options) {
    options = options || {};

    this.printOnly = options.printOnly;
}
util.inherits(PrettyStream, Stream);


PrettyStream.prototype.write = function write(data) {
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (err) {
            this.emit('data', err);
        }
    }

    var body = {},
        time = data.time,
        logLevel = __private__.levelFromName[data.level].toUpperCase(),
        codes = __private__.colors[__private__.colorForLevel[data.level]];

    logLevel = '\x1B[' + codes[0] + 'm' + logLevel + '\x1B[' + codes[1] + 'm';

    if (data.msg) {
        body.msg = data.msg;
    }

    lodash.each(this.printOnly, function(key) {
        if (data[key]) {
            body[key] = data[key];
        }
    });

    try {
        this.emit('data', format('[%s] %s: \n%s\n\n',
            time,
            logLevel,
            '\x1B[' + __private__.colors['grey'][0] + 'm' + prettyjson.render(body, {}) + '\x1B[' + __private__.colors['grey'][1] + 'm'
        ));
    } catch (err) {
        this.emit('data', err);
    }

    return true;
};


module.exports = PrettyStream;
