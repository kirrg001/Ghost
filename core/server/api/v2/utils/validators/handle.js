module.exports = function handle(config, options) {
    const proms = {};

    // CASE: shared options serializer
    const shared = require('../../../shared');

    proms.shared_validate_options_all = shared.validators.input.options.all(config, options);

    // CASE: validate options
    const optionsValidator = require('./options');
    proms.validate_options_all = optionsValidator.all(config, options);

    // CASE: validate resources
    const inputValidator = require('./input');

    if (inputValidator.all[config.method]) {
        proms[`validate_input_all_${config.method}`] = inputValidator.all[config.method](config, options);
    }

    if (inputValidator[config.docName].all) {
        proms[`validate_input_${config.docName}_all`] = inputValidator[config.docName].all(config, options);
    }

    if (inputValidator[config.docName][config.method]) {
        proms[`validate_input_${config.docName}_${config.method}`] = inputValidator[config.docName][config.method](config, options);
    }

    return Promise.props(proms);
};
