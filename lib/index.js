'use strict';

// Load modules

const Hoek = require('hoek');
const Joi = require('joi');
// Additional helper modules required in constructor

const Manager = require('./manager');


// Declare internals

const internals = { schema: {} };

internals.schema.manager = Joi.any();

internals.schema.handler = [
    Joi.string(),
    Joi.object({
        template: Joi.string(),
        context: Joi.object(),
        options: Joi.object()
    })
];

exports.plugin = {

    multiple: true,
    pkg: require('../package.json'),

    register: function (server, options) {

        if (Object.keys(options).length > 0) {
            const boundAssignManager = internals.assignManager.bind(server);
            boundAssignManager(options);
        }

        const rootRealm = internals.getRootRealm(server.realm);
        const rootState = internals.state(rootRealm);

        if (rootState.setup) {
            return;
        }

        server.decorate('server', 'views', internals.assignManager);
        server.decorate('server', 'render', internals.render);
        server.decorate('request', 'render', internals.render);
        server.decorate('handler', 'view', internals.handler);
        server.decorate('toolkit', 'view', internals.toolkitView);

        rootState.setup = true;
    }
};


internals.assignManager = function (options) {

    Joi.assert(options, internals.schema.manager, 'Invalid manager options');

    const realm = this.realm.parent || this.realm;
    const realmState = internals.state(realm);

    Hoek.assert(!realmState.manager, 'Cannot set views manager more than once per realm');

    if (!options.relativeTo &&
        realm.settings.files.relativeTo) {

        options = Hoek.shallow(options);
        options.relativeTo = realm.settings.files.relativeTo;
    }

    const manager = new Manager(options);
    realmState.manager = manager;
    return manager;
};


internals.render = async function (template, context, options = {}) {

    const isServer = (typeof this.route === 'function');
    const server = (isServer ? this : this.server);

    const realmState = internals.nearestState(server.realm);

    Hoek.assert(realmState.manager, 'Missing views manager');
    return await realmState.manager.render(template, context, options);
};


internals.toolkitView = function (template, context, options) {

    const realmState = internals.nearestState(this.request.route.realm);

    Hoek.assert(realmState.manager, 'Cannot render view without a views manager configured');
    return this.response(realmState.manager._response(template, context, options, this.request));
};


internals.handler = function (route, options) {

    Joi.assert(options, internals.schema.handler, 'Invalid view handler options (' + route.path + ')');

    if (typeof options === 'string') {
        options = { template: options };
    }

    const settings = {                                                // Shallow copy to allow making dynamic changes to context
        template: options.template,
        context: options.context,
        options: options.options
    };

    return function (request, h) {

        const context = {
            params: request.params,
            payload: request.payload,
            query: request.query,
            pre: request.pre
        };

        if (settings.context) {                                     // Shallow copy to avoid cloning unknown objects
            const keys = Object.keys(settings.context);
            for (let i = 0; i < keys.length; ++i) {
                const key = keys[i];
                context[key] = settings.context[key];
            }
        }

        return h.view(settings.template, context, settings.options);
    };
};


internals.state = (realm) => {

    const state = realm.plugins.vision = realm.plugins.vision || {};
    return state;
};


internals.nearestState = function (realm) {

    if (realm.plugins.vision) {
        return realm.plugins.vision;
    }

    const parent = realm.parent;

    return internals.nearestState(parent);
};


internals.getRootRealm = (realm) => {

    let rootRealm = realm;

    while (rootRealm.parent) {
        rootRealm = rootRealm.parent;
    }

    return rootRealm;
};
