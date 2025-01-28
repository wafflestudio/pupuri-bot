import { expect, test } from 'bun:test';

import { getTodayStartAsKST } from './getTodayStartAsKST';

test('getTodayStartAsKST', () => {
  const initialTZ = process.env.TZ;

  process.env.TZ = 'America/New_York';
  const americaNewYorkDate = new Date('2024-01-28T15:20:46.000Z');
  expect(americaNewYorkDate.getHours()).toEqual(10);
  expect(getTodayStartAsKST(americaNewYorkDate)).toEqual(new Date('2024-01-28T15:00:00.000Z'));

  process.env.TZ = 'Europe/London';
  const europeLondonDate = new Date('2024-01-28T15:20:46.000Z');
  expect(europeLondonDate.getHours()).toEqual(15);
  expect(getTodayStartAsKST(europeLondonDate)).toEqual(new Date('2024-01-28T15:00:00.000Z'));

  process.env.TZ = 'Asia/Seoul';
  const asiaSeoulDate = new Date('2024-01-28T15:20:46.000Z');
  expect(asiaSeoulDate.getHours()).toEqual(0);
  expect(getTodayStartAsKST(asiaSeoulDate)).toEqual(new Date('2024-01-28T15:00:00.000Z'));

  process.env.TZ = initialTZ;
});
