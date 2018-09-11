import formatError from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  Mutation: {
    createChannel: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const team = await models.Team.findOne({ where: { id: args.teamId } }, { raw: true });
        if (team.owner !== user.id) {
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
