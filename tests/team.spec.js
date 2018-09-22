import axios from 'axios';

describe('team resolvers', () => {
  test('create team', async () => {
    await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation{
          register(username: "testuser2", password: "tester2", email: "user2@test.com") {
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
    const loginResponse = await axios.post('http://localhost:8080/graphql', {
      query: `
        mutation {
          login(email: "user2@test.com", password: "tester2") {
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
    const createTeamResponse = await axios.post(
      'http://localhost:8080/graphql',
      {
        query: `
        mutation {
          createTeam(name: "Test Team") {
            ok
            team {
              name    
            }
          }
        }
      `,
      },
      {
        headers: {
          'x-token': token,
          'x-refresh-token': refreshToken,
        },
      },
    );
    expect(createTeamResponse.data).toMatchObject({
      data: {
        createTeam: {
          ok: true,
          team: {
            name: 'Test Team',
          },
        },
      },
    });
  });
});
