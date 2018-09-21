import express from 'express';
import jwt from 'jsonwebtoken';
import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';
import path from 'path';
import { fileLoader, mergeTypes, mergeResolvers } from 'merge-graphql-schemas';
import cors from 'cors';
import { createServer } from 'http';

import models from './models';
import { refreshTokens } from './auth';

const SECRET = 'asongoficeandfire';
const SECRET2 = 'agameofthrones';

const typeDefs = mergeTypes(fileLoader(path.join(__dirname, 'schema')));
const resolvers = mergeResolvers(fileLoader(path.join(__dirname, 'resolvers')));

const PORT = 8080;
const app = express();
app.use(cors('*'));

const addUser = async (req, res, next) => {
  const token = req.headers['x-token'];
  if (token) {
    try {
      const { user } = jwt.verify(token, SECRET);
      req.user = user;
    } catch (err) {
      const refreshToken = req.headers['x-refresh-token'];
      const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);
      if (newTokens.token && newTokens.refreshToken) {
        res.set('Access-Control-Expose-Headers', 'x-token, x-refresh-token');
        res.set('x-token', newTokens.token);
        res.set('x-refresh-token', newTokens.refreshToken);
      }
      req.user = newTokens.user;
    }
  }
  next();
};

app.use(addUser);

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = new ApolloServer({
  schema,
  context: ({ req, connection }) => {
    if (connection) {
      return {
        models,
        user: connection.context.user,
      };
    }
    return {
      models,
      user: req.user,
      SECRET,
      SECRET2,
    };
  },
  subscriptions: {
    onConnect: async ({ token, refreshToken }) => {
      if (token && refreshToken) {
        let user = {};
        try {
          ({ user } = jwt.verify(token, SECRET));
        } catch (err) {
          const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);
          ({ user } = newTokens);
        }
        return { models, user };
      }
      return { models };
    },
  },
});
server.applyMiddleware({ app });

const httpServer = createServer(app);
server.installSubscriptionHandlers(httpServer);

models.sequelize.sync().then(() => {
  httpServer.listen(PORT);
});
