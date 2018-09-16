import { gql } from 'apollo-server-express';

export default gql`
  type DirectMessage {
    id: Int!
    sender: User!
    receiverId: Int!
    text: String!
    created_at: String!
  }

  type Query {
    directMessages(receiverId: Int!): [DirectMessage!]!
  }

  type Mutation {
    createDirectMessage(receiverId: Int!, text: String!): Boolean!
  }
`;
