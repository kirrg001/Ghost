'use strict';

const debug = require('ghost-ignition').debug('services:url:queue'),
    EventEmitter = require('events').EventEmitter,
    common = require('../../lib/common');

/**
 * ### Purpose of this queue
 *
 * Ghost fetches as earliest as possible the resources from the database. The reason is simply: we
 * want to know all urls as soon as possible.
 *
 * Parallel to this, the routes/channels are read/prepared and registered in express.
 * So the challenge is to handle both resource availability and route registration.
 * If you start an event, all subscribers of it are executed in a sequence. The queue will wait
 * till the current subscriber has finished it's work.
 * The url service must ensure that each url in the system exists once. The order of
 * subscribers defines who will possibly own an url first.
 *
 * If an event has finished, the subscribers of this event still remain in the queue.
 * That means:
 *
 * - you can re-run an event
 * - you can add more subscribers to an existing queue
 * - you can order subscribers (helpful if you want to order routes/channels)
 *
 * Each subscriber represents one instance of the url generator. One url generator represents one channel/route.
 *
 * ### Tolerance option
 *
 * You can define a tolerance value per event. If you want to wait an amount of time till you think
 * all subscribers have registered.
 *
 * ### Some examples to understand cases
 *
 * e.g.
 *  - resources have been loaded, event has started
 *  - no subscribers yet, we need to wait, express still initialises
 *  - okay, routes are coming in
 *  - we notify the subscribers
 *
 * e.g.
 *  - resources are in the progress of fetching from the database
 *  - routes are already waiting for the resources
 *
 * e.g.
 *  - resources are in the progress of fetching from the database
 *  - 2 subscribers are already registered
 *  - resources finished, event starts
 *  - 2 more subscribers are coming in

 * ### Events
 *   - unique events e.g. added, updated, init, all
 *   - has subscribers
 *   - we remember the subscriber
 *
 * ### Actions
 *   - one event can have multiple actions
 *   - unique actions e.g. add post 1, add post 2
 *   - one event might only allow a single action to avoid collisions e.g. you initialise data twice
 *   - if an event has no action, the name of the action is the name of the event
 *   - in this case the event can only run once at a time
 *   - makes use of `toNotify` to remember who was notified already
 */
class Queue extends EventEmitter {
    constructor() {
        super();
        this.queue = {};
        this.toNotify = {};
    }

    /**
     * `tolerance`:
     *   - 0: don't wait for more subscribers [default]
     *   - 100: wait long enough till all subscribers have registered (e.g. bootstrap)
     */
    register(options, fn) {
        if (!options.hasOwnProperty('tolerance')) {
            options.tolerance = 0;
        }

        // CASE: nobody has initialised the queue event yet
        if (!this.queue.hasOwnProperty(options.event)) {
            this.queue[options.event] = {
                tolerance: options.tolerance,
                subscribers: []
            };
        }

        debug('add', options.event, options.tolerance);

        this.queue[options.event].subscribers.push(fn);
    }

    run(options) {
        const event = options.event,
            action = options.action,
            eventData = options.eventData;

        clearTimeout(this.toNotify[action].timeout);
        this.toNotify[action].timeout = null;

        debug('run', action, event, this.queue[event].subscribers.length, this.toNotify[action].notified.length);

        if (this.queue[event].subscribers.length && this.queue[event].subscribers.length !== this.toNotify[action].notified.length) {
            const fn = this.queue[event].subscribers[this.toNotify[action].notified.length];

            debug('execute', action, event, this.toNotify[action].notified.length);

            return fn(eventData)
                .then(() => {
                    debug('executed', action, event, this.toNotify[action].notified.length);
                    this.toNotify[action].notified.push(fn);
                    this.run(options);
                })
                .catch((err) => {
                    throw new common.errors.InternalServerError({
                        message: 'Something bad happened',
                        err: err
                    });
                });
        } else {
            // CASE 1: zero tolerance, kill run fn
            // CASE 2: okay, i was tolerant enough, kill me
            // CASE 3: wait for more subscribers, i am still tolerant
            if (options.tolerance === 0) {
                delete this.toNotify[action];
                debug('ended', event, action);
                this.emit('ended', event);
            } else if (this.toNotify[action].timeoutInMS > this.queue[event].tolerance) {
                debug('ended', event, action);
                this.emit('ended', event);
                delete this.toNotify[action];
            } else {
                this.toNotify[action].timeoutInMS = this.toNotify[action].timeoutInMS * 1.1;

                this.toNotify[action].timeout = setTimeout(() => {
                    this.run(options);
                }, this.toNotify[action].timeoutInMS);
            }
        }
    }

    start(options) {
        // CASE: nobody is in the event queue waiting yet
        // e.g. all resources are fetched already, but no subscribers (bootstrap)
        // happens only for high tolerant events
        if (!this.queue.hasOwnProperty(options.event)) {
            this.queue[options.event] = {
                tolerance: options.tolerance || 0,
                subscribers: []
            };
        }

        // CASE: the queue supports killing an event, when the event has no action
        // e.g. `init` event
        if (!options.action) {
            options.action = options.event;

            // CASE: is the action already running, stop it, because e.g. configuration has changed
            if (this.toNotify[options.action]) {
                // CASE: timeout was registered, kill it, this will stop the run function of this action
                if (this.toNotify[options.action].timeout) {
                    clearTimeout(this.toNotify[options.action].timeout);
                    this.toNotify[options.action].timeout = null;
                } else {
                    // CASE: event is started behind each other and the async operation is in progress
                    // @TODO: this needs a test, not sure what todo here without a test
                    throw new common.errors.IncorrectUsageError({
                        message: 'This can\'t happen.'
                    });
                }
            }
        }

        // reset who was already notified
        this.toNotify[options.action] = {
            event: options.event,
            timeoutInMS: 50,
            notified: []
        };

        this.emit('started', options.event);
        this.run(options);
    }
}

module.exports = Queue;
