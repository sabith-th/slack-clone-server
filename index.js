import express from 'express';
import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';
import path from 'path';
import { fileLoader, mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import cors from 'cors';

import models from './models';

const SECRET = 'asongoficeandfire';
const SECRET2 = 'agameofthrones';

const typeDefs = mergeTypes(fileLoader(path.join(__dirname, 'schema')));
const resolvers = mergeResolvers(fileLoader(path.join(__dirname, 'resolvers')));

const PORT = 8080;
const app = express();
app.use(cors('*'));
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = new ApolloServer({
  schema,
  context: {
    models,
    user: {
      id: 1,
    },
    SECRET,
    SECRET2,
  },
});
server.applyMiddleware({ app });

models.sequelize.sync().then(() => {
  app.listen({ port: PORT });
});
