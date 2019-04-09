'use strict';

const Path = require('path');

const Handlebars = require('handlebars');
const Hapi = require('@hapi/hapi');
const Vision = require('../..');
const Pug = require('pug');


const internals = {
    templatePath: '.',
    thisYear: new Date().getFullYear()
};


internals.indexHandler = function (request, h) {

    return h.view('index.html');
};


internals.oneHandler = function (request, h) {

    return h.view('index.pug');
};


internals.twoHandler = function (request, h) {

    return h.view('handlebars.html');
};


internals.main = async function () {

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
            title: `Running ${relativePath} | hapi ${server.version}`,
            message: 'Hello Mixed Engines!',
            year: internals.thisYear
        }
    });

    server.route({ method: 'GET', path: '/', handler: internals.indexHandler });
    server.route({ method: 'GET', path: '/one', handler: internals.oneHandler });
    server.route({ method: 'GET', path: '/two', handler: internals.twoHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};

internals.main();
