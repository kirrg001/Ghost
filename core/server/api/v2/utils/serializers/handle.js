module.exports.input = (config, options) => {
    const proms = {};

    // CASE: shared options serializer
    const shared = require('../../../shared');

    proms.shared_serialize_options_all = shared.serializers.input.options.all(config, options);

    // CASE: local options serializer
    const optionsSerializer = require('./input/options');
    proms.serialize_options_all = optionsSerializer.all(config, options);

    // CASE: local input serializers for resources/data
    const inputValidator = require('./input');

    if (inputValidator.all[config.methodName]) {
        proms[`serialize_input_all_${config.methodName}`] = inputValidator.all[config.methodName](config, options);
    }

    if (inputValidator[config.docName].all) {
        proms[`serialize_input_${config.docName}_all`] = inputValidator[config.docName].all(config, options);
    }

    if (inputValidator[config.docName][config.methodName]) {
        proms[`serialize_input_${config.docName}_${config.methodName}`] = inputValidator[config.docName][config.methodName](config, options);
    }

    return Promise.props(proms);
};

module.exports.output = (config, options) => {
    const proms = {};

    // CASE:  serialize options
    const optionsSerializer = require('./output/options');
    proms.serialize_options_all = optionsSerializer.all(config, options);

    // CASE: serialize resources
    const outputValidator = require('./output');

    if (outputValidator.all[config.methodName]) {
        proms[`serialize_output_all_${config.methodName}`] = outputValidator.all[config.methodName](config, options);
    }

    if (outputValidator[config.docName].all) {
        proms[`serialize_output_${config.docName}_all`] = outputValidator[config.docName].all(config, options);
    }

    if (outputValidator[config.docName][config.methodName]) {
        proms[`serialize_output_${config.docName}_${config.methodName}`] = outputValidator[config.docName][config.methodName](config, options);
    }

    return Promise.props(proms);
};
