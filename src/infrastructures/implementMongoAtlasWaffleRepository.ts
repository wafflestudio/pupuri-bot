import type { MongoClient } from 'mongodb';
import { z } from 'zod';
import type { SlackID } from '../entities/Slack';
import type { getHeywaffleDashboardUsecase } from '../usecases/HeywaffleDashboardUsecase';
import type { getHeywaffleUsecase } from '../usecases/HeywaffleUsecase';
import type { getWeeklyWaffleStudioDashboardUsecase } from '../usecases/WeeklyWaffleStudioDashboardUsecase';

export const implementMongoAtlasWaffleRepository = ({
  mongoClient,
}: {
  mongoClient: Pick<MongoClient, 'db'>;
}): Parameters<typeof getHeywaffleUsecase>[0]['waffleRepository'] &
  Parameters<typeof getWeeklyWaffleStudioDashboardUsecase>[0]['waffleRepository'] &
  Parameters<typeof getHeywaffleDashboardUsecase>[0]['waffleRepository'] => {
  return {
    insert: async (records) => {
      await mongoClient.db('waffle').collection('logs').insertMany(records);
    },
    listLogs: async ({ from, to }) => {
      const logs = await mongoClient
        .db('waffle')
        .collection('logs')
        .find({ date: { $gte: from, $lt: to } })
        .toArray();
      const logSchema = z.object({
        count: z.number(),
        date: z.date(),
        from: z.string(),
        href: z.string().nullable(),
        to: z.string(),
      });
      return {
        logs: logs
          .map((l) => logSchema.parse(l))
          .map((log) => ({ ...log, from: log.from as SlackID, to: log.to as SlackID })),
      };
    },
    summarizeAllLogs: async () => {
      const summary = await mongoClient
        .db('waffle')
        .collection('logs')
        .aggregate<{
          vertexes: { user: string; given: number; taken: number }[];
          edges: { from: string; to: string; count: number }[];
        }>([
          {
            $facet: {
              edges: [
                {
                  $project: {
                    count: 1,
                    from: { $cond: [{ $lte: ['$from', '$to'] }, '$from', '$to'] },
                    to: { $cond: [{ $lte: ['$from', '$to'] }, '$to', '$from'] },
                  },
                },
                {
                  $group: {
                    _id: { from: '$from', to: '$to' },
                    count: { $sum: '$count' },
                  },
                },
                { $project: { _id: 0, count: 1, from: '$_id.from', to: '$_id.to' } },
              ],
              vertexes: [
                {
                  $project: {
                    users: [
                      { given: '$count', taken: { $literal: 0 }, user: '$from' },
                      { given: { $literal: 0 }, taken: '$count', user: '$to' },
                    ],
                  },
                },
                { $unwind: '$users' },
                {
                  $group: {
                    _id: '$users.user',
                    given: { $sum: '$users.given' },
                    taken: { $sum: '$users.taken' },
                  },
                },
                { $project: { _id: 0, given: 1, taken: 1, user: '$_id' } },
              ],
            },
          },
        ])
        .next();

      return summary ?? { edges: [], vertexes: [] };
    },
  };
};
