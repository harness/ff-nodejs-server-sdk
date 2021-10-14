import { Client } from '@harnessio/ff-nodejs-server-sdk';

const client = new Client('1c100d25-4c3f-487b-b198-3b3d01df5794');

setInterval(async () => {
  const value = await client.boolVariation('test', null, false);
  console.log('Evaluation for flag test and target none: ', value);
}, 10000);
