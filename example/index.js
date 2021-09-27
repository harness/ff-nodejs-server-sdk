import CfClient, { Client } from 'ff-nodejs-server-sdk';

CfClient.init('1c100d25-4c3f-487b-b198-3b3d01df5794');

setInterval(() => {
    const value = CfClient.boolVariation('test', null, false);
    console.log("Evaluation for flag test and target none: ", value);
}, 10000);