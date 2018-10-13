export const channelBatcher = async (ids, models, user) => {
  const results = await models.sequelize.query(
    `SELECT DISTINCT ON (id) *
      FROM channels as c LEFT OUTER JOIN pcmembers as pc
      ON c.id = pc.channel_id
      WHERE c.team_id IN (:teamIds) AND 
      (c.public = true OR pc.user_id =:currentUserId);`,
    {
      replacements: { currentUserId: user.id, teamIds: ids },
      model: models.Channel,
      raw: true,
    },
  );
  const data = {};
  results.forEach((r) => {
    if (data[r.team_id]) {
      data[r.team_id].push(r);
    } else {
      data[r.team_id] = [r];
    }
  });
  return ids.map(id => data[id]);
};

export const userBatcher = async (ids, models) => {
  const results = await models.sequelize.query(
    `SELECT * FROM users AS u
      WHERE u.id IN (:userIds);`,
    {
      replacements: { userIds: ids },
      model: models.User,
      raw: true,
    },
  );
  const data = {};
  results.forEach((r) => {
    data[r.id] = r;
  });
  return ids.map(id => data[id]);
};
