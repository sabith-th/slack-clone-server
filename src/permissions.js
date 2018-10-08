const createResolver = (resolver) => {
  const baseResolver = resolver;
  baseResolver.createResolver = (childResolver) => {
    const newResolver = async (parent, args, context, info) => {
      await resolver(parent, args, context, info);
      return childResolver(parent, args, context, info);
    };
    return createResolver(newResolver);
  };
  return baseResolver;
};

export default createResolver((parent, args, { user }) => {
  if (!user || !user.id) {
    throw new Error('Not authenticated');
  }
});

export const requiresTeamAccess = createResolver(async (parent, { channelId }, context) => {
  const { models, user } = context;
  if (!user || !user.id) {
    throw new Error('Not authenticated');
  }
  const channel = await models.Channel.findOne({ where: { id: channelId } });
  const member = await models.Member.findOne({
    where: { teamId: channel.teamId, userId: user.id },
  });
  if (!member) {
    throw new Error('Only team members can subscribe to channel messages');
  }
});

export const directMessageSubscription = createResolver(
  async (parent, { teamId, otherUserId }, context) => {
    const { models, user } = context;
    if (!user || !user.id) {
      throw new Error('Not authenticated');
    }

    const members = await models.Member.findAll({
      where: {
        teamId,
        [models.sequelize.Op.or]: [{ userId: otherUserId }, { userId: user.id }],
      },
    });
    if (user.id !== otherUserId && members.length !== 2) {
      throw new Error('Only people involved in the chat can subscribe to direct messages');
    }
  },
);
