import { describe, expect, test } from 'bun:test';
import { getHeywaffleDashboardUsecase } from './HeywaffleDashboardUsecase';

describe('getHeywaffleDashboardUsecase', () => {
  test('adds member names to the database-side summary', async () => {
    const usecase = getHeywaffleDashboardUsecase({
      memberRepository: {
        getAllMembers: async () => ({
          members: [
            { name: 'Alice', slackUserId: 'U1' },
            { name: 'Bob', slackUserId: 'U2' },
          ],
        }),
      },
      waffleRepository: {
        summarizeAllLogs: async () => ({
          edges: [{ count: 5, from: 'U1', to: 'U2' }],
          vertexes: [
            { given: 3, taken: 2, user: 'U1' },
            { given: 2, taken: 3, user: 'U2' },
          ],
        }),
      },
    });

    expect(await usecase.getGraphData()).toEqual({
      edges: [{ count: 5, from: 'U1', to: 'U2' }],
      vertexes: [
        { count: 5, id: 'U1', title: 'Alice (5)' },
        { count: 5, id: 'U2', title: 'Bob (5)' },
      ],
    });
  });
});
