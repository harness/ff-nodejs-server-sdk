const { Client, Event } = require('@harnessio/ff-nodejs-server-sdk');

const client = new Client('1c100d25-4c3f-487b-b198-3b3d01df5794', {
  enableStream: false,
});

client.on(Event.READY, () => {
  console.log('READY');
});

client.on(Event.FAILED, () => {
  console.log('FAILED');
});

client.on(Event.CHANGED, (identifier) => {
  if (identifier === 'test') {
    console.log('test flag changed');
  }
});

console.log('Starting application');

setInterval(async () => {
  const target = {
    identifier: 'harness',
  };
  const value = await client.boolVariation('test', target, false);
  console.log('Evaluation for flag test and target: ', value, target);
}, 10000);

console.log('Application started');
