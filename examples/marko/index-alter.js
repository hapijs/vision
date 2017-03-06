'use strict';
// Load modules

const Marko = require('marko');
const Hapi = require('hapi');
const Vision = require('../..');


// Declare internals

const internals = {};


const handler = function (request, reply) {

    reply.view('index', {
        title: 'examples/views/marko/basic.js | Hapi ' + request.server.version,
        message: 'Hello World!'
    });
};


internals.main = function () {

    const server = new Hapi.Server();
    server.connection({ port: 8000 });
    server.register(Vision, (err) => {

        if (err) {
            throw err;
        }

        server.views({
            engines: {
                marko: {
                    compileMode: 'sync',
                    module: {
                        compile: function (string, options) {

                            const template = Marko.load(require.resolve(options.filename), { preserveWhitespace: true, writeToDisk: false });

                            return function (context) {

                                return template.renderToString(context);
                            };
                        }
                    }
                }
            },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler });
        server.start((err) => {

            if (err) {
                throw err;
            }

            console.log('Server is listening at ' + server.info.uri);
        });
    });
};


internals.main();
