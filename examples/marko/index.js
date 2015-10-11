// Load modules

var Hapi = require('hapi');
var Marko = require('marko');
var Vision = require('../..');


// Declare internals

var internals = {};


var handler = function (request, reply) {

    reply.view('index', {
        title: 'examples/views/marko/basic.js | Hapi ' + request.server.version,
        message: 'Hello World!'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });
    server.register(Vision, function (err) {

        if (err) {
            throw err;
        }

        server.views({
            engines: {
                html: {
                    compile: function (src, options) {

                        var template = Marko.load(options.filename, src);

                        return function (context) {

                            return template.renderSync(context);
                        };
                    }
                }
            },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: handler });
        server.start(function (err) {

            if (err) {
                throw err;
            }

            console.log('Server is listening at ' + server.info.uri);
        });
    });
};


internals.main();
