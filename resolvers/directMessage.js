import { withFilter } from 'graphql-subscriptions';

import requiresAuth, { directMessageSubscription } from '../permissions';
import pubsub from '../pubsub';

const NEW_DIRECT_MESSAGE = 'NEW_DIRECT_MESSAGE';

export default {
  Subscription: {
    newDirectMessage: {
      subscribe: directMessageSubscription.createResolver(
        withFilter(
          () => pubsub.asyncIterator(NEW_DIRECT_MESSAGE),
          (payload, args, { user }) => {
            const value = payload.teamId === args.teamId
              && ((payload.receiverId === args.otherUserId && payload.senderId === user.id)
                || (payload.senderId === args.otherUserId && payload.receiverId === user.id));
            return value;
          },
        ),
      ),
    },
  },
  DirectMessage: {
    sender: ({ sender, senderId }, args, { models }) => {
      if (sender) {
        return sender;
      }
      return models.User.findOne({ where: { id: senderId } }, { raw: true });
    },
  },
  Query: {
    directMessages: requiresAuth.createResolver(
      async (parent, { teamId, otherUserId }, { models, user }) => {
        const messages = await models.DirectMessage.findAll(
          {
            order: [['created_at', 'ASC']],
            where: {
              teamId,
              [models.sequelize.Op.or]: [
                {
                  [models.sequelize.Op.and]: [{ receiverId: otherUserId }, { senderId: user.id }],
                },
                {
                  [models.sequelize.Op.and]: [{ receiverId: user.id }, { senderId: otherUserId }],
                },
              ],
            },
          },
          { raw: true },
        );
        return messages;
      },
    ),
  },
  Mutation: {
    createDirectMessage: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const directMessage = await models.DirectMessage.create({ ...args, senderId: user.id });
        pubsub.publish(NEW_DIRECT_MESSAGE, {
          senderId: user.id,
          receiverId: args.receiverId,
          teamId: args.teamId,
          newDirectMessage: { ...directMessage.dataValues, sender: { username: user.username } },
        });
        return true;
      } catch (err) {
        return false;
      }
    }),
  },
};
