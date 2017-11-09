'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Handlebars = require('handlebars');


// Declare internals

const internals = {};

const today = new Date();
internals.thisYear = today.getFullYear();


const handler = (request, h) => {

    return h.view('index', {
        title: 'Running examples/handlebars/templates/basic | Hapi ' + request.server.version,
        message: 'Hello Handlebars!',
        year: internals.thisYear
    });
};


internals.main = async () => {

    const server = new Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: { html: Handlebars },
        relativeTo: __dirname,
        path: 'templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
