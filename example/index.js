import 'dotenv/config';
const { Client } = require('@harnessio/ff-nodejs-server-sdk');

const client = new Client(process.env.SDK_KEY);

console.log('Starting application');

setInterval(async () => {
  const target = {
    identifier: 'harness',
  };

  const value = await client.boolVariation('flag1', target, false);
  console.log('flag1: ', value, target);

  const value2 = await client.numberVariation('flag2', target, -1);
  console.log('flag2: ', value2, target);

  const value3 = await client.stringVariation('flag3', target, "NO_VALUE!!!");
  console.log('flag3: ', value3, target);

  const value4 = await client.jsonVariation('flag4', target, {"ok": "NO_VALUE!"});
  console.log('flag4: ', value4, target);

}, 10000);

console.log('Application started');
