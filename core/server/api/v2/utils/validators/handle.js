module.exports = function handle(config, options) {
    const proms = {};

    // CASE:  validate options
    const optionsValidator = require('./options');
    proms.validate_options_all = optionsValidator.all(config, options);

    // CASE: validate resources
    const inputValidator = require('./input');

    if (inputValidator.all[config.methodName]) {
        proms[`validate_input_all_${config.methodName}`] = inputValidator.all[config.methodName](config, options);
    }

    if (inputValidator[config.docName].all) {
        proms[`validate_input_${config.docName}_all`] = inputValidator[config.docName].all(config, options);
    }

    if (inputValidator[config.docName][config.methodName]) {
        proms[`validate_input_${config.docName}_${config.methodName}`] = inputValidator[config.docName][config.methodName](config, options);
    }

    return Promise.props(proms);
};
