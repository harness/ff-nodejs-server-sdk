import 'dotenv/config';
import CfClient, { Event } from '@harnessio/ff-nodejs-server-sdk';

CfClient.init(process.env.SDK_KEY);

CfClient.on(Event.READY, () => {
  console.log('READY');
});

CfClient.on(Event.FAILED, (error) => {
  console.log('FAILED with err:', error);
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
