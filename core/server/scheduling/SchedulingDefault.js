var util = require('util'),
    Promise = require('bluebird'),
    lodash = require('lodash'),
    moment = require('moment'),
    request = require('superagent'),
    SchedulingBase = require('./SchedulingBase');

/**
 * @TODO
 * - job should already scheduled (on bootstrap)
 * - test run takes a little too long
 * - delete job use case --> url ping would fail, 404 ignore
 * - unpublish post --> diff is too small? ---> check in endpoint if post is scheduled?
 * - integrate ping
 * - request all scheduled posts
 */


/**
 * jobs is a sorted list by time attribute
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);

    // TODO: ensure interval comes from options
    this.interval = 1000 * 60 * 5;
    this.offsetInMinutes = 10;

    this.allJobs = {};
    this.deletedJobs = {};
    this._run();
}

util.inherits(SchedulingDefault, SchedulingBase);

SchedulingDefault.prototype.bootstrap = function () {
    return Promise.resolve();
};

/**
 * add to list
 */
SchedulingDefault.prototype.schedule = function (object) {
    this._addJob(object);
};

/**
 * remove from list
 * add to list
 */
SchedulingDefault.prototype.reschedule = function (object) {
    this._deleteJob({time: object.extra.oldTime, url: object.url});
    this._addJob(object);
};

/**
 * remove from list
 */
SchedulingDefault.prototype.unschedule = function (object) {
    this._deleteJob(object);
};

/**
 * each timestamp key entry can have multiple jobs
 */
SchedulingDefault.prototype._addJob = function (object) {
    var timestamp = moment(object.time).valueOf();

    if (moment(timestamp).diff(moment(), 'minutes') < this.offsetInMinutes) {
        var jobs = {};
        jobs[timestamp] = [object];
        this._execute(jobs);
        return;
    }

    if (this.allJobs[timestamp]) {
        var element = this.allJobs[timestamp];
        this.allJobs[timestamp] = [];
        this.allJobs[timestamp].push(element);
        this.allJobs[timestamp].push(object);
    } else {
        this.allJobs[timestamp] = [];
        this.allJobs[timestamp].push(object);
    }

    var keys = Object.keys(this.allJobs),
        sortedJobs = {};

    keys.sort();

    for (var i = 0; i < keys.length; i = i + 1) {
        sortedJobs[keys[i]] = this.allJobs[keys[i]];
    }

    this.allJobs = sortedJobs;
};

SchedulingDefault.prototype._deleteJob = function (object) {
    this.deletedJobs[object.url + object.time] = true;
};

SchedulingDefault.prototype._run = function () {
    var self = this,
        timeout = null;

    timeout = setTimeout(function () {
        var keys = Object.keys(self.allJobs),
            nextJobs = {};

        keys.every(function (key) {
            if (moment(Number(key)).diff(moment(), 'minutes') <= self.offsetInMinutes) {
                nextJobs[key] = self.allJobs[key];
                delete self.allJobs[key];
                return true;
            }

            // break!
            return false;
        });

        self._execute(nextJobs);
        clearTimeout(timeout);
        self._run();
    }, self.interval);
};

/**
 * setTimeout is not accurate, but we can live with that fact and use immediate feature to qualify
 */
SchedulingDefault.prototype._execute = function (jobs) {
    var keys = Object.keys(jobs),
        self = this;

    keys.forEach(function (timestamp) {
        var timeout = null,
            diff = moment(Number(timestamp)).diff(moment());

        // awake a little before
        timeout = setTimeout(function () {
            clearTimeout(timeout);

            (function retry() {
                var immediate = setImmediate(function () {
                    // xms buffer to execute URL ping
                    if (moment().diff(moment(Number(timestamp))) >= -50) {
                        var toExecute = jobs[timestamp];
                        delete jobs[timestamp];

                        toExecute.forEach(function (job) {
                            if (self.deletedJobs[job.url + job.time]) {
                                delete self.deletedJobs[job.url + job.time];
                                return;
                            }

                            self._pingUrl(job);
                        });

                        return clearImmediate(immediate);
                    }

                    retry();
                });
            })();
        }, diff - 200);
    });
};

SchedulingDefault.prototype._pingUrl = function (object) {
    var url = object.url,
        httpMethod = object.extra.httpMethod;

    // request[httpMethod](url);
};

module.exports = SchedulingDefault;
