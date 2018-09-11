import { gql } from 'apollo-server-express';

export default gql`
  type Message {
    id: Int!
    text: String!
    userId: Int!
    channelId: Int!
  }

  type Query {
    messages(channelId: Int!): [Message!]!
  }

  type Mutation {
    createMessage(channelId: Int!, text: String!): Boolean!
  }
`;
