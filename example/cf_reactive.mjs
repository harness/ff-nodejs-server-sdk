import CfClient, { Event } from '@harnessio/ff-nodejs-server-sdk';

CfClient.init('1c100d25-4c3f-487b-b198-3b3d01df5794');

CfClient.on(Event.READY, () => {
  console.log('READY');
});

CfClient.on(Event.FAILED, () => {
  console.log('FAILED');
});

CfClient.on(Event.CHANGED, (identifier) => {
  console.log('Changed', identifier);
});

console.log('Starting application');

setInterval(async () => {
  const value = await CfClient.boolVariation('test', null, false);
  console.log('Evaluation for flag test and target none: ', value);
}, 10000);

console.log('Application started');
