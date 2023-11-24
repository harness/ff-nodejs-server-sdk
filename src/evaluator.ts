import {
  CONTAINS_OPERATOR,
  ENDS_WITH_OPERATOR,
  EQUAL_OPERATOR,
  EQUAL_SENSITIVE_OPERATOR,
  GT_OPERATOR,
  IN_OPERATOR,
  ONE_HUNDRED,
  SEGMENT_MATCH_OPERATOR,
  STARTS_WITH_OPERATOR,
} from './constants';
import { Query, Target, Type } from './types';
import {
  Clause,
  Distribution,
  FeatureConfig,
  FeatureConfigKindEnum,
  FeatureState,
  ServingRule,
  Variation,
  Target as ApiTarget,
  VariationMap,
} from './openapi';
import murmurhash from 'murmurhash';
import { ConsoleLog } from './log';
import {
  debugEvalSuccess,
  warnBucketByAttributeNotFound,
  warnDefaultVariationServed,
} from './sdk_codes';

type Callback = (
  fc: FeatureConfig,
  target: Target,
  variation: Variation,
) => void;

export class Evaluator {
  private query: Query;
  private log: ConsoleLog;

  constructor(query: Query, logger: ConsoleLog) {
    this.query = query;
    this.log = logger;
  }

  private getAttrValue(target: Target, attribute: string): Type | undefined {
    return target[attribute] || target.attributes?.[attribute];
  }

  private findVariation(
    variations: Variation[],
    identifier: string,
  ): Variation | undefined {
    return variations.find(
      (value: Variation) => value.identifier === identifier,
    );
  }

  private getNormalizedNumberWithNormalizer(
    property: Type,
    bucketBy: string,
    normalizer: number,
  ): number {
    const value = [bucketBy, property].join(':');
    const hash = parseInt(murmurhash(value).toString());
    return (hash % normalizer) + 1;
  }

  private getNormalizedNumber(property: Type, bucketBy: string): number {
    return this.getNormalizedNumberWithNormalizer(
      property,
      bucketBy,
      ONE_HUNDRED,
    );
  }

  private isEnabled(
    target: Target,
    bucketBy: string,
    percentage: number,
  ): boolean {
    let property = this.getAttrValue(target, bucketBy);
    if (!property) {
      const oldBucketBy = bucketBy;
      bucketBy = 'identifier';
      property = this.getAttrValue(target, bucketBy);
      if (!property) {
        return false;
      }
      warnBucketByAttributeNotFound(
        old_bucketBy,
        property?.toString(),
        this.log,
      );
    }
    const bucketId = this.getNormalizedNumber(property, bucketBy);
    return percentage > 0 && bucketId <= percentage;
  }

  private evaluateDistribution(
    distribution: Distribution,
    target: Target,
  ): string {
    if (!distribution) {
      return undefined;
    }

    let variation = '';
    let totalPercentage = 0;
    for (const v of distribution.variations) {
      variation = v.variation;
      totalPercentage += v.weight;
      if (this.isEnabled(target, distribution.bucketBy, totalPercentage)) {
        return v.variation;
      }
    }
    return variation;
  }

  private async isTargetIncludedOrExcludedInSegment(
    segments: string[],
    target: Target,
  ): Promise<boolean> {
    for (const segmentIdentifier of segments) {
      const segment = await this.query.getSegment(segmentIdentifier);

      if (segment) {
        // Should Target be excluded - if in excluded list we return false
        if (
          segment.excluded?.find(
            (value: ApiTarget) => value.identifier === target.identifier,
          )
        ) {
          this.log.debug(
            'Target %s excluded from segment %s via exclude list\n',
            target.name,
            segment.name,
          );
          return false;
        }

        // Should Target be included - if in included list we return true
        if (
          segment.included?.find(
            (value: ApiTarget) => value.identifier === target.identifier,
          )
        ) {
          this.log.debug(
            'Target %s included in segment %s via include list\n',
            target.name,
            segment.name,
          );
          return true;
        }

        // Should Target be included via segment rules
        if (
          segment.rules &&
          (await this.evaluateClauses(segment.rules, target))
        ) {
          this.log.debug(
            'Target %s included in segment %s via rules\n',
            target.name,
            segment.name,
          );
          return true;
        }
      }
    }
    return false;
  }

