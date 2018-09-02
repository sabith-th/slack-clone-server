import express from 'express';
import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';
import typeDefs from './schema';
import resolvers from './resolver';
import models from './models';

const PORT = 8080;
const app = express();
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = new ApolloServer({ schema });
server.applyMiddleware({ app });

models.sequelize.sync({ force: true }).then(() => {
  app.listen({ port: PORT });
});
