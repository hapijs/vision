'use strict';
// Load modules

require('marko/node-require').install({
  compilerOptions: {
    preserveWhitespace: true,
    writeToDisk: false
  }
});
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
                    compileMode: 'async',
                    module: {
                        compile: function (string, options, callback) {

                            const template = require(options.filename);

                            return callback(null, (context, opt, next) => {

                                return template.renderToString(context, next);
                            });
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
