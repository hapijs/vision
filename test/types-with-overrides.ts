import {
    Server,
    Request,
    ResponseToolkit,
    ResponseObject,
} from '@hapi/hapi';

import * as Vision from '..';
import * as Handlebars from 'handlebars';

const server = new Server({
    port: 80,
});

type CustomTemplates = (
    'test' | 'hello' | 'temp1'
);

type CustomLayout = (
    'auth' | 'unauth' | 'admin'
)

declare module '..' {

    interface RenderMethod {
        (template: CustomTemplates, context?: string, options?: ServerViewsConfiguration): Promise<string>
    }

    interface ToolkitRenderMethod {
        (template: CustomTemplates, context?: string, options?: ViewHandlerOrReplyOptions): ResponseObject
    }

    interface ViewTypes {
        template: CustomTemplates
        layout: CustomLayout
    }
}


const provision = async () => {
    await server.register({
        plugin: Vision,
        options: {
            engines: { hbs: Handlebars },
            path: __dirname + '/templates',
        }
    });

    server.views({
        engines: { hbs: Handlebars },
        path: __dirname + '/templates',
    });

    const manager = server.getViewsManager();

    manager.registerHelper('test', () => 'test');

    const context = {
        title: 'Views Example',
        message: 'Hello, World',
    };

    await server.render('hello', context);

    server.route({
        method: 'GET',
        path: '/view',
        handler: async (request: Request, h: ResponseToolkit) => {

            return request.render('test', { message: 'hello' }, { layout: 'admin' });
        },
    });

    server.route({
        method: 'GET',
        path: '/',
        handler: {
            view: {
                template: 'hello',
                context: {
                    title: 'Views Example',
                    message: 'Hello, World',
                },
            },
        },
    });

    const handler = (request: Request, h: ResponseToolkit) => {
        const context = {
            title: 'Views Example',
            message: 'Hello, World',
        };
        return h.view('hello', context);
    };

    server.route({ method: 'GET', path: '/', handler });

    server.route({
        method: 'GET',
        path: '/temp1',
        handler: {
            view: {
                template: 'temp1',
                options: {
                    compileOptions: {
                        noEscape: true,
                    },
                    layout: 'admin'
                },
            },
        },
    });
};