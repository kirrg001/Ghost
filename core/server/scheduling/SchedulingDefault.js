var util = require('util'),
    Promise = require('bluebird'),
    lodash = require('lodash'),
    moment = require('moment'),
    request = require('superagent'),
    SchedulingBase = require('./SchedulingBase');

/**
 * jobs is a sorted list by time attribute
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);

    // TODO: ensure interval comes from options
    this.interval = 1000 * 60 * 5;
    this.offsetInMinutes = 10;

    this.allJobs = {};
    this._run();
}

util.inherits(SchedulingDefault, SchedulingBase);

// @TODO: request all scheduled posts
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
};

/**
 * remove from list
 */
SchedulingDefault.prototype.unschedule = function (object) {
};

/**
 * each timestamp key entry can have multiple jobs
 * measure how slow/fast
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

/**
 * delete jobs by time and url?
 */
SchedulingDefault.prototype._deleteJob = function () {

};

/**
 * - sleep 5 minutes and move jobs from big list to next jobs (jobs which will be executed in next 6 minutes
 * - do not sleep when called for first time!!!!!
 * - sleep 5minutes
 * - setTimeout is not a promise that it will run in exactly 5 minutes
 * - then look which items needs to be scheduled in the next 5 minutes
 * - are there any items we missed (how is this possible?), on bootstrap we already check this
 * - when runner awakes it can happen that in the next 5 minutes there is a job exactly in the next second, so the jobs should be already sorted
 */
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
 * @TODO:
 * - todo use setImmediate?
 * - check memory with many many jobs, take a heap
 */
SchedulingDefault.prototype._execute = function (jobs) {
    var keys = Object.keys(jobs),
        self = this;

    keys.forEach(function (timestamp) {
        var timeout = null,
            interval = null,
            diff = moment(Number(timestamp)).diff(moment());

        // awake 1 second before job needs to be executed
        timeout = setTimeout(function () {
            clearTimeout(timeout);

            // go closer step by step
            interval = setInterval(function () {
                if (moment().diff(moment(Number(timestamp))) >= -100) {
                    var toExecute = jobs[timestamp];
                    delete jobs[timestamp];

                    toExecute.forEach(function (job) {
                        self._pingUrl(job);
                    });

                    clearInterval(interval);
                }
            }, 100);
        }, diff - 1000);
    });
};

SchedulingDefault.prototype._pingUrl = function (object) {

};

module.exports = SchedulingDefault;
