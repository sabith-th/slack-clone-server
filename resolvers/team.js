import formatErrors from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  Query: {
    allTeams: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      const { id } = user;
      return models.Team.findAll({ where: { owner: id } }, { raw: true });
    }),
  },
  Mutation: {
    addTeamMember: requiresAuth.createResolver(
      async (parent, { email, teamId }, { models, user }) => {
        try {
          const teamPromise = models.Team.findOne({ where: { id: teamId }, raw: true });
          const userToAddPromise = models.User.findOne({ where: { email }, raw: true });
          const [team, userToAdd] = await Promise.all([teamPromise, userToAddPromise]);
          if (team.owner !== user.id) {
            return {
              ok: false,
              errors: [{ path: 'email', message: 'Only owners can add members to the team' }],
            };
          }
          if (!userToAdd) {
            return {
              ok: false,
              errors: [{ path: 'email', message: 'Given email does not exist' }],
            };
          }
          await models.Member.create({ userId: userToAdd.id, teamId });
          return {
            ok: true,
          };
        } catch (err) {
          return {
            ok: false,
            errors: formatErrors(err, models),
          };
        }
      },
    ),
    createTeam: requiresAuth.createResolver(async (parent, args, { models, user }) => {
      try {
        const response = await models.sequelize.transaction(async () => {
          const team = await models.Team.create({ ...args, owner: user.id });
          await models.Channel.create({ name: 'general', public: true, teamId: team.id });
          return team;
        });
        return {
          ok: true,
          team: response,
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatErrors(err, models),
        };
      }
    }),
  },
  Team: {
    channels: ({ id }, args, { models }) => models.Channel.findAll({ where: { teamId: id } }),
  },
};
