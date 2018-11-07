'use strict';

const Fs = require('fs');
const Path = require('path');

const Boom = require('boom');
const Hoek = require('hoek');
const Joi = require('joi');
const Items = require('items');

const Schemas = require('./schemas');

// Additional helper modules required in constructor


const internals = {};


internals.defaults = {
    // defaultExtension: '',
    // path: '',
    // relativeTo: '',
    compileOptions: {},
    runtimeOptions: {},
    layout: false,
    layoutKeyword: 'content',
    encoding: 'utf8',
    isCached: true,
    allowAbsolutePaths: false,
    allowInsecureAccess: false,
    // partialsPath: '',
    contentType: 'text/html',
    compileMode: 'sync',
    context: null
};


module.exports = class Manager {

    constructor(options) {

        Joi.assert(options, Schemas.manager);

        // Save non-defaults values

        const engines = options.engines;
        const defaultExtension = options.defaultExtension;

        // Clone options

        const defaults = Hoek.applyToDefaultsWithShallow(internals.defaults, options, ['engines', 'context']);
        delete defaults.engines;
        delete defaults.defaultExtension;

        // Prepare manager state

        const extensions = Object.keys(engines);
        Hoek.assert(extensions.length, 'Views manager requires at least one registered extension handler');

        // Private class props

        this._context = defaults.context;
        this._engines = {};
        this._defaultExtension = defaultExtension || (extensions.length === 1 ? extensions[0] : '');

        // Load engines

        extensions.forEach((extension) => {

            const config = engines[extension];
            const engine = {};

            if (config.compile &&
                typeof config.compile === 'function') {

                engine.module = config;
                engine.config = defaults;
            }
            else {
                Joi.assert(config, Schemas.view);

                engine.module = config.module;
                engine.config = Hoek.applyToDefaultsWithShallow(defaults, config, ['module']);
            }

            engine.suffix = '.' + extension;
            engine.compileFunc = engine.module.compile;

            if (engine.config.compileMode === 'sync') {
                engine.compileFunc = function (str, opt, next) {

                    let compiled = null;
                    try {
                        compiled = engine.module.compile(str, opt);
                    }
                    catch (err) {
                        return next(err);
                    }

                    const renderer = function (context, runtimeOptions, renderNext) {

                        let rendered = null;
                        try {
                            rendered = compiled(context, runtimeOptions);
                        }
                        catch (err) {
                            return renderNext(err);
                        }

                        return renderNext(null, rendered);
                    };

                    return next(null, renderer);
                };
            }

            if (engine.config.isCached) {
                engine.cache = {};
            }

            // When a prepare function is provided, state needs to be initialized before trying to compile and render
            engine.ready = !(engine.module.prepare && typeof engine.module.prepare === 'function');

            // Load partials and helpers

            this._loadPartials(engine);
            this._loadHelpers(engine);

            // Set engine

            this._engines[extension] = engine;
        });
    }


    _loadPartials(engine) {

        if (!engine.config.partialsPath ||
            !engine.module.registerPartial ||
            typeof engine.module.registerPartial !== 'function') {

            return;
        }

        const load = function () {

            const partialsPaths = [].concat(engine.config.partialsPath);

            partialsPaths.forEach((partialsPath) => {

                const path = internals.path(engine.config.relativeTo, partialsPath);
                const files = traverse(path);
                files.forEach((file) => {

                    const offset = path.slice(-1) === Path.sep ? 0 : 1;
                    const name = file.slice(path.length + offset, -engine.suffix.length).replace(/\\/g, '/');
                    const src = Fs.readFileSync(file).toString(engine.config.encoding);
                    engine.module.registerPartial(name, src);
                });
            });
        };

        const traverse = function (path) {

            let files = [];

            Fs.readdirSync(path).forEach((file) => {

                file = Path.join(path, file);
                const stat = Fs.statSync(file);
                if (stat.isDirectory()) {
                    files = files.concat(traverse(file));
                    return;
                }

                if (Path.basename(file)[0] !== '.' &&
                    Path.extname(file) === engine.suffix) {

                    files.push(file);
                }
            });

            return files;
        };

        load();
    }


    _loadHelpers(engine) {

        if (!engine.config.helpersPath ||
            !engine.module.registerHelper ||
            typeof engine.module.registerHelper !== 'function') {

            return;
        }

        const helpersPaths = [].concat(engine.config.helpersPath);

        helpersPaths.forEach((helpersPath) => {

            let path = internals.path(engine.config.relativeTo, helpersPath);
            if (!Path.isAbsolute(path)) {
                path = Path.join(process.cwd(), path);
            }

            Fs.readdirSync(path).forEach((file) => {

                file = Path.join(path, file);
                const stat = Fs.statSync(file);
                if (stat.isDirectory() ||
                    Path.basename(file).startsWith('.') ||
                    !Object.keys(require.extensions).includes(Path.extname(file))) {
                    return;
                }

                try {
                    if (!engine.config.isCached) {
                        internals.bustRequireCache(file);
                    }

                    const required = require(file);

                    const offset = path.slice(-1) === Path.sep ? 0 : 1;
                    const name = file.slice(path.length + offset, -Path.extname(file).length);
                    const helper = required[name] || required.default || required;
                    if (typeof helper === 'function') {
                        engine.module.registerHelper(name, helper);
                    }
                }
                catch (err) {
                    console.warn('WARNING: vision failed to load helper \'%s\': %s', file, err.message);
                }
            });
        });
    }


    _prepare(template, options, callback) {

        options = options || {};

        const fileExtension = Path.extname(template).slice(1);
        const extension = fileExtension || this._defaultExtension;
        if (!extension) {
            return callback(Boom.badImplementation('Unknown extension and no defaultExtension configured for view template: ' + template));
        }

        const engine = this._engines[extension];
        if (!engine) {
            return callback(Boom.badImplementation('No view engine found for file: ' + template));
        }

        template = template + (fileExtension ? '' : engine.suffix);

        // Engine is ready to render

        if (engine.ready) {
            return this._prepareTemplates(template, engine, options, callback);
        }

        // Engine needs initialization

        return this._prepareEngine(engine, (err) => {

            if (err) {
                return callback(err);
            }

            return this._prepareTemplates(template, engine, options, callback);
        });
    }


    _prepareEngine(engine, next) {

        // _prepareEngine can only be invoked when the prepare function is defined

        try {
            return engine.module.prepare(engine.config, (err) => {

                if (err) {
                    return next(err);
                }

                engine.ready = true;
                return next();
            });
        }
        catch (err) {
            return next(err);
        }
    }


    _prepareTemplates(template, engine, options, callback) {

        const compiled = {
            settings: Hoek.applyToDefaults(engine.config, options)
        };

        this._path(template, compiled.settings, false, (err, templatePath) => {

            if (err) {
                return callback(err);
            }

            if (!engine.config.isCached) {
                this._loadPartials(engine);
                this._loadHelpers(engine);
            }

            this._compile(templatePath, engine, compiled.settings, (err, compiledTemplate) => {

                if (err) {
                    return callback(err);
                }

                compiled.template = compiledTemplate;

                // No layout

                if (!compiled.settings.layout) {
                    return callback(null, compiled);
                }

                // With layout

                this._path((compiled.settings.layout === true ? 'layout' : compiled.settings.layout) + engine.suffix, compiled.settings, true, (err, layoutPath) => {

                    if (err) {
                        return callback(err);
                    }

                    this._compile(layoutPath, engine, compiled.settings, (err, layout) => {

                        if (err) {
                            return callback(err);
                        }

                        compiled.layout = layout;
                        return callback(null, compiled);
                    });
                });
            });
        });
    }


    _path(template, settings, isLayout, next) {

        // Validate path

        const isAbsolutePath = Path.isAbsolute(template);
        const isInsecurePath = template.match(/\.\.\//g);

        if (!settings.allowAbsolutePaths &&
            isAbsolutePath) {

            return next(Boom.badImplementation('Absolute paths are not allowed in views'));
        }

        if (!settings.allowInsecureAccess &&
            isInsecurePath) {

            return next(Boom.badImplementation('View paths cannot lookup templates outside root path (path includes one or more \'../\')'));
        }

        // Resolve path and extension

        let paths;
        if (isAbsolutePath) {
            paths = [template];
        }
        else {
            paths = [].concat((isLayout && settings.layoutPath) || settings.path);

            for (let i = 0; i < paths.length; ++i) {
                paths[i] = internals.path(settings.relativeTo, paths[i], template);
            }
        }

        Items.serial(paths, (path, nextFile) => {

            Fs.stat(path, (err, stats) => {

                if (!err &&
                    stats.isFile()) {

                    return next(null, path);
                }

                return nextFile();
            });
        }, () => {

            return next(Boom.badImplementation('View file not found: `' + template + '`. Locations searched: [' + paths.join(',') + ']'));
        });
    }


    _compile(template, engine, settings, callback) {

        if (engine.cache &&
            engine.cache[template]) {

            return callback(null, engine.cache[template]);
        }

        settings.compileOptions.filename = template;            // Pass the template to Pug via this copy of compileOptions

        // Read file

        Fs.readFile(template, { encoding: settings.encoding }, (err, data) => {

            if (err) {
                return callback(Boom.badImplementation('Failed to read view file: ' + template));
            }

            engine.compileFunc(data, settings.compileOptions, (err, compiled) => {

                if (err) {
                    return callback(Boom.boomify(err));
                }

                if (engine.cache) {
                    engine.cache[template] = compiled;
                }

                return callback(null, compiled);
            });
        });
    }


    _render(compiled, context, request, callback) {

        if (this._context) {
            let base = typeof this._context === 'function' ? this._context(request) : this._context;
            if (context) {
                base = Object.assign({}, base);             // Shallow cloned
                const keys = Object.keys(context);
                for (let i = 0; i < keys.length; ++i) {
                    const key = keys[i];
                    base[key] = context[key];
                }
            }

            context = base;
        }

        context = context || {};

        if (compiled.layout &&
            context.hasOwnProperty(compiled.settings.layoutKeyword)) {

            return callback(Boom.badImplementation('settings.layoutKeyword conflict', { context, keyword: compiled.settings.layoutKeyword }));
        }

        compiled.template(context, compiled.settings.runtimeOptions, (err, renderedContent) => {

            if (err) {
                return callback(Boom.badImplementation(err.message, err));
            }

            // No layout

            if (!compiled.layout) {
                return callback(null, renderedContent);
            }

            // With layout

            context[compiled.settings.layoutKeyword] = renderedContent;
            compiled.layout(context, compiled.settings.runtimeOptions, (err, renderedWithLayout) => {

                delete context[compiled.settings.layoutKeyword];

                if (err) {
                    return callback(Boom.badImplementation(err.message, err));
                }

                return callback(null, renderedWithLayout);
            });
        });
    }


    _response(template, context, options, request) {

        Joi.assert(options, Schemas.viewOverride);

        const source = { manager: this, template, context, options };
        return request.generateResponse(source, { variety: 'view', marshal: internals.marshal, prepare: internals.prepare });
    }


    getEngine(ext) {

        let engine;

        if (!ext) {
            // The _defaultExtension is set if there is a single extension in _engines
            if (!this._defaultExtension) {
                throw new Error('Must provide an extension or set defaultExtension in manager options');
            }

            engine = this._engines[this._defaultExtension];
        }
        else {
            engine = this._engines[ext];
            if (!engine) {
                throw new Error(`Extension "${ext}" not found on manager`);
            }
        }

        return engine;
    }


    clearCache(template, engine) {

        if (!template) {
            throw new Error('template is required');
        }

        // The _defaultExtension is set if there is a single extension in _engines
        if (!engine && !Path.extname(template) && !this._defaultExtension) {
            throw new Error('Must pass the engine, have a single engine on the manager, have an extension on the template name, or set defaultExtension on manager options');
        }

        const extension = Path.extname(template) ? Path.extname(template).slice(1) : this._defaultExtension;
        engine = engine || this.getEngine(extension);

        const templateWithSuffix = Path.extname(template) ? template : (template + engine.suffix);
        const templateFullPath = internals.path(engine.config.relativeTo, engine.config.path, templateWithSuffix);

        if (!engine.cache[templateFullPath]) {
            console.warn(`Template cache not found for path ${templateFullPath}, cache not cleared`);
        }

        delete engine.cache[templateFullPath];
    }


    registerHelper(name, helper) {

        Object.keys(this._engines).forEach((extension) => {

            const engine = this._engines[extension];

            if (typeof engine.module.registerHelper === 'function') {
                engine.module.registerHelper(name, helper);
            }
        });
    }


    render(filename, context, options, request) {

        return new Promise((resolve, reject) => {

            this._prepare(filename, options, (err, compiled) => {

                if (err) {
                    return reject(err);
                }

                this._render(compiled, context, request, (err, rendered) => {

                    if (err) {
                        return reject(err);
                    }

                    return resolve(rendered);
                });
            });
        });
    }
};


internals.path = function (base, path, file) {

    if (path &&
        Path.isAbsolute(path)) {

        return Path.join(path, file || '');
    }

    return Path.join(base || '', path || '', file || '');
};


internals.marshal = function (response) {

    const manager = response.source.manager;

    return new Promise((resolve, reject) => {

        manager._render(response.source.compiled, response.source.context, response.request, (err, rendered) => {

            if (err) {
                return reject(err);
            }

            const config = response.source.compiled.settings;

            if (!response.headers['content-type']) {
                response.type(config.contentType);
            }

            response.encoding(config.encoding);

            return resolve(rendered);
        });
    });
};


internals.prepare = function (response) {

    const manager = response.source.manager;

    return new Promise((resolve, reject) => {

        manager._prepare(response.source.template, response.source.options, (err, compiled) => {

            if (err) {
                return reject(err);
            }

            response.source.compiled = compiled;
            return resolve(response);
        });
    });
};


internals.bustRequireCache = function (path) {

    delete require.cache[require.resolve(path)];
};
