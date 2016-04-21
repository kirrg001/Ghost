var util = require('util'),
    Promise = require('bluebird'),
    SchedulingBase = require('./SchedulingBase');

/**
 * @TODO: implement me
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);
}

util.inherits(SchedulingDefault, SchedulingBase);

SchedulingDefault.prototype.bootstrap = function () {
    return Promise.resolve();
};

SchedulingDefault.prototype.schedule = function () {};
SchedulingDefault.prototype.reschedule = function () {};
SchedulingDefault.prototype.unschedule = function () {};

module.exports = SchedulingDefault;
