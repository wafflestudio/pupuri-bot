import { MongoClient, ServerApiVersion } from 'mongodb';
import { z } from 'zod';
import type { SlackID } from '../entities/Slack';
import type { implementDashboardService } from '../services/DashboardService';
import type { implementSlackEventService } from '../services/SlackEventService';

export const implementMongoAtlasWaffleRepository = ({
  mongoDBUri,
}: { mongoDBUri: string }): Parameters<typeof implementSlackEventService>[0]['waffleRepository'] &
  Parameters<typeof implementDashboardService>[0]['waffleRepository'] => {
  return {
    insert: async (records) => {
      const client = new MongoClient(mongoDBUri, { serverApi: ServerApiVersion.v1 });
      await client.connect();
      await client.db('waffle').collection('logs').insertMany(records);
      await client.close();
    },
    listLogs: async ({ from, to }) => {
      const client = new MongoClient(mongoDBUri, { serverApi: ServerApiVersion.v1 });
      await client.connect();
      const logs = await client
        .db('waffle')
        .collection('logs')
        .find({ date: { $gte: from, $lt: to } })
        .toArray();
      await client.close();
      const logSchema = z.object({
        from: z.string(),
        to: z.string(),
        count: z.number(),
        href: z.string(),
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
