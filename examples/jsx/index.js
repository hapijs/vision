'use strict';

const Path = require('path');

const Hapi = require('@hapi/hapi');
const HapiReactViews = require('hapi-react-views');
const Vision = require('../..');

require('babel-core/register')({
    plugins: ['transform-react-jsx']
});


const internals = {
    templatePath: '.',
    thisYear: new Date().getFullYear()
};


internals.rootHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | hapi ${request.server.version}`,
        message: 'Hello Jsx!',
        year: internals.thisYear
    });
};


internals.aboutHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('about', {
        title: `Running ${relativePath} | Hapi ${request.server.version}`,
        message: 'Jsx About Page',
        year: internals.thisYear
    });
};


internals.main = async function () {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: { jsx: HapiReactViews },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`
    });

    server.route({ method: 'GET', path: '/', handler: internals.rootHandler });
    server.route({ method: 'GET', path: '/about', handler: internals.aboutHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};


internals.main();
