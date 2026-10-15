from sentence_transformers import SentenceTransformer


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )

    def embed(self, text: str) -> list[float]:
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")

        vector = self.model.encode(
            text.strip(),
            normalize_embeddings=True,
        )

        return vector.tolist()

    def embed_many(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            raise ValueError("Texts cannot be empty")

        normalized_texts: list[str] = []

        for text in texts:
            if not text or not text.strip():
                raise ValueError("Each text must be non-empty")

            normalized_texts.append(text.strip())

        vectors = self.model.encode(
            normalized_texts,
            batch_size=32,
            normalize_embeddings=True,
        )

        return vectors.tolist()