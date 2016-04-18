function IncorrectUsage() {
    this.name = 'IncorrectUsage';
    this.stack = new Error().stack;
    this.statusCode = 500;
    this.errorType = this.name;
}

IncorrectUsage.prototype = Object.create(Error.prototype);
module.exports = IncorrectUsage;
