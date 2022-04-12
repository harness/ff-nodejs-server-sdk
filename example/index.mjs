import 'dotenv/config';
import { Client } from '@harnessio/ff-nodejs-server-sdk';

const client = new Client(process.env.SDK_KEY);

setInterval(async () => {
  const value = await client.boolVariation('test', null, false);
  console.log('Evaluation for flag test and target none: ', value);
}, 10000);