  private async evaluateClause(
    clause: Clause,
    target: Target,
  ): Promise<boolean> {
    if (!clause?.op || !clause?.values?.length) {
      return false;
    }

    const attrValue = this.getAttrValue(target, clause.attribute);
    const targetAttribute = attrValue?.toString();
    if (clause.op !== SEGMENT_MATCH_OPERATOR && !targetAttribute) {
      return false;
    }

    const value = clause.values[0];

    switch (clause.op) {
      case IN_OPERATOR:
        for (const val of clause.values) {
          if (val == targetAttribute) {
            return true;
          }
        }
        return false;
      case EQUAL_OPERATOR:
        return targetAttribute.toLowerCase() == value.toLowerCase();
      case EQUAL_SENSITIVE_OPERATOR:
        return targetAttribute == value;
      case GT_OPERATOR:
        return targetAttribute > value;
      case STARTS_WITH_OPERATOR:
        return targetAttribute.startsWith(value);
      case ENDS_WITH_OPERATOR:
        return targetAttribute.endsWith(value);
      case CONTAINS_OPERATOR:
        return targetAttribute.includes(value);
      case SEGMENT_MATCH_OPERATOR:
        return await this.isTargetIncludedOrExcludedInSegment(
          clause.values,
          target,
        );
    }
    return false;
  }

  private async evaluateClauses(
    clauses: Clause[],
    target: Target,
  ): Promise<boolean> {
    for (const clause of clauses) {
      if (await this.evaluateClause(clause, target)) {
        // If any clause returns true we return - rules being treated as OR rather than AND
        return true;
      }
    }
    // all clauses conditions failed so return false
    return false;
  }

  private evaluateRule(rule: ServingRule, target: Target): Promise<boolean> {
    return this.evaluateClauses(rule.clauses, target);
  }

  private async evaluateRules(
    rules: ServingRule[],
    target: Target,
  ): Promise<string | undefined> {
    if (!target || !rules) {
      return undefined;
    }

    rules.sort((a: ServingRule, b: ServingRule) =>
      a.priority > b.priority ? 1 : -1,
    );

    let identifier: string;
    for (const rule of rules) {
      // if evaluation is false just continue to next rule
      if (!(await this.evaluateRule(rule, target))) {
        continue;
      }

      // rule matched, check if there is distribution
      if (rule.serve.distribution) {
        identifier = this.evaluateDistribution(rule.serve.distribution, target);
      }

      // rule matched, here must be variation if distribution is undefined or null
      if (rule.serve.variation) {
        identifier = rule.serve.variation;
      }

      // evaluation succeded, find variation in flag
      return identifier;
    }
    return undefined;
  }

  private async evaluateVariationMap(
    variationToTargetMap: VariationMap[],
    target: Target,
  ): Promise<string | undefined> {
    if (!target || !variationToTargetMap) {
      return undefined;
    }

    for (const variationMap of variationToTargetMap) {
      // find target
      const targetMap = variationMap.targets?.find(
        (elem) => elem.identifier === target.identifier,
      );
      if (targetMap) {
        return variationMap.variation;
      }

      // find target in segment
      const segmentIdentifiers = variationMap.targetSegments;
      if (
        segmentIdentifiers &&
        (await this.isTargetIncludedOrExcludedInSegment(
          segmentIdentifiers,
          target,
        ))
      ) {
        return variationMap.variation;
      }
    }

    return undefined;
  }

  private async evaluateFlag(
    fc: FeatureConfig,
    target: Target,
  ): Promise<Variation | undefined> {
    let variation = fc.offVariation;
    if (fc.state === FeatureState.On) {
      variation =
        (await this.evaluateVariationMap(fc.variationToTargetMap, target)) ||
        (await this.evaluateRules(fc.rules, target)) ||
        this.evaluateDistribution(fc.defaultServe.distribution, target) ||
        fc.defaultServe.variation;
    }
    return this.findVariation(fc.variations, variation);
  }

