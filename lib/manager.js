'use strict';

const Fs = require('fs');
const Path = require('path');
const { promisify } = require('util');

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

        let { partialsPath } = engine.config;
        const { relativeTo } = engine.config;
        const { module } = engine;

        if (!partialsPath ||
            !module.registerPartial ||
            typeof module.registerPartial !== 'function') {

            return;
        }

        const traverse = (path) =>

            Fs.readdirSync(path)
                .map((file) => {

                    file = Path.join(path, file);
                    const stat = Fs.statSync(file);

                    if (stat.isDirectory()) {

                        return traverse(file);
                    }

                    if (Path.basename(file)[0] !== '.' &&
                        Path.extname(file) === engine.suffix) {

                        return [file];
                    }

                    return [];
                })
                .reduce((acc, cur) => acc.concat(cur), [])
                .filter((f) => !!f);

        if (typeof partialsPath === 'string') {

            partialsPath = [partialsPath];
        }

        partialsPath
            .map((path) => internals.path(relativeTo, path))
            .forEach((path) => {

                traverse(path)
                    .forEach((file) => {

                        const offset = path.slice(-1) === Path.sep ? 0 : 1;

                        const name = file
                            .slice(path.length + offset, -engine.suffix.length)
                            .replace(/\\/g, '/');

                        const src = Fs.readFileSync(file).toString(engine.config.encoding);

                        module.registerPartial(name, src);
                    });
            });
    }

    _loadHelpers(engine) {

        let { helpersPath } = engine.config;
        const { relativeTo, isCached } = engine.config;
        const { module } = engine;

        if (!helpersPath ||
            !module.registerHelper ||
            typeof module.registerHelper !== 'function') {

            return;
        }

        if (typeof helpersPath === 'string') {

            helpersPath = [helpersPath];
        }

        helpersPath
            .map((path) => internals.path(relativeTo, path))
            .forEach((path) => {

                if (!Path.isAbsolute(path)) {
                    path = Path.join(process.cwd(), path);
                }

                Fs.readdirSync(path)
                    .map((file) => Path.join(path, file))
                    .filter((file) => {

                        const stat = Fs.statSync(file);
                        const ext = Path.extname(file);

                        return stat.isFile() &&
                            !Path.basename(file).startsWith('.') &&
                            Object.keys(require.extensions).includes(ext);
                    })
                    .forEach((file) => {

                        try {
                            if (!isCached) {
                                this._bustRequireCache(file);
                            }

                            const required = require(file);

                            const offset = path.slice(-1) === Path.sep ? 0 : 1;
                            const name = file.slice(path.length + offset, -Path.extname(file).length);
                            const helper = required[name] || required.default || required;
                            if (typeof helper === 'function') {
                                module.registerHelper(name, helper);
                            }
                        }
                        catch (err) {
                            console.warn('WARNING: vision failed to load helper \'%s\': %s', file, err.message);
                        }
                    });
            });
    }

    async _prepare(template, options) {

        options = options || {};
        const fileExtension = Path.extname(template).slice(1);
        const extension = fileExtension || this._defaultExtension;
        if (!extension) {
            throw Boom.badImplementation('Unknown extension and no defaultExtension configured for view template: ' + template);
        }

        const engine = this._engines[extension];
        if (!engine) {
            throw Boom.badImplementation('No view engine found for file: ' + template);
        }

        template = template + (fileExtension ? '' : engine.suffix);

        // Engine is ready to render
        if (engine.ready) {
            return await this._prepareTemplates(template, engine, options);
        }

        // Engine needs initialization
        await this._prepareEngine(engine);
        return await this._prepareTemplates(template, engine, options);
    }

    async _prepareEngine(engine) {

        // _prepareEngine can only be invoked when the prepare function is defined

        const prepareEngine = promisify(engine.module.prepare);
        const prep = await prepareEngine(engine.config);
        engine.ready = true;

        return prep;
    }

    async _prepareTemplates(template, engine, options) {

        const compiled = {
            settings: Hoek.applyToDefaults(engine.config, options)
        };

        const templatePath = await this._path(template, compiled.settings, false);
        if (!engine.config.isCached) {
            this._loadPartials(engine);
            this._loadHelpers(engine);
        }

        const compiledTemplate = await this._compile(templatePath, engine, compiled.settings);

        compiled.template = compiledTemplate;

        // No layout
        if (!compiled.settings.layout) {
            return compiled;
        }

        // With layout
        const layoutTmpl = compiled.settings.layout === true ? 'layout' : compiled.settings.layout;
        const layoutPath = await this._path(layoutTmpl + engine.suffix, compiled.settings, true);
        const layout = await this._compile(layoutPath, engine, compiled.settings);

        compiled.layout = layout;
        return compiled;
    }

    async _path(template, settings, isLayout) {

        // Validate path
        const isAbsolutePath = Path.isAbsolute(template);
        const isInsecurePath = template.match(/\.\.\//g);

        if (!settings.allowAbsolutePaths &&
            isAbsolutePath) {

            throw Boom.badImplementation('Absolute paths are not allowed in views');
        }

        if (!settings.allowInsecureAccess &&
            isInsecurePath) {

            throw Boom.badImplementation('View paths cannot lookup templates outside root path (path includes one or more \'../\')');
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

        const promise = new Promise((resolve, reject) => {

            Items.serial(paths, (path, nextFile) => {

                try {
                    const stat = Fs.statSync(path);

                    /* $lab:coverage:off$ */
                    if (stat.isFile()) {

                        return resolve(path);
                    }

                    nextFile();
                    /* $lab:coverage:on$ */
                }
                catch (e) {

                    nextFile();
                }
            }, () => {

                reject(
                    Boom.badImplementation(
                        `View file not found: '${ template }'. Locations searched: [${ paths.join(',') }]`
                    )
                );
            });
        });

        return await promise;
    }

    async _compile(template, engine, settings) {

        const { cache, compileFunc } = engine;

        if (cache && cache[template]) {

            return cache[template];
        }

        settings.compileOptions.filename = template;            // Pass the template to Pug via this copy of compileOptions

        let data;

        try {

            // Read file
            data = Fs.readFileSync(template, { encoding: settings.encoding });
        }
        catch (e) {

            throw Boom.badImplementation('Failed to read view file: ' + template);
        }

        const compiled = await compileFunc(data, settings.compileOptions);

        if (cache) {
            cache[template] = compiled;
        }

        return compiled;
    }

    async _render(compiled, context, request) {

        if (this._context) {

            let base = this._context;

            if (typeof this._context === 'function') {

                base = await this._context(request);
            }

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
        const { layout, template, settings } = compiled;
        const { layoutKeyword, runtimeOptions } = settings;

        if (layout &&
            context.hasOwnProperty(layoutKeyword)) {

            throw Boom.badImplementation('settings.layoutKeyword conflict', { context, keyword: layoutKeyword });
        }

        try {

            // maybe need to promisify template
            const renderedContent = await template(context, runtimeOptions);

            // No layout
            if (!layout) {

                return renderedContent;
            }

            // With layout
            context[layoutKeyword] = renderedContent;

            // maybe need to promisify layout
            const renderedWithLayout = layout(context, runtimeOptions);
            delete context[layoutKeyword];
            return renderedWithLayout;
        }
        catch (e) {

            throw Boom.boomify(e);
        }
    }

    _response(template, context, options, request) {

        Joi.assert(options, Schemas.viewOverride);

        const source = { manager: this, template, context, options };
        return request.generateResponse(source, { variety: 'view', marshal: internals.marshal, prepare: internals.prepare });
    }

    _bustRequireCache(path) {

        const modulekey = require.resolve(path);
        const mod = require.cache[modulekey];

        if (mod) {
            // Remove module from require cache
            delete require.cache[modulekey];

            // Remove module references from parent module
            mod.parent.children = mod.parent.children.filter((el) => el !== mod);
        }
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

    async render(filename, context, options, request) {

        const compiled = await this._prepare(filename, options);
        return await this._render(compiled, context, request);
    }
};


internals.path = function (base, path, file) {

    if (path &&
        Path.isAbsolute(path)) {

        return Path.join(path, file || '');
    }

    return Path.join(base || '', path || '', file || '');
};


internals.marshal = async function (response) {

    const manager = response.source.manager;
    const rendered =  await manager._render(response.source.compiled, response.source.context, response.request);

    const config = response.source.compiled.settings;

    if (!response.headers['content-type']) {
        response.type(config.contentType);
    }

    response.encoding(config.encoding);

    return rendered;
};


internals.prepare = async function (response) {

    const manager = response.source.manager;
    const compiled = await manager._prepare(response.source.template, response.source.options);

    response.source.compiled = compiled;

    return response;
};
