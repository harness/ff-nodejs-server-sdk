const pkg = require('ff-nodejs-server-sdk');
const { Client } = pkg;

const client = new Client('1c100d25-4c3f-487b-b198-3b3d01df5794');

setInterval(() => {
  const target = {
    identifier: 'harness',
  };
  const value = client.boolVariation('test', target, false);
  console.log('Evaluation for flag test and target: ', value, target);
}, 10000);
