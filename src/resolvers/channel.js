import formatError from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  Mutation: {
    getOrCreateDMChannel: requiresAuth.createResolver(
      async (_parent, { teamId, members }, { models, user }) => {
        const member = await models.Member.findOne(
          { where: { teamId, userId: user.id } },
          { raw: true },
        );
        if (!member) {
          throw new Error('Not Authorized');
        }

        const allMembers = [...members, user.id];
        const [data] = await models.sequelize.query(
          `
        SELECT c.id, c.name 
        FROM channels AS c, pcmembers AS pc
        WHERE pc.channel_id = c.id AND c.dm = true AND c.public = false AND c.team_id = ${teamId}
        GROUP BY c.id, c.name 
        HAVING ARRAY_AGG(pc.user_id)@> Array[${allMembers.join(',')}] 
        AND COUNT(pc.user_id) = ${allMembers.length};
      `,
          { raw: true },
        );

        if (data.length) {
          return data[0];
        }

        const users = await models.User.findAll({
          raw: true,
          where: {
            id: {
              [models.sequelize.Op.in]: allMembers,
            },
          },
        });
        const channelName = users.map(u => u.username).join(', ');

        const channelId = await models.sequelize.transaction(async (transaction) => {
          const channel = await models.Channel.create(
            {
              name: channelName,
              public: false,
              dm: true,
              teamId,
            },
            { transaction },
          );
          const cId = channel.dataValues.id;
          const pcMembers = allMembers.map(m => ({ userId: m, channelId: cId }));
          await models.PCMember.bulkCreate(pcMembers, { transaction });
          return cId;
        });
        return { id: channelId, name: channelName };
      },
    ),
    createChannel: requiresAuth.createResolver(async (_parent, args, { models, user }) => {
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
        const response = await models.sequelize.transaction(async (transaction) => {
          const channel = await models.Channel.create(args, { transaction });
          if (!args.public) {
            const members = args.members.filter(m => m !== user.id);
            members.push(user.id);
            const pcMembers = members.map(m => ({ userId: m, channelId: channel.dataValues.id }));
            await models.PCMember.bulkCreate(pcMembers, { transaction });
          }
          return channel;
        });

        return {
          ok: true,
          channel: response,
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
