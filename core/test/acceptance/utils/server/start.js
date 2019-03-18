const fs = require('fs-extra');
const portFinder = require('portfinder');
const childProcess = require('child_process');
const Promise = require('bluebird');
const path = require('path');

module.exports = () => {
    let ghostConfig;
    let insertData = false;
    let dataSet = 'set1';

    const db_path = path.join(__dirname, '..', 'content', 'data', `ghost-test-${dataSet}.db`);

    try {
        fs.unlinkSync(db_path);
    } catch (err) {

    }

    if (process.env['REGENERATE_DB']) {
        fs.removeSync(db_path);
        insertData = true;
    }

    if (!fs.existsSync(db_path)) {
        insertData = true;
    }

    return new Promise((resolve, reject) => {
        return portFinder.getPortPromise()
            .then((port) => {
                ghostConfig = {
                    url: `http://127.0.0.1:${port}`,
                    server__host: '127.0.0.1',
                    server__port: port,
                    database__connection__filename: db_path,
                    paths__contentPath: path.join(__dirname, '..', 'content')
                };

                const child = childProcess.spawn(process.execPath, ['index.js'], {
                    cwd: '.',
                    stdio: [0, 1, 2, 'ipc'],
                    env: Object.assign(ghostConfig, process.env)
                });

                fs.writeFileSync(path.join(__dirname, 'ghost.pid'), child.pid);

                let failed = false;

                child.on('error', (error) => {
                    if (failed) {
                        return;
                    }

                    failed = true;
                    reject(new Error(error.message));
                });

                child.on('message', (message) => {
                    if (message.started) {
                        return resolve({
                            process: child,
                            ghostConfig: ghostConfig
                        });
                    }

                    if (failed) {
                        return;
                    }

                    failed = true;

                    const err = new Error(message.error.message);
                    err.help = message.error.help;
                    err.type = message.error.errorType;
                    err.code = message.error.code;
                    err.statusCode = message.error.statusCode;

                    reject(err);
                });
            });
    }).then((options) => {
        const supertest = require('supertest');
        options.request = supertest.agent(options.ghostConfig.url);
        options.api_version = 'v2';

        return new Promise((resolve) => {
            (function retry() {
                let timeout;

                if (timeout) {
                    clearTimeout(timeout);
                }

                options.request
                    .get('/')
                    .then((res) => {
                        if (res.statusCode === 200) {
                            resolve();
                        }

                        timeout = setTimeout(retry, 50);
                    });
            })();
        }).return(options);
    }).then((options) => {
        const insert = require('./db/insert');
        const fetch = require('./db/fetch');

        if (insertData) {
            return insert(options, {dataSet})
                .then(() => {
                    return fetch();
                })
                .then((data) => {
                    options.data = data;
                    return options;
                });
        }

        return fetch()
            .then((data) => {
                options.data = data;
                return options;
            });
    });
};
