var TimezonedDate = require('timezoned-date'),
    lodash = require('lodash'),
    clonedeep = require('lodash.clonedeep'),
    toString = require('lodash.tostring');

// ######## LODASH
// timezoned-date does not work with lodash.cloneDeep 3.x
lodash.cloneDeep = clonedeep;

// @TODO: reason?
lodash.toString = toString;

// ######## NATIVE JS DATE
// remember original timezone offset of server
global.ServerTimezoneOffset = new Date().getTimezoneOffset();

// timezoned-date is able to force UTC at process level
// we only use it when local system is NOT UTC
if (ServerTimezoneOffset !== 0) {
    global.Date = TimezonedDate.makeConstructor(0);
}
