'use strict';
// Load modules

const Hapi = require('hapi');
const Vision = require('../..');
const Path = require('path');
const Handlebars = require('handlebars');
const Pug = require('pug');

// Declare internals

const internals = {
    templatePath: '.'
};

const today = new Date();
internals.thisYear = today.getFullYear();


const indexHandler = (request, h) => {

    return h.view('index.html');
};

const oneHandler = (request, h) => {

    return h.view('index.pug');
};

const twoHandler = (request, h) => {

    return h.view('handlebars.html');
};


internals.main = async () => {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    server.views({
        engines: {
            'html': Handlebars,
            'pug': Pug
        },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`,
        context: {
            title: `Running ${relativePath} | Hapi ${server.version}`,
            message: 'Hello Mixed Engines!',
            year: internals.thisYear
        }
    });

    server.route({ method: 'GET', path: '/', handler: indexHandler });
    server.route({ method: 'GET', path: '/one', handler: oneHandler });
    server.route({ method: 'GET', path: '/two', handler: twoHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
