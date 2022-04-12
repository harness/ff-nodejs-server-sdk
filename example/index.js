import 'dotenv/config';
const { Client } = require('@harnessio/ff-nodejs-server-sdk');

const client = new Client(process.env.SDK_KEY);

console.log('Starting application');

setInterval(async () => {
  const target = {
    identifier: 'harness',
  };
  const value = await client.boolVariation('test', target, false);
  console.log('Evaluation for flag test and target: ', value, target);
}, 10000);

console.log('Application started');
