import jwt_decode from 'jwt-decode';
import { Claims, defaultOptions, Options } from './types';
import { Configuration, DefaultApi, Target } from './openapi';
import { VERSION } from './utils';

export class CfClient {
  private api: DefaultApi;
  private sdkKey: string;
  private authToken: string;
  private environment: string;
  private configuration: Configuration;
  private options: Options;
  private cluster = '1';

  constructor(sdkKey: string, options: Options = {}) {
    this.sdkKey = sdkKey;
    this.options = { ...defaultOptions, ...options };

    this.configuration = new Configuration({
      basePath: this.options.baseUrl,
    });

    this.api = new DefaultApi(this.configuration);
    this.run();
  }

  private async authenticate(): Promise<string> {
    const response = await this.api.authenticate({
      apiKey: this.sdkKey,
    });
    this.authToken = response.data.authToken;
    this.configuration.accessToken = this.authToken;

    const decoded: Claims = jwt_decode(this.authToken);

    this.environment = decoded.environment;
    this.cluster = decoded.clusterIdentifier || '1';
    this.configuration.baseOptions = {
      headers: {
        'User-Agent': `NodeJsSDK/${VERSION}`,
      },
    };
    return this.authToken;
  }

  fetchData(): Promise<[void, void]> {
    const flags = this.api
      .getFeatureConfig(this.environment, {
        params: {
          cluster: this.cluster,
        },
      })
      .then((response) => {
        // prepare cache for storing flags
        console.log(response.data);
      })
      .catch((error: Error) => {
        console.error('Error loading flags', error);
        throw error;
      });
    const segments = this.api
      .getAllSegments(this.environment, {
        params: {
          cluster: this.cluster,
        },
      })
      .then((response) => {
        // prepare cache for storing segments
        console.log(response.data);
      })
      .catch((error: Error) => {
        console.error('Error loading segments', error);
        throw error;
      });

    return Promise.all([flags, segments]);
  }

  async run(): Promise<void> {
    await this.authenticate();
    await this.fetchData();
    if (this.options.enableStream) {
      // setup SSE client
    }
  }

  boolVariation(
    identifier: string,
    target: Target,
    defaultValue: false,
  ): boolean {
    console.log(identifier, target);
    return defaultValue;
  }
}

// need to setup example project and remove this later
const client = new CfClient('sdk key');
client.boolVariation('test', null, false);
