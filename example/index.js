import { CfClient } from 'ff-nodejs-server-sdk';

const client = new CfClient('1c100d25-4c3f-487b-b198-3b3d01df5794');
client.boolVariation('test', null, false);