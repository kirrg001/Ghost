'use strict';

const debug = require('ghost-ignition').debug('services:url:queue'),
    common = require('../../lib/common');

/**
 *
 * Ghost fetches as earliest as possible the resources.
 * Parallel to this, the routes are fetched/prepared and registered.
 * So the challenge is to handle both resources availability and route registration.
 * Furthermore, we need to ensure that the first route of a type, receives the data first.
 * We need to ensure that each `url` is owned by exactly one route.
 *
 * e.g.
 *  - resources have finished, event is triggered e.g. `resources:fetched`
 *  - no listeners yet, we need to wait, express initialises
 *  - okay, routes are coming in, they are waiting for data
 *
 * e.g.
 *  - resources are in progress
 *  - routes are already waiting for the resources
 *
 * e.g.
 *  - resources are in progress
 *  - 2 routes are already registered
 *  - resources finished, event is triggered
 *  - 2 more routes registered
 *
 * Long running events will remain listening, but the timeout is exponential.
 * The event will be waked up as soon as there is a new subscriber.
 *
 * e.g.
 *   - we add a UI for routes
 *   - user adds a new route
 *   - with a specific position (position defines who will possibly owns the resource first)
 *   - we have to reinitialise all routes
 *      - the alternative is to only reinitialise url generators which are below my position, but error prone
 *
 * e.g.
 *   - we add a UI for routes
 *   - user orders routes
 *   - the queue array order represents the route order (priority, first filter which matches will own the resource)
 *   - all url generators need to reinitialise
 *   - the url generator owns a number of resources
 *   - queue will be reinitialised
 *
 * e.g.
 *   - we add a UI for routes
 *   - you remove a route
 *   - the target url generator can free it's resources
 *   - but we need to check if any other route will then own the post
 *   - so the order of url generators will be re-asked if they want to own the free resources
 *   - we first would need to reset everything
 *   - this is the easiest implementation and less error prone
 *   - and you don't change your routes every day
 *
 * Events:
 *   - unique events e.g. added, updated, init, all
 *   - each subscriber subscribes to events
 *   - we remember the subscriber
 *
 * Actions:
 *   - one event can have multiple actions
 *   - unique actions e.g. add post 1
 *   - one event might only allow a single action to avoid collisions e.g. you initialise data twice
 */
class Queue {
    constructor(type) {
        this.type = type;
        this.queue = {};
        this.toNotify = {};
    }

    /**
     * `tolerance`:
     *   - 0: don't wait for more subscribers [default]
     *   - 100: wait long enough till all subscribers have registered (e.g. bootstrap)
     */
    add(options, fn) {
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

        debug('add', this.type, options.event, options.tolerance);

        this.queue[options.event].subscribers.push(fn);
    }

    run(options) {
        const event = options.event,
            action = options.action,
            eventData = options.eventData;

        clearTimeout(this.toNotify[action].timeout);
        this.toNotify[action].timeout = null;

        debug('run', this.type, action, event, this.queue[event].subscribers.length, this.toNotify[action].notified.length);

        if (this.queue[event].subscribers.length && this.queue[event].subscribers.length !== this.toNotify[action].notified.length) {
            const fn = this.queue[event].subscribers[this.toNotify[action].notified.length];

            debug('execute', this.type, action, event, this.toNotify[action].notified.length);

            return fn(eventData)
                .then(() => {
                    debug('executed', this.type, action, event, this.toNotify[action].notified.length);
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
            // CASE 3: wait for more subscribers
            if (options.tolerance === 0) {
                delete this.toNotify[action];
            } else if ((this.toNotify[action].timeoutInMS / this.queue[event].tolerance) > this.queue[event].tolerance) {
                delete this.toNotify[action];
            } else {
                this.toNotify[action].timeoutInMS = this.toNotify[action].timeoutInMS * 2;

                this.toNotify[action].timeout = setTimeout(() => {
                    this.run(options);
                }, this.toNotify[action].timeoutInMS);
            }
        }
    }

    start(options) {
        // CASE: nobody is in the queue waiting yet
        // e.g. all resources are fetched already, but no subscribers (bootstrap)
        // happens only for high tolerant events
        if (!this.queue.hasOwnProperty(options.event)) {
            this.queue[options.event] = {
                tolerance: options.tolerance,
                subscribers: []
            };
        }

        // CASE: the queue supports killing an event, when it the event only allows one action (event === action)
        if (!options.action) {
            options.action = options.event;

            // CASE: is the action already running, stop it, because e.g. configuration has changed
            if (this.toNotify[options.action]) {
                // CASE: timeout was registered, kill it, this will stop the run function of this action
                if (this.toNotify[options.action].timeout) {
                    clearTimeout(this.toNotify[options.action].timeout);
                    this.toNotify[options.action].timeout = null;
                } else {
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

        this.run(options);
    }
}

module.exports = Queue;
