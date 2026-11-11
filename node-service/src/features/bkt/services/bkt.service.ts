import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse';
import { createReadStream } from 'node:fs';
import {
  BktAnswer,
  BktParameters,
  BktPrediction,
  BktTrainingResult,
  ExpectationResult,
  ForwardResult,
} from '../bkt.interfaces';
import { writeFile } from 'node:fs/promises';

import { join, parse as parsePath } from 'node:path';

@Injectable()
export class BktService {
  //==============test ====================
  async trainFromCsv(): Promise<{
    models: BktTrainingResult[];
    predictionsFilePath: string;
    metricsFilePath: string;
  }> {
    const inputFilePath = 'D:/Hard/KLTN/csv/assistments_2009_2010.csv';

    const answers = await this.readStream(inputFilePath);

    if (answers.length === 0) {
      throw new Error('No valid answers found in the CSV.');
    }

    const models = this.train(
      answers,
      {
        prior: 0.2,
        learns: 0.1,
        guesses: 0.2,
        slips: 0.1,
      },
      100,
      1e-6,
    );

    const predictions = this.predictAll(answers, models);

    const predictionsBySkill = new Map<string, BktPrediction[]>();

    for (const prediction of predictions) {
      let skillPredictions = predictionsBySkill.get(prediction.skillName);

      if (!skillPredictions) {
        skillPredictions = [];
        predictionsBySkill.set(prediction.skillName, skillPredictions);
      }

      skillPredictions.push(prediction);
    }

    const metricsBySkill = [...predictionsBySkill].map(
      ([skillName, skillPredictions]) => ({
        skillName,
        metrics: this.evaluatePredictions(skillPredictions),
      }),
    );

    const predictionsFilePath = await this.exportCSV(
      inputFilePath,
      predictions,
    );

    const metricsFilePath = await this.exportMetricsCSV(
      inputFilePath,
      metricsBySkill,
    );

    return {
      models,
      predictionsFilePath,
      metricsFilePath,
    };
  }

