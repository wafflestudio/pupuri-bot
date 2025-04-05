import type { MongoClient } from 'mongodb';
import { z } from 'zod';
import type { SlackID } from '../entities/Slack';
import type { implementDashboardService } from '../services/DashboardService';
import type { implementWaffleService } from '../services/WaffleService';
import type { getHeywaffleUsecase } from '../usecases/HeywaffleUsecase';

export const implementMongoAtlasWaffleRepository = ({
  mongoClient,
}: { mongoClient: Pick<MongoClient, 'db'> }): Parameters<
  typeof getHeywaffleUsecase
>[0]['waffleRepository'] &
  Parameters<typeof implementDashboardService>[0]['waffleRepository'] &
  Parameters<typeof implementWaffleService>[0]['waffleRepository'] => {
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
        from: z.string(),
        to: z.string(),
        count: z.number(),
        href: z.string().nullable(),
        date: z.date(),
      });
      return {
        logs: logs
          .map((l) => logSchema.parse(l))
          .map((log) => ({ ...log, from: log.from as SlackID, to: log.to as SlackID })),
      };
    },
    listAllLogs: async () => {
      const logs = await mongoClient.db('waffle').collection('logs').find().toArray();
      const logSchema = z.object({
        from: z.string(),
        to: z.string(),
        count: z.number(),
        href: z.string().nullable(),
        date: z.date(),
      });
      return {
        logs: logs
          .map((l) => logSchema.parse(l))
          .map((log) => ({ ...log, from: log.from as SlackID, to: log.to as SlackID })),
      };
    },
  };
};
