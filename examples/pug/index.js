'use strict';

const Path = require('path');

const Hapi = require('@hapi/hapi');
const Pug = require('pug');
const Vision = require('../..');


const internals = {
    templatePath: '.',
    thisYear: new Date().getFullYear()
};


internals.rootHandler = function (request, h) {

    const relativePath = Path.relative(`${__dirname}/../..`, `${__dirname}/templates/${internals.templatePath}`);

    return h.view('index', {
        title: `Running ${relativePath} | hapi ${request.server.version}`,
        message: 'Hello Pug!',
        year: internals.thisYear
    });
};


internals.main = async function () {

    const server = Hapi.Server({ port: 3000 });

    await server.register(Vision);

    server.views({
        engines: { pug: Pug },
        relativeTo: __dirname,
        path: `templates/${internals.templatePath}`,
        compileOptions: {
            // By default Pug uses relative paths (e.g. ../root.pug), when using absolute paths (e.g. include /root.pug), basedir is prepended.
            // https://pugjs.org/language/includes.html
            basedir: Path.join(__dirname, 'examples/pug/templates')
        }
    });

    server.route({ method: 'GET', path: '/', handler: internals.rootHandler });

    await server.start();
    console.log('Server is running at ' + server.info.uri);
};

internals.main();
