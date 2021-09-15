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
    if (!property) return false;
    const bucketId = this.getNormalizedNumber(property, bucketBy);
    return percentage > 0 && bucketId <= percentage;
  }

  private evaluateDistribution(
    distribution: Distribution,
    target: Target,
  ): string | undefined {
    if (!distribution) return undefined;
    let variation = '';
    for (const _var of distribution.variations) {
      variation = _var.variation;
      if (this.isEnabled(target, distribution.bucketBy, _var.weight))
        return _var.variation;
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

  private isTargetIncludedOrExcludedInSegment(
    segments: string[],
    target: Target,
  ): boolean {
    for (const segmentIdentifier of segments) {
      const segment = this.query.getSegment(segmentIdentifier);

      if (segment) {
        // Should Target be excluded - if in excluded list we return false
        if (
          this.convertApiTargetsToEvalTargets(segment.excluded).includes(target)
        ) {
          // log.debug(
          //   "Target %s excluded from segment %s via exclude list\n",
          //   target.getName(), segment.getName());
          return false;
        }

        // Should Target be included - if in included list we return true
        if (
          this.convertApiTargetsToEvalTargets(segment.included).includes(target)
        ) {
          // log.debug(
          //   "Target %s included in segment %s via include list\n",
          //   target.getName(), segment.getName());
          return true;
        }

        // Should Target be included via segment rules
        if (segment.rules && this.evaluateClauses(segment.rules, target)) {
          // log.debug(
          //   "Target %s included in segment %s via rules\n",
          //   target.getName(), segment.getName());
          return true;
        }
      }
    }
    return false;
  }

  private evaluateClause(clause: Clause, target: Target): boolean {
    if (!clause.op) {
      return false;
    }

    const operator = this.getOperator(target, clause.attribute);
    const _op = clause.op.toLowerCase();
    switch (_op) {
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

  private evaluateClauses(clauses: Clause[], target: Target): boolean {
    for (const clause of clauses) {
      if (!this.evaluateClause(clause, target)) {
        // some clause condition not met return false
        return false;
      }
    }
    // all clauses conditions passed so return true
    return true;
  }

  private evaluateRule(rule: ServingRule, target: Target): boolean {
    return this.evaluateClauses(rule.clauses, target);
  }

  private evaluateRules(
    rules: ServingRule[],
    target: Target,
  ): string | undefined {
    let identifier: string;
    for (const rule of rules) {
      // if evaluation is false just continue to next rule
      if (!this.evaluateRule(rule, target)) continue;

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
    // there is no rules return undefined
    return undefined;
  }

  private evaluateVariationMap(
    variationToTargetMap: VariationMap[],
    target: Target,
  ): string | undefined {
    if (!variationToTargetMap) return undefined;

    for (const variationMap of variationToTargetMap) {
      // find target
      const targetMap = variationMap.targets?.find(
        (elem) => elem.identifier === target.identifier,
      );
      if (targetMap) return variationMap.variation;

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

  private evaluateFlag(
    fc: FeatureConfig,
    target: Target,
  ): Variation | undefined {
    let variation = fc.offVariation;
    if (fc.state === FeatureState.On) {
      variation =
        this.evaluateVariationMap(fc.variationToTargetMap, target) ||
        this.evaluateRules(fc.rules, target) ||
        this.evaluateDistribution(fc.defaultServe.distribution, target) ||
        fc.defaultServe.variation;
    }
    return this.findVariation(fc.variations, variation);
  }

  boolVariation(
    identifier: string,
    target: Target,
    defaultValue = false,
  ): boolean {
    const fc = this.query.getFlag(identifier);
    if (fc.kind !== FeatureConfigKindEnum.Boolean) {
      return defaultValue;
    }

    const variation = this.evaluateFlag(fc, target);
    if (variation) {
      return variation.value.toLowerCase() === 'true';
    }

    return defaultValue;
  }

  stringVariation(
    identifier: string,
    target: Target,
    defaultValue = '',
  ): string {
    const fc = this.query.getFlag(identifier);
    if (fc.kind !== FeatureConfigKindEnum.String) {
      return defaultValue;
    }

    const variation = this.evaluateFlag(fc, target);
    if (variation) {
      return variation.value;
    }

    return defaultValue;
  }

  numberVariation(
    identifier: string,
    target: Target,
    defaultValue = 0,
  ): number {
    const fc = this.query.getFlag(identifier);
    if (fc.kind !== FeatureConfigKindEnum.Int) {
      return defaultValue;
    }

    const variation = this.evaluateFlag(fc, target);
    if (variation) {
      return parseFloat(variation.value);
    }

    return defaultValue;
  }

  jsonVariation(
    identifier: string,
    target: Target,
    defaultValue = {},
  ): Record<string, unknown> {
    const fc = this.query.getFlag(identifier);
    if (fc.kind !== FeatureConfigKindEnum.Json) {
      return defaultValue;
    }

    const variation = this.evaluateFlag(fc, target);
    if (variation) {
      return JSON.parse(variation.value);
    }

    return defaultValue;
  }
}
