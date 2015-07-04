// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


var oneHandler = function (request, reply) {

    reply.view('index.jade');
};

var twoHandler = function (request, reply) {

    reply.view('handlebars.html');
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: {
            'html': require('handlebars'),
            'jade': require('jade')
        },
        path: __dirname + '/templates',
        context: {
            title: 'examples/views/mixed | Hapi ' + server.version,
            message: 'Hello World!'
        }
    });

    server.route({ method: 'GET', path: '/one', handler: oneHandler });
    server.route({ method: 'GET', path: '/two', handler: twoHandler });
    server.start();
};


internals.main();
