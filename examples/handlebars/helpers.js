// Load modules

var Hapi = require('hapi');


// Declare internals

var internals = {};


var handler = function (request, reply) {

    reply.view('index', {
        title: 'examples/views/handlebars/helpers.js | Hapi ' + request.server.version,
        message: 'Hello World!'
    });
};


internals.main = function () {

    var server = new Hapi.Server();
    server.connection({ port: 8000 });

    server.views({
        engines: { html: require('handlebars') },
        relativeTo: __dirname,
        path: 'templates/withHelpers',
        helpersPath: 'templates/withHelpers/helpers'
    });

    server.route({ method: 'GET', path: '/', handler: handler });
    server.start();
};


internals.main();
