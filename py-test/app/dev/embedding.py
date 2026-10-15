from sentence_transformers import SentenceTransformer


model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)


def text_to_vector(text: str) -> list[float]:
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")

    vector = model.encode(
        text,
        normalize_embeddings=True,
    )

    return vector.tolist()


def compare_vectors(
    vector_a: list[float],
    vector_b: list[float],
) -> float:
    if len(vector_a) != len(vector_b):
        raise ValueError("Vectors must have the same dimensions")

    if not vector_a:
        raise ValueError("Vectors cannot be empty")

    return float(
        sum(a * b for a, b in zip(vector_a, vector_b))
    )


if __name__ == "__main__":
    import time

    texts = [
      "NestJS Dependency Injection",
"Spring Dependency Injection",
       "How to cook fried rice",
    ]

    # Warm-up
    text_to_vector("warm up")

    start = time.perf_counter()

    vectors = [
        text_to_vector(text)
        for text in texts
    ]

    embedding_time = time.perf_counter() - start

    start = time.perf_counter()

    similarity_ab = compare_vectors(vectors[0], vectors[1])
    similarity_ac = compare_vectors(vectors[0], vectors[2])

    comparison_time = time.perf_counter() - start

    print(f"Embedding: {embedding_time * 1000:.3f} ms")
    print(f"Comparison: {comparison_time * 1000:.3f} ms")
    print(f"A vs B: {similarity_ab:.6f}")
    print(f"A vs C: {similarity_ac:.6f}")