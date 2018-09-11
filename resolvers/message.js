export default {
  Query: {
    messages: async (parent, { channelId }, { models }) => {
      const messages = await models.Message.findAll({ where: { channelId } });
      return messages;
    },
  },
  Mutation: {
    createMessage: async (parent, args, { models, user }) => {
      try {
        await models.Message.create({ ...args, userId: user.id });
        return true;
      } catch (err) {
        return false;
      }
    },
  },
};
