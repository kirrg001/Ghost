function DatabaseNotPopulated(message, context) {
    this.message = message;
    this.stack = new Error().stack;
    this.statusCode = 500;
    this.errorType = this.name;
    this.context = context;
}

DatabaseNotPopulated.prototype = Object.create(Error.prototype);
DatabaseNotPopulated.prototype.name = 'DatabaseNotPopulated';

module.exports = DatabaseNotPopulated;