  private async checkPreRequisite(
    parent: FeatureConfig,
    target: Target,
  ): Promise<boolean> {
    if (parent.prerequisites) {
      this.log.info(
        'Checking pre requisites %s of parent feature %s',
        parent.prerequisites,
        parent.feature,
      );

      for (const pqs of parent.prerequisites) {
        const preReqFeatureConfig = await this.query.getFlag(pqs.feature);
        if (!preReqFeatureConfig) {
          this.log.warn(
            'Could not retrieve the pre requisite details of feature flag: %s',
            parent.feature,
          );
          return true;
        }

        // Pre requisite variation value evaluated below
        const variation = await this.evaluateFlag(preReqFeatureConfig, target);
        this.log.info(
          'Pre requisite flag %s has variation %s for target %s',
          preReqFeatureConfig.feature,
          variation,
          target,
        );

        // Compare if the pre requisite variation is a possible valid value of
        // the pre requisite FF
        this.log.info(
          'Pre requisite flag %s should have the variations %s',
          preReqFeatureConfig.feature,
          pqs.variations,
        );

        if (!pqs.variations.includes(variation.identifier)) {
          return false;
        } else {
          return await this.checkPreRequisite(preReqFeatureConfig, target);
        }
      }
    }
    return true;
  }

  private async evaluate(
    identifier: string,
    target: Target,
    expected: FeatureConfigKindEnum,
    callback?: Callback,
  ): Promise<Variation | undefined> {
    const fc = await this.query.getFlag(identifier);
    if (!fc || fc.kind !== expected) {
      return undefined;
    }
    if (fc.prerequisites) {
      const prereq = await this.checkPreRequisite(fc, target);
      if (!prereq) {
        return this.findVariation(fc.variations, fc.offVariation);
      }
    }

    const variation = await this.evaluateFlag(fc, target);
    if (variation) {
      if (callback) {
        callback(fc, target, variation);
      }
      return variation;
    }

    return undefined;
  }

  async boolVariation(
    identifier: string,
    target: Target,
    defaultValue = false,
    callback?: Callback,
  ): Promise<boolean> {
    const variation = await this.evaluate(
      identifier,
      target,
      FeatureConfigKindEnum.Boolean,
      callback,
    );
    if (variation) {
      const result = variation.value.toLowerCase() === 'true';
      debugEvalSuccess(`${result}`, identifier, target, this.log);
      return result;
    }
    warnDefaultVariationServed(
      identifier,
      target,
      defaultValue.toString(),
      this.log,
    );
    return defaultValue;
  }

  async stringVariation(
    identifier: string,
    target: Target,
    defaultValue = '',
    callback?: Callback,
  ): Promise<string> {
    const variation = await this.evaluate(
      identifier,
      target,
      FeatureConfigKindEnum.String,
      callback,
    );
    if (variation) {
      debugEvalSuccess(`${variation.value}`, identifier, target, this.log);
      return variation.value;
    }
    warnDefaultVariationServed(
      identifier,
      target,
      defaultValue.toString(),
      this.log,
    );
    return defaultValue;
  }

  async numberVariation(
    identifier: string,
    target: Target,
    defaultValue = 0,
    callback?: Callback,
  ): Promise<number> {
    const variation = await this.evaluate(
      identifier,
      target,
      FeatureConfigKindEnum.Int,
      callback,
    );
    if (variation) {
      const result = parseFloat(variation.value);
      debugEvalSuccess(`${result}`, identifier, target, this.log);
      return result;
    }
    warnDefaultVariationServed(
      identifier,
      target,
      defaultValue.toString(),
      this.log,
    );
    return defaultValue;
  }

  async jsonVariation(
    identifier: string,
    target: Target,
    defaultValue = {},
    callback?: Callback,
  ): Promise<Record<string, unknown>> {
    const variation = await this.evaluate(
      identifier,
      target,
      FeatureConfigKindEnum.Json,
      callback,
    );
    if (variation) {
      debugEvalSuccess(`${variation.value}`, identifier, target, this.log);
      return JSON.parse(variation.value);
    }
    warnDefaultVariationServed(
      identifier,
      target,
      defaultValue.toString(),
      this.log,
    );
    return defaultValue;
  }
}
