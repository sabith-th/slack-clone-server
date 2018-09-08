import formatError from '../formatErrors';

export default {
  Mutation: {
    createChannel: async (parent, args, { models }) => {
      try {
        return {
          ok: true,
          channel: models.Channel.create(args),
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatError(err, models),
        };
      }
    },
  },
};
