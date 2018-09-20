import formatErrors from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  Query: {
    getTeamMembers: requiresAuth.createResolver(async (parent, { teamId }, { models }) => {
      const teamMembers = await models.sequelize.query(
        'SELECT * FROM users JOIN members ON members.user_id = users.id WHERE members.team_id = ?',
        {
          replacements: [teamId],
          model: models.User,
          raw: true,
        },
      );
      return teamMembers;
    }),
  },
  Mutation: {
    addTeamMember: requiresAuth.createResolver(
      async (parent, { email, teamId }, { models, user }) => {
        try {
          const memberPromise = models.Member.findOne({
            where: { teamId, userId: user.id },
            raw: true,
          });
          const userToAddPromise = models.User.findOne({ where: { email }, raw: true });
          const [member, userToAdd] = await Promise.all([memberPromise, userToAddPromise]);
          if (!member.admin) {
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
          const team = await models.Team.create({ ...args });
          await models.Channel.create({ name: 'general', public: true, teamId: team.id });
          await models.Member.create({ teamId: team.id, userId: user.id, admin: true });
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
    directMessageMembers: ({ id }, args, { models, user }) => models.sequelize.query(
      'SELECT DISTINCT(u.id), u.username FROM users AS u JOIN direct_messages AS dm on (u.id = dm.sender_id) OR (u.id = dm.receiver_id) WHERE (:currentUserId = dm.sender_id OR :currentUserId = dm.receiver_id) AND dm.team_id=:teamId',
      {
        replacements: { currentUserId: user.id, teamId: id },
        model: models.User,
        raw: true,
      },
    ),
  },
};
