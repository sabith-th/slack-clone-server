import { withFilter } from 'graphql-subscriptions';
import requiresAuth, { requiresTeamAccess } from '../permissions';
import pubsub from '../pubsub';

const NEW_CHANNEL_MESSAGE = 'NEW_CHANNEL_MESSAGE';

export default {
  Subscription: {
    newChannelMessage: {
      subscribe: requiresTeamAccess.createResolver(
        withFilter(
          () => pubsub.asyncIterator(NEW_CHANNEL_MESSAGE),
          (payload, args) => payload.channelId === args.channelId,
        ),
      ),
    },
  },
  Message: {
    user: ({ user, userId }, args, { models }) => {
      if (user) {
        return user;
      }
      return models.User.findOne({ where: { id: userId } }, { raw: true });
    },
  },
  Query: {
    messages: requiresAuth.createResolver(
      async (parent, { channelId, cursor }, { models, user }) => {
        const channel = await models.Channel.findOne({ where: { id: channelId }, raw: true });
        if (!channel.public) {
          const member = await models.PCMember.findOne({
            where: { userId: user.id, channelId },
            raw: true,
          });
          if (!member) {
            throw new Error('Not Authorized');
          }
        }
        const options = {
          order: [['created_at', 'DESC']],
          where: { channelId },
          limit: 35,
        };
        if (cursor) {
          options.where.created_at = {
            [models.op.lt]: new Date(parseInt(cursor, 10)),
          };
        }
        const messages = await models.Message.findAll(options, { raw: true });
        return messages;
      },
    ),
  },
  Mutation: {
    createMessage: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const message = await models.Message.create({ ...args, userId: user.id });
        const asyncFunc = async () => {
          const currentUser = await models.User.findOne({ where: { id: user.id } });
          pubsub.publish(NEW_CHANNEL_MESSAGE, {
            channelId: args.channelId,
            newChannelMessage: message.dataValues,
            user: currentUser,
          });
        };
        asyncFunc();
        return true;
      } catch (err) {
        return false;
      }
    }),
  },
};
