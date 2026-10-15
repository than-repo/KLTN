//src\features\skill-suggestion\interfaces\embedding.interfaces.ts

export interface EmbeddingBatchItem {
  id: string;
  text: string;
}

export interface EmbeddingBatchItemResponse {
  id: string;
  dimensions: number;
  embedding: number[];
}
