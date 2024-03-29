
## Introduction

**vision** decorates the [server](https://hapi.dev/api#server),
[request](https://hapi.dev/api#request), and
`h` response [toolkit](https://hapi.dev/api#response-toolkit) interfaces with additional
methods for managing view engines that can be used to render templated responses.

**vision** also provides a built-in [handler](https://hapi.dev/api#-serverdecoratetype-property-method-options) implementation for creating templated responses.

Most interaction with **vision** is done via the `h` [response toolkit](https://hapi.dev/api#response-toolkit)
and [server](https://hapi.dev/api#server) interfaces.

## Example

```js
const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const provision = async () => {

    await server.register(Vision);
    await server.start();

    console.log('Server running at:', server.info.uri);
};

provision();
```

The examples in the `examples` folder can be run with `node`.

```
git clone https://github.com/hapijs/vision.git && cd vision
npm install

node examples/handlebars
```

:point_up: That command will run the handlebars basic template.
There are three more examples in there: for helpers, layout, and partials.

Use this hierarchy to know which commands to run, e.g.
```
node examples/mustache
node examples/mustache/partials
node examples/jsx
```

```
- cms // A bare-bones Content Management System with a WYSIWYG editor
- ejs
  - layout
- handlebars
  - helpers
  - layout
  - partials
- jsx // React server-side rendering with `hapi-react-views`
- marko
- mixed // Using multiple render engines (handlebars and pug)
- mustache
  - layout
  - partials
- nunjucks
- pug
- twig
```

**vision** is compatible with most major templating engines out of the box. Engines that don't follow
the normal API pattern can still be used by mapping their API to the [**vision** API](https://hapi.dev/family/vision/). Some of the examples below use the `compile` and `prepare` methods which are part of the API.

### EJS

```js
const Ejs = require('ejs');
const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/ejs/templates/basic | Hapi ' + request.server.version,
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

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Handlebars
```js
const Handlebars = require('handlebars');
const Hapi = require('@hapi/hapi');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/handlebars/templates/basic | hapi ' + request.server.version,
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

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Pug

```js
const Path = require('path');

const Hapi = require('@hapi/hapi');
const Pug = require('pug');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/pug/templates | Hapi ' + request.server.version,
        message: 'Hello Pug!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: { pug: Pug },
        relativeTo: __dirname,
        path: 'examples/pug/templates',
        compileOptions: {
            // By default Pug uses relative paths (e.g. ../root.pug), when using absolute paths (e.g. include /root.pug), basedir is prepended.
            // https://pugjs.org/language/includes.html
            basedir: Path.join(__dirname, 'examples/pug/templates')
        }
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Marko

```js
const Hapi = require('@hapi/hapi');
const Marko = require('marko');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/marko/templates | Hapi ' + request.server.version,
        message: 'Hello Marko!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: {
            marko: {
                compile: (src, options) => {

                    const opts = { preserveWhitespace: true, writeToDisk: false };

                    const template = Marko.load(options.filename, opts);

                    return (context) => {

                        return template.renderToString(context);
                    };
                }
            }
        },
        relativeTo: __dirname,
        path: 'examples/marko/templates'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Mustache

```js
const Hapi = require('@hapi/hapi');
const Mustache = require('mustache');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/mustache/templates/basic | Hapi ' + request.server.version,
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

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Nunjucks

```js
const Hapi = require('@hapi/hapi');
const Nunjucks = require('nunjucks');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/nunjucks/templates | Hapi ' + request.server.version,
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
        path: 'examples/nunjucks/templates'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Twig

```js
const Hapi = require('@hapi/hapi');
const Twig = require('twig');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/twig/templates | Hapi ' + request.server.version,
        message: 'Hello Twig!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: {
            twig: {
                compile: (src, options) => {

                    const template = Twig.twig({ id: options.filename, data: src });

                    return (context) => {

                        return template.render(context);
                    };
                }
            }
        },
        relativeTo: __dirname,
        path: 'examples/twig/templates'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

### Eta

```js
const Hapi = require('@hapi/hapi');
const Eta = require('eta');
const Vision = require('@hapi/vision');

const server = Hapi.Server({ port: 3000 });

const rootHandler = (request, h) => {

    return h.view('index', {
        title: 'examples/eta/templates | Hapi ' + request.server.version,
        message: 'Hello Eta!'
    });
};

const provision = async () => {

    await server.register(Vision);

    server.views({
        engines: {
            eta: {
                compile: (src, options) => {

                    const compiled = Eta.compile(src, options);

                    return (context) => {

                        return Eta.render(compiled, context);
                    };
                }
            }
        },
        /**
         * This is the config object that gets passed to the compile function
         * defined above. This should contain the eta configuration object
         * described at https://eta.js.org/docs/api/configuration Only some of
         * the configuration are relevant when using with hapijs.
         */
        compileOptions: {
            autoEscape: true,
            tags: ['{{', '}}']
        },
        relativeTo: __dirname,
        path: 'examples/eta/templates'
    });

    server.route({ method: 'GET', path: '/', handler: rootHandler });

    await server.start();
    console.log('Server running at:', server.info.uri);
};

provision();
```

## Registration

Vision can be registered multiple times and receives [`views manager options`](#options) as registration options.

Example:
```
internals.provision = async () => {

    await server.register({
        plugin: require('@hapi/vision'),
        options: {
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        }
    })

    const context = {
        title: 'Registration Example',
        message: 'Hello, World'
    };

    return server.render('hello', context);
};

internals.provision();
```

## Views Manager

The Views Manager is configured with [`registration options`](#registration) or by calling [`server.views(options)`](#serverviewsoptions)

## `options`
  - `engines` - required object where each key is a file extension (e.g. 'html', 'hbr'), mapped
    to the npm module used for rendering the templates. Alternatively, the extension can be
    mapped to an object with the following options:
      - `module` - the npm module used for rendering the templates. The module object must
        contain the `compile()` function:
          - `compile()` - the rendering function. The required function signature depends on the
            `compileMode` settings (see below). If `compileMode` is `'sync'`, the signature is
            `compile(template, options)`, the return value is a function with signature
            `function(context, options)` (the compiled sync template), and the method is allowed to throw errors. If
            `compileMode` is `'async'`, the signature is `compile(template, options, next)`
            where `next` has the signature `function(err, compiled)`, `compiled` is a
            function with signature `function(context, options, callback)` (the compiled async template) and `callback` has the
            signature `function(err, rendered)`.
          - `prepare(config, next)` - initializes additional engine state.
            The `config` object is the engine configuration object allowing updates to be made.
            This is useful for engines like Nunjucks that rely on additional state for rendering.
            `next` has the signature `function(err)`.
          - `registerPartial(name, src)` - registers a partial for use during template rendering.
            The `name` is the partial path that templates should use to reference the partial and
            `src` is the uncompiled template string for the partial.
          - `registerHelper(name, helper)` - registers a helper for use during template rendering.
            The `name` is the name that templates should use to reference the helper and `helper`
            is the function that will be invoked when the helper is called.
      - any of the `views` options listed below (except `defaultExtension`) to override the
        defaults for a specific engine.

  - `compileMode` - specify whether the engine `compile()` method is `'sync'` or `'async'`.
    Defaults to `'sync'`.
  - `defaultExtension` - defines the default filename extension to append to template names when
    multiple engines are configured and not explicit extension is provided for a given template.
    No default value.
  - `path` - the root file path, or array of file paths, used to resolve and load the templates identified when calling
    [`h.view()`](#hviewtemplate-context-options).
    Defaults to current working directory.
  - `partialsPath` - the root file path, or array of file paths, where partials are located. Partials are small segments
    of template code that can be nested and reused throughout other templates. Defaults to no
    partials support (empty path).
  - `helpersPath` - the directory path, or array of directory paths, where helpers are located. Helpers are functions used
    within templates to perform transformations and other data manipulations using the template
    context or other inputs. Each valid template file in the helpers directory is loaded and the file name
    is used as the helper name. The files must export a single method with the signature
    `function(context)` and return a string. Sub-folders are not supported and are ignored.
    Defaults to no helpers support (empty path). Note that pug does not support loading helpers
    this way.
  - `relativeTo` - a base path used as prefix for `path` and `partialsPath`. No default.
  - `layout` - if set to `true` or a layout filename, layout support is enabled. A layout is a
    single template file used as the parent template for other view templates in the same engine.
    If `true`, the layout template name must be 'layout.ext' where 'ext' is the engine's
    extension. Otherwise, the provided filename is suffixed with the engine's extension and
    loaded. Disable `layout` when using Jade as it will handle including any layout files
    independently. Defaults to `false`.
  - `layoutPath` - the root file path, or array of file paths, where layout templates are located (using the `relativeTo`
    prefix if present). Defaults to `path`.
  - `layoutKeyword` - the key used by the template engine to denote where primary template
    content should go. Defaults to `'content'`.
  - `encoding` - the text encoding used by the templates when reading the files and outputting
    the result. Defaults to `'utf8'`.
  - `isCached` - if set to `false`, templates will not be cached (thus will be read from file on
    every use). Defaults to `true`.
  - `allowAbsolutePaths` - if set to `true`, allows absolute template paths passed to
    [`h.view()`](#hviewtemplate-context-options).
    Defaults to `false`.
  - `allowInsecureAccess` - if set to `true`, allows template paths passed to
    [`h.view()`](#hviewtemplate-context-options)
    to contain '../'. Defaults to `false`.
  - `compileOptions` - options object passed to the engine's compile function. Defaults to empty
    options `{}`.
  - `runtimeOptions` - options object passed to the returned function from the compile operation.
    Defaults to empty options `{}`.
  - `contentType` - the content type of the engine results. Defaults to `'text/html'`.
  - `context` - a global context used with all templates. The global context option can be either
    an object or a function (can be async or return a promise) that takes the [`request`](https://github.com/hapijs/hapi/blob/master/API.md#request)
    as its only argument and returns a context object. The [`request`](https://github.com/hapijs/hapi/blob/master/API.md#request) object is only provided when using
    the [view handler](#the-view-handler) or [`h.view()`](#hviewtemplate-context-options). When using
    [`server.render()`](#serverrendertemplate-context-options-callback) or
    [`request.render()`](#requestrendertemplate-context-options-callback), the [`request`](https://github.com/hapijs/hapi/blob/master/API.md#request) argument will be `null`. When rendering
    views, the global context will be merged with any context object specified on the handler or using
    [`h.view()`](#hviewtemplate-context-options). When multiple context objects are used, values from the global
    context always have lowest precedence.

## `manager.registerHelper(name, helper)`

Registers a helper, on all configured engines that have a `registerHelper()` method, for use during template rendering. Engines without a `registerHelper()` method will be skipped. The `name` is the name that templates should use to reference the helper and `helper` is the function that will be invoked when the helper is called.

## `manager.render(template, context, options, [callback])`

Renders a template. This is typically not needed and it is usually more convenient to use [`server.render()`](#serverrendertemplate-context-options-callback).

## `manager.getEngine(ext)`

- `ext`- The extension used when registering the engine -- check the keys used when configuring `engines` in [`views manager options`](#options)

## `manager.clearCache(template, [engine])`

- `template` - the template filename and path, relative to the views manager templates path (`path`
  or `relativeTo`).
- `engine` - the engine returned by `manager.getEngine(ext)`

## Server

### `server.views(options)`

- Initializes a plugin's view manager by receiving [`manager options`](#options)
- Returns the newly created [view manager](#views-manager) for the plugin that called it.

### `server.render(template, context, [options], [callback])`

Uses the server views manager to render a template where:
- `template` - the template filename and path, relative to the views manager templates path (`path`
  or `relativeTo`).
- `context` - optional object used by the template to render context-specific result. Defaults to
  no context (`{}`).
- `options` - optional object used to override the views manager configuration.
- callback - the callback function with signature function (err, rendered, config) where:
    - `err` - the rendering error if any.
    - `rendered` - the result view string.
    - `config` - the configuration used to render the template.

If no `callback` is provided, a `Promise` object is returned. The returned promise is resolved with only the
rendered content and not the configuration object.

```js
const Hapi = require('@hapi/hapi');
const server = Hapi.Server({ port: 3000 });

const internals = {};

internals.provision = async () => {

    await server.register(require('@hapi/vision'));

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/templates'
    });

    const context = {
        title: 'Views Example',
        message: 'Hello, World'
    };

    return server.render('hello', context);
};

internals.provision();
```

### `server.getViewsManager()`
Returns the closest [Views manager](#views-manager) to your `realm` (either on your realm or inherited from an ancestor realm)

## Requests

### `request.render(template, context, [options], [callback])`

[`request.render()`](#requestrendertemplate-context-options-callback) works the same way as [`server.render()`](#serverrendertemplate-context-options-callback)
but is for use inside of request handlers. [`server.render()`](#serverrendertemplate-context-options-callback)
does not work inside request handlers when called via `request.server.render()` if the view manager was created
by a plugin. This is because the `request.server` object does not have access to the plugin realm where the
view manager was configured. [`request.render()`](#requestrendertemplate-context-options-callback) gets its realm from the route that the request was bound to.

Note that this will not work in `onRequest` extensions added by the plugin because the route isn't yet set at
this point in the request lifecycle and the [`request.render()`](#requestrendertemplate-context-options-callback) method will produce the same limited results
[`server.render()`](#serverrendertemplate-context-options-callback) can. When using the `onRequest` extension, use the [`h` response toolkit interface](#response-toolkit-interface) instead.

```js
const Hapi = require('@hapi/hapi');
const server = Hapi.Server({ port: 3000 });

const internals = {};

internals.provision = async () => {

    await server.register(require('@hapi/vision'));

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/templates'
    });

    server.route({
        method: 'GET',
        path: '/view',
        handler: function (request, h) {

            return request.render('test', { message: 'hello' });
        }
    });
};

internals.provision();
```

### `request.getViewsManager()`
Returns the closest [Views manager](#views-manager) to your `realm` (either on your realm or inherited from an ancestor realm)

## The view handler

The `view` [handler](https://github.com/hapijs/hapi/blob/master/API.md#serverdecoratetype-property-method-options) can be used with routes registered in the same realm as the view manager. The
handler takes an `options` parameter that can be either a string or an object. When the `options`
parameter is a string, it should be the filename and path of the template relative to the templates
path configured via the views manager. When the `options` parameter is an object, it may have the
following keys:

- `template` - the template filename and path, relative to the templates path configured via the
  server views manager.
- `context` - optional object used by the template to render context-specific result. Defaults to
  no context `{}`.
- `options` - optional object used to override the server's views manager configuration for this
  response. Cannot override `isCached`, `partialsPath`, or `helpersPath` which are only loaded at
  initialization.

The rendering `context` contains the `params`, `payload`, `query`, and `pre` values from the
[request](https://github.com/hapijs/hapi/blob/master/API.md#request) by default (these
can be overriden by values explicitly set via the `options`).

```js
const Hapi = require('@hapi/hapi');
const server = Hapi.Server({ port: 3000 });

const internals = {};

internals.provision = async () => {

    await server.register(require('@hapi/vision'));

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/templates'
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: {
            view: {
                template: 'hello',
                context: {
                    title: 'Views Example',
                    message: 'Hello, World'
                }
            }
        }
    });
};

