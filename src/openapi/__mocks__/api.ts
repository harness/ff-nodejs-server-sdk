import { AxiosResponse } from 'axios';
import { BaseAPI } from '../base';

/**
 *
 * @export
 * @interface AuthenticationRequest
 */
export interface AuthenticationRequest {
  /**
   *
   * @type {string}
   * @memberof AuthenticationRequest
   */
  apiKey: string;
  /**
   *
   * @type {AuthenticationRequestTarget}
   * @memberof AuthenticationRequest
   */
  target?: AuthenticationRequestTarget;
}
/**
 *
 * @export
 * @interface AuthenticationRequestTarget
 */
export interface AuthenticationRequestTarget {
  /**
   *
   * @type {string}
   * @memberof AuthenticationRequestTarget
   */
  identifier: string;
  /**
   *
   * @type {string}
   * @memberof AuthenticationRequestTarget
   */
  name?: string;
  /**
   *
   * @type {boolean}
   * @memberof AuthenticationRequestTarget
   */
  anonymous?: boolean;
  /**
   *
   * @type {object}
   * @memberof AuthenticationRequestTarget
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  attributes?: object;
}
/**
 *
 * @export
 * @interface AuthenticationResponse
 */
export interface AuthenticationResponse {
  /**
   *
   * @type {string}
   * @memberof AuthenticationResponse
   */
  authToken: string;
}
/**
 *
 * @export
 * @interface Clause
 */
export interface Clause {
  /**
   *
   * @type {string}
   * @memberof Clause
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof Clause
   */
  attribute: string;
  /**
   *
   * @type {string}
   * @memberof Clause
   */
  op: string;
  /**
   *
   * @type {Array<string>}
   * @memberof Clause
   */
  values: Array<string>;
  /**
   *
   * @type {boolean}
   * @memberof Clause
   */
  negate: boolean;
}
/**
 *
 * @export
 * @interface Distribution
 */
export interface Distribution {
  /**
   *
   * @type {string}
   * @memberof Distribution
   */
  bucketBy: string;
  /**
   *
   * @type {Array<WeightedVariation>}
   * @memberof Distribution
   */
  variations: Array<WeightedVariation>;
}
/**
 *
 * @export
 * @interface Evaluation
 */
export interface Evaluation {
  /**
   *
   * @type {string}
   * @memberof Evaluation
   */
  flag: string;
  /**
   *
   * @type {string}
   * @memberof Evaluation
   */
  value: string;
  /**
   *
   * @type {string}
   * @memberof Evaluation
   */
  kind: string;
  /**
   *
   * @type {string}
   * @memberof Evaluation
   */
  identifier?: string;
}
/**
 *
 * @export
 * @interface FeatureConfig
 */
export interface FeatureConfig {
  /**
   *
   * @type {string}
   * @memberof FeatureConfig
   */
  project: string;
  /**
   *
   * @type {string}
   * @memberof FeatureConfig
   */
  environment: string;
  /**
   *
   * @type {string}
   * @memberof FeatureConfig
   */
  feature: string;
  /**
   *
   * @type {FeatureState}
   * @memberof FeatureConfig
   */
  state: FeatureState;
  /**
   *
   * @type {string}
   * @memberof FeatureConfig
   */
  kind: FeatureConfigKindEnum;
  /**
   *
   * @type {Array<Variation>}
   * @memberof FeatureConfig
   */
  variations: Array<Variation>;
  /**
   *
   * @type {Array<ServingRule>}
   * @memberof FeatureConfig
   */
  rules?: Array<ServingRule>;
  /**
   *
   * @type {Serve}
   * @memberof FeatureConfig
   */
  defaultServe: Serve;
  /**
   *
   * @type {string}
   * @memberof FeatureConfig
   */
  offVariation: string;
  /**
   *
   * @type {Array<Prerequisite>}
   * @memberof FeatureConfig
   */
  prerequisites?: Array<Prerequisite>;
  /**
   *
   * @type {Array<VariationMap>}
   * @memberof FeatureConfig
   */
  variationToTargetMap?: Array<VariationMap>;
  /**
   *
   * @type {number}
   * @memberof FeatureConfig
   */
  version?: number;
}

/**
 * @export
 * @enum {string}
 */
export enum FeatureConfigKindEnum {
  Boolean = 'boolean',
  Int = 'int',
  String = 'string',
  Json = 'json',
}

/**
 *
 * @export
 * @enum {string}
 */

export enum FeatureState {
  On = 'on',
  Off = 'off',
}

/**
 *
 * @export
 * @interface KeyValue
 */
export interface KeyValue {
  /**
   *
   * @type {string}
   * @memberof KeyValue
   */
  key: string;
  /**
   *
   * @type {string}
   * @memberof KeyValue
   */
  value: string;
}
/**
 *
 * @export
 * @interface Metrics
 */
export interface Metrics {
  /**
   *
   * @type {Array<TargetData>}
   * @memberof Metrics
   */
  targetData?: Array<TargetData>;
  /**
   *
   * @type {Array<MetricsData>}
   * @memberof Metrics
   */
  metricsData?: Array<MetricsData>;
}
/**
 *
 * @export
 * @interface MetricsData
 */
export interface MetricsData {
  /**
   * time at when this data was recorded
   * @type {number}
   * @memberof MetricsData
   */
  timestamp: number;
  /**
   *
   * @type {number}
   * @memberof MetricsData
   */
  count: number;
  /**
   * This can be of type FeatureMetrics
   * @type {string}
   * @memberof MetricsData
   */
  metricsType: MetricsDataMetricsTypeEnum;
  /**
   *
   * @type {Array<KeyValue>}
   * @memberof MetricsData
   */
  attributes: Array<KeyValue>;
}

/**
 * @export
 * @enum {string}
 */
export enum MetricsDataMetricsTypeEnum {
  Ffmetrics = 'FFMETRICS',
}

/**
 *
 * @export
 * @interface ModelError
 */
export interface ModelError {
  /**
   *
   * @type {string}
   * @memberof ModelError
   */
  code: string;
  /**
   *
   * @type {string}
   * @memberof ModelError
   */
  message: string;
}
/**
 *
 * @export
 * @interface Pagination
 */
export interface Pagination {
  /**
   *
   * @type {number}
   * @memberof Pagination
   */
  version?: number;
  /**
   *
   * @type {number}
   * @memberof Pagination
   */
  pageCount: number;
  /**
   *
   * @type {number}
   * @memberof Pagination
   */
  itemCount: number;
  /**
   *
   * @type {number}
   * @memberof Pagination
   */
  pageSize: number;
  /**
   *
   * @type {number}
   * @memberof Pagination
   */
  pageIndex: number;
}
/**
 *
 * @export
 * @interface Prerequisite
 */
export interface Prerequisite {
  /**
   *
   * @type {string}
   * @memberof Prerequisite
   */
  feature: string;
  /**
   *
   * @type {Array<string>}
   * @memberof Prerequisite
   */
  variations: Array<string>;
}
/**
 *
 * @export
 * @interface Segment
 */
export interface Segment {
  /**
   * Unique identifier for the segment.
   * @type {string}
   * @memberof Segment
   */
  identifier: string;
  /**
   * Name of the segment.
   * @type {string}
   * @memberof Segment
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof Segment
   */
  environment?: string;
  /**
   *
   * @type {Array<Tag>}
   * @memberof Segment
   */
  tags?: Array<Tag>;
  /**
   *
   * @type {Array<Target>}
   * @memberof Segment
   */
  included?: Array<Target>;
  /**
   *
   * @type {Array<Target>}
   * @memberof Segment
   */
  excluded?: Array<Target>;
  /**
   * An array of rules that can cause a user to be included in this segment.
   * @type {Array<Clause>}
   * @memberof Segment
   */
  rules?: Array<Clause>;
  /**
   *
   * @type {number}
   * @memberof Segment
   */
  createdAt?: number;
  /**
   *
   * @type {number}
   * @memberof Segment
   */
  modifiedAt?: number;
  /**
   *
   * @type {number}
   * @memberof Segment
   */
  version?: number;
}
/**
 *
 * @export
 * @interface Serve
 */
export interface Serve {
  /**
   *
   * @type {Distribution}
   * @memberof Serve
   */
  distribution?: Distribution;
  /**
   *
   * @type {string}
   * @memberof Serve
   */
  variation?: string;
}
/**
 *
 * @export
 * @interface ServingRule
 */
export interface ServingRule {
  /**
   *
   * @type {string}
   * @memberof ServingRule
   */
  ruleId: string;
  /**
   *
   * @type {number}
   * @memberof ServingRule
   */
  priority: number;
  /**
   *
   * @type {Array<Clause>}
   * @memberof ServingRule
   */
  clauses: Array<Clause>;
  /**
   *
   * @type {Serve}
   * @memberof ServingRule
   */
  serve: Serve;
}
/**
 * A name and value pair.
 * @export
 * @interface Tag
 */
export interface Tag {
  /**
   *
   * @type {string}
   * @memberof Tag
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof Tag
   */
  value?: string;
}
/**
 *
 * @export
 * @interface Target
 */
export interface Target {
  /**
   *
   * @type {string}
   * @memberof Target
   */
  identifier: string;
  /**
   *
   * @type {string}
   * @memberof Target
   */
  account: string;
  /**
   *
   * @type {string}
   * @memberof Target
   */
  org: string;
  /**
   *
   * @type {string}
   * @memberof Target
   */
  environment: string;
  /**
   *
   * @type {string}
   * @memberof Target
   */
  project: string;
  /**
   *
   * @type {string}
   * @memberof Target
   */
  name: string;
  /**
   *
   * @type {boolean}
   * @memberof Target
   */
  anonymous?: boolean;
  /**
   *
   * @type {object}
   * @memberof Target
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  attributes?: object;
  /**
   *
   * @type {number}
   * @memberof Target
   */
  createdAt?: number;
  /**
   *
   * @type {Array<Segment>}
   * @memberof Target
   */
  segments?: Array<Segment>;
}
/**
 *
 * @export
 * @interface TargetData
 */
export interface TargetData {
  /**
   *
   * @type {string}
   * @memberof TargetData
   */
  identifier: string;
  /**
   *
   * @type {string}
   * @memberof TargetData
   */
  name: string;
  /**
   *
   * @type {Array<KeyValue>}
   * @memberof TargetData
   */
  attributes: Array<KeyValue>;
}
/**
 *
 * @export
 * @interface TargetMap
 */
export interface TargetMap {
  /**
   *
   * @type {string}
   * @memberof TargetMap
   */
  identifier?: string;
  /**
   *
   * @type {string}
   * @memberof TargetMap
   */
  name: string;
}
/**
 *
 * @export
 * @interface Variation
 */
export interface Variation {
  /**
   *
   * @type {string}
   * @memberof Variation
   */
  identifier: string;
  /**
   *
   * @type {string}
   * @memberof Variation
   */
  value: string;
  /**
   *
   * @type {string}
   * @memberof Variation
   */
  name?: string;
  /**
   *
   * @type {string}
   * @memberof Variation
   */
  description?: string;
}
/**
 *
 * @export
 * @interface VariationMap
 */
export interface VariationMap {
  /**
   *
   * @type {string}
   * @memberof VariationMap
   */
  variation: string;
  /**
   *
   * @type {Array<TargetMap>}
   * @memberof VariationMap
   */
  targets?: Array<TargetMap>;
  /**
   *
   * @type {Array<string>}
   * @memberof VariationMap
   */
  targetSegments?: Array<string>;
}
/**
 *
 * @export
 * @interface WeightedVariation
 */
export interface WeightedVariation {
  /**
   *
   * @type {string}
   * @memberof WeightedVariation
   */
  variation: string;
  /**
   *
   * @type {number}
   * @memberof WeightedVariation
   */
  weight: number;
}

export class ClientApi extends BaseAPI {
  public async authenticate(
    _request?: AuthenticationRequest,
    _options?: any,
  ): Promise<AxiosResponse<AuthenticationResponse>> {
    return {
      data: {
        authToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnZpcm9ubWVudCI6Ijc4NTlmOGVlLWYyNGQtNDcxZC05NGQ0LTc5ZWFiZGU4Mjc5YSIsImVudmlyb25tZW50SWRlbnRpZmllciI6ImRldiIsInByb2plY3QiOiJkZW1vIiwicHJvamVjdElkZW50aWZpZXIiOiJkZW1vIiwiYWNjb3VudElEIjoiSGFybmVzcyBhY2NvdW50Iiwib3JnYW5pemF0aW9uIjoiSGFybmVzcyIsIm9yZ2FuaXphdGlvbklkZW50aWZpZXIiOiJoYXJuZXNzIiwiY2x1c3RlcklkZW50aWZpZXIiOiJjbHVzdGVyIiwia2V5X3R5cGUiOiJTZXJ2ZXIifQ.tQluqIxGl0N5NO_Tz26j3I1Yjb3-B3TxalBK0byjuk4',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async getAllSegments(
    _env: string,
    _cluster?: string,
    _options?: any,
  ): Promise<AxiosResponse<Segment[]>> {
    return {
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async getEvaluationByIdentifier(
    _env: string,
    _feature: string,
    _target: string,
    _cluster?: string,
    _options?: any,
  ): Promise<AxiosResponse<Evaluation>> {
    return {
      data: {
        flag: 'bool-flag',
        value: 'true',
        kind: 'boolean',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async getEvaluations(
    _env: string,
    _target: string,
    _cluster?: string,
    _options?: any,
    // eslint-disable-next-line @typescript-eslint/ban-types
  ): Promise<AxiosResponse<Pagination & object>> {
    return {
      data: {
        pageCount: 0,
        itemCount: 0,
        pageSize: 0,
        pageIndex: 0,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async getFeatureConfig(
    _env: string,
    _cluster?: string,
    _options?: any,
  ): Promise<AxiosResponse<FeatureConfig[]>> {
    return {
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async getFeatureConfigByIdentifier(
    _identifier: string,
    _environmentUUID: string,
    _cluster?: string,
    _options?: any,
  ): Promise<AxiosResponse<FeatureConfig>> {
    return {
      data: {
        project: 'test',
        environment: 'dev',
        feature: 'bool-flag',
        state: FeatureState.On,
        kind: FeatureConfigKindEnum.Boolean,
        variations: [],
        defaultServe: {
          variation: 'on',
        },
        offVariation: 'off',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async getSegmentByIdentifier(
    _identifier: string,
    _env: string,
    _cluster?: string,
    _options?: any,
  ): Promise<AxiosResponse<Segment>> {
    return {
      data: {
        identifier: 'beta',
        name: 'Beta',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };
  }

  public async stream(
    _aPIKey: string,
    _cluster?: string,
    _options?: any,
  ): Promise<void> {
    return undefined;
  }
}
