'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Ejs = require('ejs');


// Declare internals

const internals = {};

const today = new Date();
internals.thisYear = today.getFullYear();


const rootHandler = (request, h) => {

    return h.view('basic/index', {
        title: 'Running examples/ejs/templates/basic | Hapi ' + request.server.version,
        message: 'Hello Ejs!',
        year: internals.thisYear
    });
};


internals.main = async () => {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: { ejs: Ejs },
        relativeTo: __dirname,
        path: 'templates'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
