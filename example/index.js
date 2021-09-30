const { Client } = require('ff-nodejs-server-sdk');

const client = new Client('1c100d25-4c3f-487b-b198-3b3d01df5794');

console.log('Starting application');

setInterval(() => {
  const target = {
    identifier: 'harness',
  };
  const value = client.boolVariation('test', target, false);
  console.log('Evaluation for flag test and target: ', value, target);
}, 10000);

console.log('Application started');