internals.provision();
```

## Response Toolkit Interface

### `h.view(template, [context, [options]])`

Uses the response [toolkit](https://github.com/hapijs/hapi/blob/master/API.md#response-toolkit) interface by means of returning control over to the router with a templatized view
response where:

- `template` - the template filename and path, relative to the templates path configured via the
  server views manager.
- `context` - optional object used by the template to render context-specific result. Defaults to
  no context `{}`.
- `options` - optional object used to override the server's views manager configuration for this
  response. Cannot override `isCached`, `partialsPath`, or `helpersPath` which are only loaded at
  initialization.

Returns a [response object](https://github.com/hapijs/hapi/blob/master/API.md#response-object).
The generated response will have the `variety` property set to `view`.

The same [lifecycle workflow](https://github.com/hapijs/hapi/blob/master/API.md#lifecycle-workflow) applies.

```js
const Hapi = require('@hapi/hapi');
const server = Hapi.Server({ port: 3000 });

const internals = {};

internals.provision = async () => {

    await server.register(require('@hapi/vision'));

    server.views({
        engines: { html: require('handlebars') },
        path: __dirname + '/templates'
    });

    const rootHandler = function (request, h) {

        const context = {
            title: 'Views Example',
            message: 'Hello, World'
        };

        return h.view('hello', context);
    };

    server.route({ method: 'GET', path: '/', handler: rootHandler });
};

