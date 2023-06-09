import {
  Server,
  Request,
  ResponseToolkit,
} from '@hapi/hapi';
import { types } from '@hapi/lab'

import * as Vision from '..';
import * as Handlebars from 'handlebars';

import type { ViewManager } from '..';

const server = new Server({
  port: 80,
});

const provision = async () => {
  await server.register({
    plugin: Vision,
    options: {
      engines: { hbs: Handlebars },
      path: __dirname + '/templates',
    }
  });

  const viewManager = server.views({
    engines: { hbs: Handlebars },
    path: __dirname + '/templates',
  });
  types.expect.type<ViewManager>(viewManager);

  const manager = server.getViewsManager();
  types.expect.type<ViewManager>(manager)

  manager.registerHelper('test', () => 'test');

  const context = {
    title: 'Views Example',
    message: 'Hello, World',
  };

  console.log(await server.render('hello', context));

  server.route({
    method: 'GET',
    path: '/view',
    handler: async (request: Request, h: ResponseToolkit) => {
      types.expect.type<Function>(request.render);
      return request.render('test', { message: 'hello' });
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
    types.expect.type<Function>(h.view);
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
        },
      },
    },
  });
};
