module.exports.input = (config, options) => {
    const proms = {};

    // CASE: local options serializer
    const optionsSerializer = require('./input/options');
    proms.serialize_options_all = optionsSerializer.all(config, options);

    // CASE: local input serializers for resources/data
    const inputValidator = require('./input');

    if (inputValidator.all[config.method]) {
        proms[`serialize_input_all_${config.method}`] = inputValidator.all[config.method](config, options);
    }

    if (inputValidator[config.docName].all) {
        proms[`serialize_input_${config.docName}_all`] = inputValidator[config.docName].all(config, options);
    }

    if (inputValidator[config.docName][config.method]) {
        proms[`serialize_input_${config.docName}_${config.method}`] = inputValidator[config.docName][config.method](config, options);
    }

    return Promise.props(proms);
};

module.exports.output = (models, config, options) => {
    const proms = {};

    // CASE: local oztput serializers for resources/ata
    const outputValidator = require('./output');

    if (outputValidator[config.docName].all) {
        proms[`serialize_output_${config.docName}_all`] = outputValidator[config.docName].all(models, config, options);
    }

    if (outputValidator[config.docName][config.method]) {
        proms[`serialize_output_${config.docName}_${config.method}`] = outputValidator[config.docName][config.method](models, config, options);
    }

    return Promise.props(proms);
};
