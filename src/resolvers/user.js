import { tryLogin } from '../auth';
import formatErrors from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  User: {
    teams: (parent, args, { models, user }) => {
      const { id } = user;
      return models.sequelize.query(
        'SELECT * FROM teams JOIN members ON teams.id = team_id WHERE members.user_id = ?',
        {
          replacements: [id],
          model: models.Team,
          raw: true,
        },
      );
    },
  },
  Query: {
    allUsers: (parent, args, { models }) => models.User.findAll(),
    me: requiresAuth.createResolver((parent, args, { models, user }) => models.User.findOne({
      where: { id: user.id },
    })),
    getUser: (parent, { userId }, { models }) => models.User.findOne({ where: { id: userId } }),
  },
  Mutation: {
    login: async (parent, { email, password }, { models, SECRET, SECRET2 }) => {
      const response = await tryLogin(email, password, models, SECRET, SECRET2);
      return response;
    },
    register: async (parent, args, { models }) => {
      try {
        const user = await models.User.create(args);
        return {
          ok: true,
          user,
        };
      } catch (err) {
        return {
          ok: false,
          errors: formatErrors(err, models),
        };
      }
    },
  },
};
