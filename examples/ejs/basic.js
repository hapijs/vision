// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


var rootHandler = function (request, reply) {

    reply.view('index', {
        title: 'examples/views/ejs/basic.js | Hapi ' + request.server.version,
        message: 'Index - Hello World!'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: { ejs: require('ejs') },
        relativeTo: __dirname,
        path: 'templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
    server.start();
};


internals.main();
