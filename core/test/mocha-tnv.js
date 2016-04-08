var fs = require('fs'),
    path = require('path');

var tnvConfig = {
    "processes": 8,
    "testFilePostfix": "spec.js",
    "applicationPath": path.normalize(__dirname + '/../../'),
    "testFolderPath": path.normalize(__dirname + '/../../core/test'),
    "utilsPath": path.normalize(__dirname + '/../../core/test/utils')
};

fs.writeFileSync(__dirname + '/mocha-tnv.json', JSON.stringify(tnvConfig));