internals.provision();
```

### `h.getViewsManager()`
Returns the closest [Views manager](#views-manager) to your `realm` (either on your realm or inherited from an ancestor realm)


#### Ex template used in these docs

**templates/hello.html**

```html
<html>
    <head>
        <title>{{title}}</title>
    </head>
    <body>
        <div>
            <h1>{{message}}</h1>
        </div>
    </body>
</html>
```


## Typescript

If you'd like to type out the way Vision is used, you can do so with the following interfaces:

```typescript
declare module '@hapi/vision' {

    // User defined
    type CustomTemplates = (
        'test' | 'hello' | 'temp1'
    );

    // User defined
    type CustomLayout = (
        'auth' | 'unauth' | 'admin'
    )

    interface ViewTypes {
        template: CustomTemplates
        layout: CustomLayout
    }
}
```

You should now get typings on your response handler (only), and anywhere where layouts is an option

```ts

const route = {
    ...
    handler: {
        view: {
            template: 'test', // should autocomplete
            options: { layout: 'auth' } // should autocomplete
        }
    }
}
```

If you'd like to also type check the decorated handlers, you can augment the following interfaces:

```typescript
declare module '@hapi/vision' {

    // User defined
    type CustomTemplates = (
        'test' | 'hello' | 'temp1'
    );

    // User defined
    type CustomLayout = (
        'auth' | 'unauth' | 'admin'
    )

    // server.render(...)
    interface RenderMethod {
        (template: CustomTemplates, context?: string): Promise<string>
    }

    // { handler: (req) => req.render(...) }
    interface RequestRenderMethod {
        (template: CustomTemplates, context?: string): Promise<string>
    }

    // { handler: (req, h) => h.view(...) }
    interface ToolkitRenderMethod {
        (template: CustomTemplates, context?: string): ResponseObject
    }

}
```

This is useful for when you may want to make strict checks against template / context combinations:

```typescript

    // { handler: (req, h) => h.view(...) }
    interface ToolkitRenderMethod {
        (template: 'test', context: { apples: 5 }): ResponseObject
        (template: 'hello', context: { oranges: true }): ResponseObject
        (template: 'temp1', context: { bananas: 'green' }): ResponseObject
    }
```
