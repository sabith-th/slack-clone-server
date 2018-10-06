import formatError from '../formatErrors';
import requiresAuth from '../permissions';

export default {
  Mutation: {
    getOrCreateDMChannel: requiresAuth.createResolver(
      async (parent, { teamId, members }, { models, user }) => {
        members.push(user.id);
        const [data] = await models.sequelize.query(
          `
        SELECT c.id 
        FROM channels AS c, pcmembers AS pc
        WHERE pc.channel_id = c.id AND c.dm = true AND c.public = false AND c.team_id = ${teamId}
        GROUP BY c.id 
        HAVING ARRAY_AGG(pc.user_id)@> Array[${members.join(',')}] 
        AND COUNT(pc.user_id) = ${members.length};
      `,
          { raw: true },
        );
        if (data.length) {
          return data[0].id;
        }

        const channelId = await models.sequelize.transaction(async (transaction) => {
          const channel = await models.Channel.create(
            {
              name: 'hello',
              public: false,
              dm: true,
              teamId,
            },
            { transaction },
          );
          const cId = channel.dataValues.id;
          const pcMembers = members.map(m => ({ userId: m, channelId: cId }));
          await models.PCMember.bulkCreate(pcMembers, { transaction });
          return cId;
        });
        return channelId;
      },
    ),
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
