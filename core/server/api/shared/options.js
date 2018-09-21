class Options {
    constructor(obj) {
        Object.assign(this, obj);
        // Object.freeze(this.apiOptions);
    }
}

module.exports = Options;
