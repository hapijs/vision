// Load modules

var Hapi = require('hapi');
var Mustache = require('mustache');


// Declare internals

var internals = {};


var rootHandler = function (request, reply) {

    reply.view('index', {
        title: 'examples/views/mustache/partials.js | Hapi ' + request.server.version,
        message: 'Index - Hello World!'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    var partials = {};

    server.views({
        engines: {
            html: {
                compile: function (template) {

                    Mustache.parse(template);

                    return function (context) {

                        return Mustache.render(template, context, partials);
                    };
                },

                registerPartial: function (name, src) {

                    partials[name] = src;
                }
            }
        },
        relativeTo: __dirname,
        path: 'templates/withPartials',
        partialsPath: 'templates/withPartials/partials'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
    server.start();
};


internals.main();
