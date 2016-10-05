function DatabaseNotSeeded(message) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 500;
    this.errorType = this.name;
}

DatabaseNotSeeded.prototype = Object.create(Error.prototype);
DatabaseNotSeeded.prototype.name = 'DatabaseNotSeeded';

module.exports = DatabaseNotSeeded;
