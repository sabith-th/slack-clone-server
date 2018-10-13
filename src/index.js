import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';
import cors from 'cors';
import DataLoader from 'dataloader';
import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { fileLoader, mergeResolvers, mergeTypes } from 'merge-graphql-schemas';
import path from 'path';
import { refreshTokens } from './auth';
import { channelBatcher, userBatcher } from './batchFunctions';
import getModels from './models';

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

const httpServer = createServer(app);

getModels().then((models) => {
  if (!models) {
    // eslint-disable-next-line no-console
    console.log('Could not connect to database');
    return;
  }

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

  const server = new ApolloServer({
    schema,
    context: ({ req, connection }) => {
      if (connection) {
        return {
          models,
          user: connection.context.user,
          userLoader: connection.context.userLoader,
        };
      }
      return {
        models,
        user: req.user,
        SECRET,
        SECRET2,
        channelLoader: new DataLoader(ids => channelBatcher(ids, models, req.user)),
        userLoader: new DataLoader(ids => userBatcher(ids, models)),
      };
    },
    subscriptions: {
      onConnect: async ({ token, refreshToken }) => {
        const userLoader = new DataLoader(ids => userBatcher(ids, models));
        if (token && refreshToken) {
          let user = {};
          try {
            ({ user } = jwt.verify(token, SECRET));
          } catch (err) {
            const newTokens = await refreshTokens(token, refreshToken, models, SECRET, SECRET2);
            ({ user } = newTokens);
          }
          return { models, user, userLoader };
        }
        return { models, userLoader };
      },
    },
  });

  server.applyMiddleware({ app });
  server.installSubscriptionHandlers(httpServer);

  models.sequelize.sync().then(() => {
    httpServer.listen(PORT);
  });
});
