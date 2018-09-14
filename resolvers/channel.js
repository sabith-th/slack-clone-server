import formatError from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  Mutation: {
    createChannel: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const member = await models.Member.findOne(
          { where: { teamId: args.teamId, userId: user.id } },
          { raw: true },
        );
        if (!member.admin) {
          return {
            ok: false,
            errors: [
              {
                path: 'name',
                message: 'Only team owners can create channels',
              },
            ],
          };
        }
        return {
          ok: true,
          channel: await models.Channel.create(args),
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatError(err, models),
        };
      }
    }),
  },
};
