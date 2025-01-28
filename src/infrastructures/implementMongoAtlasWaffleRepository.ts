import { MongoClient, ServerApiVersion } from 'mongodb';
import type { implementSlackEventService } from '../services/SlackEventService';

export const implementMongoAtlasWaffleRepository = ({
  mongoDBUri,
}: { mongoDBUri: string }): Parameters<
  typeof implementSlackEventService
>[0]['waffleRepository'] => {
  const client = new MongoClient(mongoDBUri, {
    serverApi: ServerApiVersion.v1,
  });

  return {
    insert: async (records) => {
      await client.connect();
      await client.db('waffle').collection('logs').insertMany(records);
      await client.close();
    },
  };
};
