'use strict';

// Load modules

const Hoek = require('hoek');
const Joi = require('joi');
const Schemas = require('./schemas');

// Additional helper modules required in constructor

const Manager = require('./manager');


// Declare internals

const internals = {};

exports.plugin = {

    multiple: true,
    pkg: require('../package.json'),

    register: function (server, options) {

        if (Object.keys(options).length > 0) {
            internals.assignManager.call(server, options, server.realm.parent);
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


internals.assignManager = function (options, realm) {

    realm = realm || this.realm;
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
    const realm = (isServer ? this.realm : this.route.realm);

    const manager = internals.nearestManager(realm);
    Hoek.assert(manager, 'Missing views manager');

    if (!isServer) {
        // this is the request
        return await manager.render(template, context, options, this);
    }

    return await manager.render(template, context, options);
};


internals.toolkitView = function (template, context, options) {

    const manager = internals.nearestManager(this.realm);

    Hoek.assert(manager, 'Missing views manager');
    return this.response(manager._response(template, context, options, this.request));
};


internals.handler = function (route, options) {

    Joi.assert(options, Schemas.handler, 'Invalid view handler options (' + route.path + ')');

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


internals.nearestManager = function (realm) {

    const pluginState = internals.state(realm);
    if (pluginState.manager) {
        return pluginState.manager;
    }

    let parent = realm.parent;
    while (parent) {

        const parentState = internals.state(parent);
        if (parentState.manager) {
            return parentState.manager;
        }

        parent = parent.parent;
    }

    return null;
};


internals.getRootRealm = (realm) => {

    while (realm.parent) {
        realm = realm.parent;
    }

    return realm;
};
