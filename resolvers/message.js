import requiresAuth from '../permissions';

export default {
  Message: {
    user: async ({ userId }, args, { models }) => {
      const user = await models.User.findOne({ where: { id: userId } }, { raw: true });
      return user;
    },
  },
  Query: {
    messages: requiresAuth.createResolver(async (parent, { channelId }, { models }) => {
      const messages = await models.Message.findAll(
        { order: [['created_at', 'ASC']], where: { channelId } },
        { raw: true },
      );
      return messages;
    }),
  },
  Mutation: {
    createMessage: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        await models.Message.create({ ...args, userId: user.id });
        return true;
      } catch (err) {
        return false;
      }
    }),
  },
};
