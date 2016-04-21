var lodash = require('lodash'),
    Promise = require('bluebird'),
    SchedulingBase = require('./SchedulingBase'),
    errors = require(__dirname + '/../errors');

exports.createAdapter = function (options) {
    options = options || {};

    var adapter = null,
        scheduler = options.scheduler,
        loadPath = options.loadPath;

    /**
     * CASE: scheduler is SchedulerDefault Path or npm module
     */
    try {
        adapter = new (require(scheduler))(options);
    } catch (err) {}

    /**
     * CASE: scheduler is located on loadPath
     */
    try {
        adapter = adapter || new (require(loadPath + scheduler))(options);
    } catch (err) {
        return Promise.reject(err);
    }

    if (!(adapter instanceof SchedulingBase)) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    if (!adapter.requiredFns) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    if (lodash.xor(adapter.requiredFns, Object.keys(lodash.pick(Object.getPrototypeOf(adapter), adapter.requiredFns))).length) {
        return Promise.reject(new errors.IncorrectUsage());
    }

    return Promise.resolve(adapter);
};
