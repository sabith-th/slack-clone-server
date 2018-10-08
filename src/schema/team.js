import { gql } from 'apollo-server-express';

export default gql`
  type Team {
    id: Int!
    name: String!
    admin: Boolean!
    directMessageMembers: [User!]!
    channels: [Channel!]!
  }

  type CreateTeamResponse {
    ok: Boolean!
    team: Team
    errors: [Error!]
  }

  type Query {
    getTeamMembers(teamId: Int!): [User!]!
  }

  type VoidResponse {
    ok: Boolean!
    errors: [Error!]
  }

  type Mutation {
    createTeam(name: String!): CreateTeamResponse!
    addTeamMember(email: String!, teamId: Int!): VoidResponse
  }
`;
