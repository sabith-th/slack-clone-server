import axios from 'axios';

describe('user resolvers', () => {
  test('allUsers', async () => {
    const response = await axios.post('http://localhost:8080/graphql', {
      query: `
        query {
          allUsers {
            id
            username
            email
          }
        }
      `,
    });
    const { data } = response;
    expect(data).toMatchObject({
      data: {
        allUsers: [],
      },
    });
  });

  test('register user', async () => {
    const response = await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation{
          register(username: "testuser", password: "tester", email: "user@test.com") {
            ok
            errors {
              message
            }
            user{
              email
              username
            }
          }
        }
      `,
    });
    const { data } = response;
    expect(data).toMatchObject({
      data: {
        register: {
          ok: true,
          errors: null,
          user: {
            email: 'user@test.com',
            username: 'testuser',
          },
        },
      },
    });
    const loginResponse = await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation {
          login(email: "user@test.com", password: "tester") {
            token
            refreshToken
          }
        }
      `,
    });
    const {
      data: {
        login: { token, refreshToken },
      },
    } = loginResponse.data;
    expect(token).toBeDefined();
    expect(refreshToken).toBeDefined();
  });
});
