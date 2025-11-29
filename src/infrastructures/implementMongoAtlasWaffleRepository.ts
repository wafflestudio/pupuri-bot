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
    listAllLogs: async () => {
      const logs = await mongoClient.db('waffle').collection('logs').find().toArray();
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
  };
};
