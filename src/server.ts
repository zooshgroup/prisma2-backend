import { GraphQLServer, Options } from 'graphql-yoga';
import { schema } from './schema';
import { createContext } from './context';
import { permissions } from './auth';
import { formatError } from 'apollo-errors';

const options: Options = {
  formatError,
};

new GraphQLServer({
  schema,
  context: createContext,
  middlewares: [permissions],
}).start(options, () =>
  console.log(
    `🚀 Server ready at: http://localhost:4000\n⭐️ See sample queries: http://pris.ly/e/ts/graphql-auth#using-the-graphql-api`,
  ),
);
