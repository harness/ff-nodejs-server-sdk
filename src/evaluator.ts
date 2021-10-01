import {
  defaultOptions,
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
import { Operator, Query, Target, Type } from './types';
import { Bool } from './boolean';
import { Json } from './json';
import { Num } from './number';
import { Str } from './string';
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

type Callback = (
  fc: FeatureConfig,
  target: Target,
  variation: Variation,
) => void;

const log = defaultOptions.logger;

export class Evaluator {
  private query: Query;

  constructor(query: Query) {
    this.query = query;
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
    const property = this.getAttrValue(target, bucketBy);
    if (!property) {
      return false;
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
    for (const _var of distribution.variations) {
      variation = _var.variation;
      if (this.isEnabled(target, distribution.bucketBy, _var.weight)) {
        return _var.variation;
      }
    }
    return variation;
  }

  private getOperator(target: Target, attribute: string): Operator | undefined {
    const value = this.getAttrValue(target, attribute);
    switch (typeof value) {
      case 'boolean':
        return new Bool(value as boolean);
      case 'string':
        return new Str(value as string);
      case 'number':
        return new Num(value as number);
      case 'object':
        return new Json();
    }
  }

  private convertApiTargetsToEvalTargets(targets: ApiTarget[]): Target[] {
    return targets.map(
      (elem) =>
        ({
          identifier: elem.identifier,
          name: elem.name,
          anonymous: elem.anonymous,
          attributes: elem.attributes,
        } as Target),
    );
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
          this.convertApiTargetsToEvalTargets(segment.excluded).includes(target)
        ) {
          log.debug(
            'Target %s excluded from segment %s via exclude list\n',
            target.name,
            segment.name,
          );
          return false;
        }

        // Should Target be included - if in included list we return true
        if (
          this.convertApiTargetsToEvalTargets(segment.included).includes(target)
        ) {
          log.debug(
            'Target %s included in segment %s via include list\n',
            target.name,
            segment.name,
          );
          return true;
        }

        // Should Target be included via segment rules
        if (segment.rules && this.evaluateClauses(segment.rules, target)) {
          log.debug(
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

  private async evaluateClause(clause: Clause, target: Target): Promise<boolean> {
    if (!clause.op) {
      return false;
    }

    const operator = this.getOperator(target, clause.attribute);
    switch (clause.op) {
      case IN_OPERATOR:
        return operator.inList(clause.values);
      case EQUAL_OPERATOR:
        return operator.equal(clause.values);
      case EQUAL_SENSITIVE_OPERATOR:
        return operator.equalSensitive(clause.values);
      case GT_OPERATOR:
        return operator.greaterThan(clause.values);
      case STARTS_WITH_OPERATOR:
        return operator.startsWith(clause.values);
      case ENDS_WITH_OPERATOR:
        return operator.endsWith(clause.values);
      case CONTAINS_OPERATOR:
        return operator.contains(clause.values);
      case SEGMENT_MATCH_OPERATOR:
        return this.isTargetIncludedOrExcludedInSegment(clause.values, target);
    }
    return false;
  }

  private async evaluateClauses(clauses: Clause[], target: Target): Promise<boolean> {
    for (const clause of clauses) {
      if (!await this.evaluateClause(clause, target)) {
        // some clause condition not met return false
        return false;
      }
    }
    // all clauses conditions passed so return true
    return true;
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
      if (!await this.evaluateRule(rule, target)) {
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

  private evaluateVariationMap(
    variationToTargetMap: VariationMap[],
    target: Target,
  ): string | undefined {
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
        this.isTargetIncludedOrExcludedInSegment(segmentIdentifiers, target)
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
        this.evaluateVariationMap(fc.variationToTargetMap, target) ||
        await this.evaluateRules(fc.rules, target) ||
        this.evaluateDistribution(fc.defaultServe.distribution, target) ||
        fc.defaultServe.variation;
    }
    return this.findVariation(fc.variations, variation);
  }

  private async checkPreRequisite(parent: FeatureConfig, target: Target): Promise<boolean> {
    if (parent.prerequisites) {
      log.info(
        'Checking pre requisites %s of parent feature %s',
        parent.prerequisites,
        parent.feature,
      );

      for (const pqs of parent.prerequisites) {
        const preReqFeatureConfig = await this.query.getFlag(pqs.feature);
        if (!preReqFeatureConfig) {
          log.warn(
            'Could not retrieve the pre requisite details of feature flag: %s',
            parent.feature,
          );
          return true;
        }

        // Pre requisite variation value evaluated below
        const variation = await this.evaluateFlag(preReqFeatureConfig, target);
        log.info(
          'Pre requisite flag %s has variation %s for target %s',
          preReqFeatureConfig.feature,
          variation,
          target,
        );

        // Compare if the pre requisite variation is a possible valid value of
        // the pre requisite FF
        log.info(
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
      return variation.value.toLowerCase() === 'true';
    }

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
      return variation.value;
    }

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
      return parseFloat(variation.value);
    }

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
      return JSON.parse(variation.value);
    }

    return defaultValue;
  }
}