  async exportMetricsCSV(
    inputFilePath: string,
    metricsBySkill: {
      skillName: string;
      metrics: ReturnType<BktService['evaluatePredictions']>;
    }[],
  ): Promise<string> {
    const { dir, name } = parsePath(inputFilePath);
    const outputFilePath = join(dir, `${name}_metrics_by_skill.csv`);

    const rows = metricsBySkill.map(({ skillName, metrics }) =>
      [
        `"${skillName.replace(/"/g, '""')}"`,
        metrics.count,
        metrics.auc ?? '',
        metrics.logLoss,
        metrics.accuracy,
      ].join(','),
    );

    const csv = ['skillName,count,auc,logLoss,accuracy', ...rows].join('\r\n');

    await writeFile(outputFilePath, '\uFEFF' + csv + '\r\n', 'utf8');

    return outputFilePath;
  }
  //======================Raw CSV
  async exportCSV(
    inputFilePath: string,
    predictions: BktPrediction[],
  ): Promise<string> {
    const { dir, name } = parsePath(inputFilePath);
    const outputFilePath = join(dir, `${name}_predictions.csv`);

    const headers: (keyof BktPrediction)[] = [
      'userId',
      'skillName',
      'orderId',
      'correct',
      'masteryBefore',
      'predictedCorrect',
      'masteryAfterAnswer',
      'masteryAfterLearning',
    ];

    const escapeCell = (value: string | number): string => {
      const text = String(value);

      return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const rows = predictions.map((prediction) =>
      headers.map((header) => escapeCell(prediction[header])).join(','),
    );

    const csv = [headers.join(','), ...rows].join('\r\n');

    // UTF-8 BOM helps Excel display skill names correctly.
    await writeFile(outputFilePath, '\uFEFF' + csv + '\r\n', 'utf8');

    return outputFilePath;
  }

  async readStream(filePath: string): Promise<BktAnswer[]> {
    const parser = createReadStream(filePath, 'utf8').pipe(
      parse({
        columns: true,
        bom: true,
        skip_empty_lines: true,
        trim: true,
      }),
    );

    const answers: BktAnswer[] = [];

    let recordNumber = 0;
    let skippedWithoutSkill = 0;
    let skippedMissingCorrect = 0;
    let convertedFractionalScores = 0;

    for await (const row of parser) {
      recordNumber++;

      const userId = row.user_id?.trim();
      const skillName = row.list_skills?.trim();
      const orderText = row.order_id?.trim();
      const correctText = row.correct?.trim();
      const listSkill = row.list_skill_ids.toString().trim();

      if (!skillName || listSkill !== '50') {
        skippedWithoutSkill++;
        continue;
      }

      if (!userId || !orderText) {
        throw new Error(`Record ${recordNumber}: missing user_id or order_id`);
      }

      const orderId = Number(orderText);

      if (!Number.isSafeInteger(orderId)) {
        throw new Error(
          `Record ${recordNumber}: invalid order_id=${JSON.stringify(orderText)}`,
        );
      }

      // Check before Number(), because Number('') equals 0.
      if (correctText === undefined || correctText === '') {
        skippedMissingCorrect++;
        continue;
      }

      const score = Number(correctText);

      if (!Number.isFinite(score) || score < 0 || score > 1) {
        throw new Error(
          `Record ${recordNumber}: invalid correct=${JSON.stringify(correctText)}`,
        );
      }

      if (score !== 0 && score !== 1) {
        convertedFractionalScores++;
      }

      const correct: 0 | 1 = score >= 0.5 ? 1 : 0;

      answers.push({
        userId,
        skillName,
        orderId,
        correct,
      });
    }

    console.log({
      totalRecords: recordNumber,
      acceptedRecords: answers.length,
      skippedWithoutSkill,
      skippedMissingCorrect,
      convertedFractionalScores,
    });

    return answers.sort((a, b) => a.orderId - b.orderId);
  }

  //================Train================
  train(
    answers: BktAnswer[],
    initial: BktParameters,
    maxIterations = 100,
    tolerance = 1e-6,
  ): BktTrainingResult[] {
    const skills = this.groupAnswers(answers);
    const results: BktTrainingResult[] = [];

    for (const [skillName, learners] of skills) {
      const sequences = [...learners.values()].map((sequence) =>
        sequence.map((answer) => answer.correct),
      );

      const fitted = this.fitSkill(
        sequences,
        initial,
        maxIterations,
        tolerance,
      );

      results.push({
        skillName,
        ...fitted,
      });
    }

    return results;
  }

  private fitSkill(
    sequences: (0 | 1)[][],
    initial: BktParameters,
    maxIterations: number,
    tolerance: number,
  ): Omit<BktTrainingResult, 'skillName'> {
    if (
      sequences.length === 0 ||
      sequences.some((answers) => answers.length === 0)
    ) {
      throw new Error('Training requires non-empty answer sequences.');
    }

    if (!Number.isInteger(maxIterations) || maxIterations < 1) {
      throw new Error('maxIterations must be a positive integer.');
    }

    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error('tolerance must be finite and non-negative.');
    }

    for (const [name, value] of Object.entries(initial)) {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error(`${name} must be between 0 and 1.`);
      }
    }

    let params: BktParameters = { ...initial };

    // Evaluate the initial parameters.
    let forwardResults = sequences.map((answers) =>
      this.forward(answers, params),
    );

    let logLikelihood = forwardResults.reduce(
      (sum, result) => sum + result.logLikelihood,
      0,
    );

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      // E-step: every learner uses the same current parameters.
      const expectations = sequences.map((answers, index) => {
        const forwardResult = forwardResults[index];

        const beta = this.backward(answers, params, forwardResult.scales);

        return this.expectation(answers, params, forwardResult, beta);
      });

      // M-step: combine all learners' expected counts.
      const nextParams = this.maximization(sequences, expectations, params);

      // Evaluate the updated parameters.
      const nextForwardResults = sequences.map((answers) =>
        this.forward(answers, nextParams),
      );

      const nextLogLikelihood = nextForwardResults.reduce(
        (sum, result) => sum + result.logLikelihood,
        0,
      );

      const change = nextLogLikelihood - logLikelihood;

