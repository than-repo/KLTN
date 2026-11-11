export interface BktAnswer {
  userId: string;
  skillName: string;
  orderId: number;
  correct: 0 | 1;
}
export interface BktParameters {
  prior: number; // pi
  learns: number; // T
  guesses: number; // G
  slips: number; // S
}

export interface BktTrainingResult {
  skillName: string;
  parameters: BktParameters;
  logLikelihood: number;
  iterations: number;
}
export interface ForwardResult {
  alpha: [number, number][];
  scales: number[];
  logLikelihood: number;
}

export interface ExpectationResult {
  gamma: [number, number][]; // [unmastered, mastered]
  xi01: number[]; // unmastered -> mastered
}
export interface BktPrediction extends BktAnswer {
  masteryBefore: number;
  predictedCorrect: number;
  masteryAfterAnswer: number;
  masteryAfterLearning: number;
}
