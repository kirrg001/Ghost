function SchedulingBase() {
    Object.defineProperty(this, 'requiredFns', {
        value: ['schedule', 'unschedule', 'reschedule', 'bootstrap'],
        writable: false
    });
}

module.exports = SchedulingBase;