      params = nextParams;
      forwardResults = nextForwardResults;
      logLikelihood = nextLogLikelihood;

      if (Math.abs(change) <= tolerance || iteration === maxIterations) {
        return {
          parameters: params,
          logLikelihood,
          iterations: iteration,
        };
      }
    }

    throw new Error('Training ended unexpectedly.');
  }

  private groupAnswers(
    answers: BktAnswer[],
  ): Map<string, Map<string, BktAnswer[]>> {
    const skills = new Map<string, Map<string, BktAnswer[]>>();

    for (const answer of answers) {
      if (!skills.has(answer.skillName)) {
        skills.set(answer.skillName, new Map());
      }

      const learners = skills.get(answer.skillName)!;

      if (!learners.has(answer.userId)) {
        learners.set(answer.userId, []);
      }

      learners.get(answer.userId)!.push(answer);
    }

    for (const learners of skills.values()) {
      for (const sequence of learners.values()) {
        sequence.sort((a, b) => a.orderId - b.orderId);
      }
    }

    return skills;
  }

  private emission(state: 0 | 1, answer: 0 | 1, params: BktParameters): number {
    if (state === 0) {
      return answer === 1 ? params.guesses : 1 - params.guesses;
    }

    return answer === 1 ? 1 - params.slips : params.slips;
  }

  private forward(answers: (0 | 1)[], params: BktParameters): ForwardResult {
    if (answers.length === 0) {
      throw new Error('The answer sequence cannot be empty.');
    }

    const alpha: [number, number][] = [];
    const scales: number[] = [];
    let logLikelihood = 0;

    for (let t = 0; t < answers.length; t++) {
      const b0 = this.emission(0, answers[t], params);
      const b1 = this.emission(1, answers[t], params);

      const a0 =
        t === 0
          ? (1 - params.prior) * b0
          : alpha[t - 1][0] * (1 - params.learns) * b0;

      const a1 =
        t === 0
          ? params.prior * b1
          : (alpha[t - 1][0] * params.learns + alpha[t - 1][1]) * b1;

      const scale = a0 + a1;

      if (!(scale > 0) || !Number.isFinite(scale)) {
        throw new Error(`Invalid probability at answer ${t + 1}.`);
      }

      scales.push(scale);
      alpha.push([a0 / scale, a1 / scale]);
      logLikelihood += Math.log(scale);
    }

    return { alpha, scales, logLikelihood };
  }

  private backward(
    answers: (0 | 1)[],
    params: BktParameters,
    scales: number[],
  ): [number, number][] {
    const n = answers.length;

    if (n === 0 || scales.length !== n) {
      throw new Error('Answers and scales must have the same non-zero length.');
    }

    const beta: [number, number][] = new Array(n);

    // Last answer: β₀(n) = β₁(n) = 1
    beta[n - 1] = [1, 1];

    for (let t = n - 2; t >= 0; t--) {
      const b0 = this.emission(0, answers[t + 1], params);
      const b1 = this.emission(1, answers[t + 1], params);

      beta[t] = [
        ((1 - params.learns) * b0 * beta[t + 1][0] +
          params.learns * b1 * beta[t + 1][1]) /
          scales[t + 1],

        (b1 * beta[t + 1][1]) / scales[t + 1],
      ];
    }

    return beta;
  }

  private expectation(
    answers: (0 | 1)[],
    params: BktParameters,
    forwardResult: ForwardResult,
    beta: [number, number][],
  ): ExpectationResult {
    const { alpha, scales } = forwardResult;
    const gamma: [number, number][] = [];
    const xi01: number[] = [];

    for (let t = 0; t < answers.length; t++) {
      const unmastered = alpha[t][0] * beta[t][0];
      const mastered = alpha[t][1] * beta[t][1];
      const total = unmastered + mastered;

      if (!(total > 0) || !Number.isFinite(total)) {
        throw new Error(`Invalid expectation at answer ${t + 1}.`);
      }

      gamma.push([unmastered / total, mastered / total]);

      if (t < answers.length - 1) {
        const nextMasteredEmission = this.emission(1, answers[t + 1], params);

        const transition =
          (alpha[t][0] *
            params.learns *
            nextMasteredEmission *
            beta[t + 1][1]) /
          (scales[t + 1] * total);

        xi01.push(transition);
      }
    }

    return { gamma, xi01 };
  }

  private maximization(
    sequences: (0 | 1)[][],
    expectations: ExpectationResult[],
    current: BktParameters,
  ): BktParameters {
    if (sequences.length === 0 || sequences.length !== expectations.length) {
      throw new Error(
        'Sequences and expectations must have the same non-zero length.',
      );
    }

    let priorSum = 0;

    let guessNumerator = 0;
    let guessDenominator = 0;

    let slipNumerator = 0;
    let slipDenominator = 0;

    let learnNumerator = 0;
    let learnDenominator = 0;

    for (let s = 0; s < sequences.length; s++) {
      const answers = sequences[s];
      const { gamma, xi01 } = expectations[s];

      if (
        answers.length === 0 ||
        gamma.length !== answers.length ||
        xi01.length !== answers.length - 1
      ) {
        throw new Error(`Invalid expectation lengths for sequence ${s}.`);
      }

      // π: expected initial mastery, averaged across learners.
      priorSum += gamma[0][1];

      for (let t = 0; t < answers.length; t++) {
        const [unmastered, mastered] = gamma[t];

        // G: correct answers while unmastered / all unmastered answers.
        guessNumerator += answers[t] * unmastered;
        guessDenominator += unmastered;

        // S: incorrect answers while mastered / all mastered answers.
        slipNumerator += (1 - answers[t]) * mastered;
        slipDenominator += mastered;

        // T: transitions to mastery / opportunities while unmastered.
        // The last response has no observed next-state transition.
        if (t < answers.length - 1) {
          learnNumerator += xi01[t];
          learnDenominator += unmastered;
        }
      }
    }

    return {
      prior: priorSum / sequences.length,

      guesses:
        guessDenominator > 0
          ? guessNumerator / guessDenominator
          : current.guesses,

      slips:
        slipDenominator > 0 ? slipNumerator / slipDenominator : current.slips,

      learns:
        learnDenominator > 0
          ? learnNumerator / learnDenominator
          : current.learns,
    };
  }

  //================Predict mastery and answer
  predictAll(
    answers: BktAnswer[],
    models: BktTrainingResult[],
  ): BktPrediction[] {
    const predictions: BktPrediction[] = [];

    for (const [skillName, learners] of this.groupAnswers(answers)) {
      for (const [userId, sequence] of learners) {
        const results = this.predict(sequence, models, userId, skillName);

        for (const result of results) {
          predictions.push(result);
        }
      }
    }

    return predictions.sort((a, b) => a.orderId - b.orderId);
  }
  predict(
    answers: BktAnswer[],
    models: BktTrainingResult[],
    userId: string,
    skillName: string,
  ): BktPrediction[] {
    // 3.1: Receive ordered answers and fitted parameters.
    const { sequence, parameters } = this.preparePrediction(
      answers,
      models,
      userId,
      skillName,
    );

    // 3.2: Initialize mastery before the first answer.
    let masteryBefore = this.initializeMastery(parameters);

    const predictions: BktPrediction[] = [];

    for (const answer of sequence) {
      // 3.3: Predict correctness.
      const predictedCorrect = this.predictCorrectness(
        masteryBefore,
        parameters,
      );

      // 3.4: Update mastery using the actual answer.
      const masteryAfterAnswer = this.updateMasteryAfterAnswer(
        masteryBefore,
        answer.correct,
        parameters,
      );

      // 3.5: Apply the learning transition.
      const masteryAfterLearning = this.applyLearning(
        masteryAfterAnswer,
        parameters,
      );

      // 3.6: Record this response's results.
      predictions.push({
        ...answer,
        masteryBefore,
        predictedCorrect,
        masteryAfterAnswer,
        masteryAfterLearning,
      });

      // Use the updated mastery for the next response.
      masteryBefore = masteryAfterLearning;
    }

    return predictions;
  }
  private preparePrediction(
    answers: BktAnswer[],
    models: BktTrainingResult[],
    userId: string,
    skillName: string,
  ): {
    sequence: BktAnswer[];
    parameters: BktParameters;
  } {
    const model = models.find((item) => item.skillName === skillName);

    if (!model) {
      throw new Error(`No fitted model for skill "${skillName}".`);
    }

    const sequence = answers
      .filter(
        (answer) => answer.userId === userId && answer.skillName === skillName,
      )
      .sort((a, b) => a.orderId - b.orderId);

    if (sequence.length === 0) {
      throw new Error(
        `No answers for user "${userId}" and skill "${skillName}".`,
      );
    }

    return {
      sequence,
      parameters: { ...model.parameters },
    };
  }

  private initializeMastery(parameters: BktParameters): number {
    return parameters.prior;
  }

  private predictCorrectness(
    masteryBefore: number,
    parameters: BktParameters,
  ): number {
    return (
      masteryBefore * (1 - parameters.slips) +
      (1 - masteryBefore) * parameters.guesses
    );
  }

  private updateMasteryAfterAnswer(
    masteryBefore: number,
    correct: 0 | 1,
    parameters: BktParameters,
  ): number {
    const masteredWeight =
      masteryBefore * this.emission(1, correct, parameters);

    const unmasteredWeight =
      (1 - masteryBefore) * this.emission(0, correct, parameters);

    const observedProbability = masteredWeight + unmasteredWeight;

    if (!Number.isFinite(observedProbability) || observedProbability <= 0) {
      throw new Error('The observed answer has an invalid probability.');
    }

    return masteredWeight / observedProbability;
  }

  private applyLearning(
    masteryAfterAnswer: number,
    parameters: BktParameters,
  ): number {
    return masteryAfterAnswer + (1 - masteryAfterAnswer) * parameters.learns;
  }
  //==== evaluates result

  evaluatePredictions(predictions: BktPrediction[]): {
    count: number;
    auc: number | null;
    logLoss: number;
    accuracy: number;
  } {
    if (predictions.length === 0) {
      throw new Error('No predictions to evaluate.');
    }

    const epsilon = 1e-15;
    let correctCount = 0;
    let totalLogLoss = 0;
    let positiveCount = 0;

    for (const { correct, predictedCorrect } of predictions) {
      if (correct !== 0 && correct !== 1) {
        throw new Error('Actual answers must be 0 or 1.');
      }

      if (
        !Number.isFinite(predictedCorrect) ||
        predictedCorrect < 0 ||
        predictedCorrect > 1
      ) {
        throw new Error('Predicted probabilities must be in [0, 1].');
      }

      // Accuracy uses a 0.5 classification threshold.
      const predictedAnswer = predictedCorrect >= 0.5 ? 1 : 0;

      if (predictedAnswer === correct) {
        correctCount++;
      }

      // Clip only for logarithms to avoid log(0).
      const probability = Math.min(
        1 - epsilon,
        Math.max(epsilon, predictedCorrect),
      );

      totalLogLoss -=
        correct * Math.log(probability) +
        (1 - correct) * Math.log(1 - probability);

      positiveCount += correct;
    }

    // AUC using average ranks for tied probabilities.
    const sorted = [...predictions].sort(
      (a, b) => a.predictedCorrect - b.predictedCorrect,
    );

    let positiveRankSum = 0;
    let start = 0;

    while (start < sorted.length) {
      let end = start + 1;

      while (
        end < sorted.length &&
        sorted[end].predictedCorrect === sorted[start].predictedCorrect
      ) {
        end++;
      }

      // Positions start through end - 1 have ranks start + 1 through end.
      const averageRank = (start + 1 + end) / 2;

      for (let index = start; index < end; index++) {
        positiveRankSum += sorted[index].correct * averageRank;
      }

      start = end;
    }

    const count = predictions.length;
    const negativeCount = count - positiveCount;

    const auc =
      positiveCount > 0 && negativeCount > 0
        ? (positiveRankSum - (positiveCount * (positiveCount + 1)) / 2) /
          (positiveCount * negativeCount)
        : null;

    return {
      count,
      auc,
      logLoss: totalLogLoss / count,
      accuracy: correctCount / count,
    };
  }
}
