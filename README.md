# vision

Templates rendering plugin support for hapi.js.

[![Build Status](https://travis-ci.org/hapijs/vision.svg)](http://travis-ci.org/hapijs/vision) [![Coverage Status](https://coveralls.io/repos/github/hapijs/vision/badge.svg?branch=master)](https://coveralls.io/github/hapijs/vision?branch=master)

Lead Maintainer - [William Woodruff](https://github.com/wswoodruff)

**vision** decorates the [server](https://github.com/hapijs/hapi/blob/master/API.md#server),
[request](https://github.com/hapijs/hapi/blob/master/API.md#request-object), and
`h` response [toolkit](https://github.com/hapijs/hapi/blob/master/API.md#response-toolkit) interfaces with additional
methods for managing view engines that can be used to render templated responses.

**vision** also provides a built-in [handler](https://github.com/hapijs/hapi/blob/master/API.md#-serverdecoratetype-property-method-options) implementation for creating templated responses.

### Usage
> See also the [API Reference](./API.md)

```js
const Hapi = require('hapi');
const Vision = require('vision');

const server = Hapi.Server({ port: 3000 });

const provision = async () => {

    await server.register(Vision);

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```
**NOTE:** Vision is included with and loaded by default in Hapi < 9.0.

- [Examples](#examples)
    - [EJS](#ejs)
    - [Handlebars](#handlebars)
    - [Pug](#pug)
    - [Mustache](#mustache)
    - [Nunjucks](#nunjucks)

## Examples

**vision** is compatible with most major templating engines out of the box. Engines that don't follow
the normal API pattern can still be used by mapping their API to the **vision** API. Working code for
the following examples can be found in the [examples directory](./examples).

### EJS

```js
const Hapi = require('hapi');
const Vision = require('vision');
const Ejs = require('ejs');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/ejs/templates/basic/index.js | Hapi ' + request.server.version,
        message: 'Hello Ejs!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: { ejs: Ejs },
        relativeTo: __dirname,
        path: 'examples/ejs/templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
};

provision();
```

### Handlebars
```js
const Hapi = require('hapi');
const Vision = require('vision');
const Handlebars = require('handlebars');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/handlebars/templates/basic/index.js | Hapi ' + request.server.version,
        message: 'Hello Handlebars!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: { html: Handlebars },
        relativeTo: __dirname,
        path: 'examples/handlebars/templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
};

provision();
```

### Pug

```js
const Hapi = require('hapi');
const Vision = require('vision');
const Pug = require('pug');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/pug/templates/basic/index.js | Hapi ' + request.server.version,
        message: 'Hello Pug!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: { pug: Pug },
        relativeTo: __dirname,
        path: 'examples/pug/templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
};

provision();
```

### Mustache

```js
const Hapi = require('hapi');
const Vision = require('vision');
const Mustache = require('mustache');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/mustache/templates/basic/index.js | Hapi ' + request.server.version,
        message: 'Hello Mustache!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: {
            html: {
                compile: (template) => {

                    Mustache.parse(template);

                    return (context) => {

                        return Mustache.render(template, context);
                    };
                }
            }
        },
        relativeTo: __dirname,
        path: 'examples/mustache/templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
};

provision();
```

### Nunjucks

```js
const Hapi = require('hapi');
const Vision = require('vision');
const Nunjucks = require('nunjucks');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/nunjucks/templates/basic/index.js | Hapi ' + request.server.version,
        message: 'Hello Nunjucks!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: {
            html: {
                compile: (src, options) => {

                    const template = Nunjucks.compile(src, options.environment);

                    return (context) => {

                        return template.render(context);
                    };
                },

                prepare: (options, next) => {

                    options.compileOptions.environment = Nunjucks.configure(options.path, { watch : false });

                    return next();
                }
            }
        },
        relativeTo: __dirname,
        path: 'examples/nunjucks/templates/basic'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });
};

provision();
```
