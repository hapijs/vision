'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Path = require('path');
const Handlebars = require('handlebars');


// Declare internals

const internals = {
    templateName: 'withPartials'
};

const today = new Date();
internals.thisYear = today.getFullYear();


const rootHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templateName}`)

    return h.view('index', {
        title: `Running ${relativePath} | Hapi ${request.server.version}`,
        message: 'Hello Handlebars Partials!',
        year: internals.thisYear
    });
};


internals.main = async () => {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: { html: Handlebars },
        relativeTo: __dirname,
        path: 'templates/withPartials',
        partialsPath: 'templates/withPartials/partials'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
