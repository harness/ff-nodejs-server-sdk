import 'dotenv/config';
import CfClient from '@harnessio/ff-nodejs-server-sdk';

CfClient.init(process.env.SDK_KEY);

process
  .on('SIGTERM', shutdown('SIGTERM'))
  .on('SIGINT', shutdown('SIGINT'))
  .on('uncaughtException', shutdown('uncaughtException'));

setInterval(async () => {
  const value = await CfClient.boolVariation('test', null, false);
  console.log('Evaluation for flag test and target none: ', value);
}, 10000);

function shutdown(signal) {
  return (err) => {
    console.log(`${signal}...`);
    if (err) console.error(err.stack || err);
    setTimeout(() => {
      CfClient.close();
      process.exit(err ? 1 : 0);
    }, 5000).unref();
  };
}
