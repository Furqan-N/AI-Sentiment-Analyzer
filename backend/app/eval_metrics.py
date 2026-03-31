"""
Evaluation script for the TransformerEngine.

Runs a small labeled dataset through DistilBERT and prints a classification
report (Precision / Recall / F1).

Usage:
    cd backend
    python -m app.eval_metrics
"""

import asyncio

from app.engines.transformer_engine import TransformerEngine

# Labeled evaluation samples — mix of easy, ambiguous, and adversarial cases.
# Ground truth labels follow SST-2 conventions (binary: Positive/Negative).
EVAL_DATA: list[tuple[str, str]] = [
    # --- Easy positives (high signal) ---
    ("This movie was absolutely fantastic and I loved every minute.", "Positive"),
    ("The food was delicious and the service was excellent.", "Positive"),
    ("I am extremely happy with my purchase, highly recommend!", "Positive"),
    ("Incredible performance, the best I have ever seen.", "Positive"),
    ("A delightful surprise, everything was perfect.", "Positive"),

    # --- Hard positives (subtle, mixed signals, sarcasm, negation) ---
    ("Not bad at all, I was pleasantly surprised by the quality.", "Positive"),
    ("I was skeptical at first but this turned out to be quite good.", "Positive"),
    ("It could have been better, but overall I enjoyed it.", "Positive"),
    ("Despite the long wait, the result was absolutely worth it.", "Positive"),
    ("The movie wasn't perfect, but the ending really moved me.", "Positive"),
    ("I didn't expect much, yet it exceeded every expectation.", "Positive"),
    ("Simple but effective, it does exactly what you need.", "Positive"),
    ("The critics were wrong, this is actually a hidden gem.", "Positive"),
    ("It has its flaws, but the charm makes up for everything.", "Positive"),
    ("Understated and elegant, not flashy but genuinely impressive.", "Positive"),

    # --- Easy negatives (high signal) ---
    ("This was the worst experience I have ever had.", "Negative"),
    ("Terrible quality, broke after one day of use.", "Negative"),
    ("I am very disappointed with the product, total waste of money.", "Negative"),
    ("The service was awful and the staff were rude.", "Negative"),
    ("The worst purchase I have ever made, do not buy this.", "Negative"),

    # --- Hard negatives (subtle, mixed signals, backhanded, faint praise) ---
    ("It's fine I guess, but I definitely won't be buying again.", "Negative"),
    ("I wanted to like it, but it just fell flat in every way.", "Negative"),
    ("For the price, I expected much more than what I got.", "Negative"),
    ("The concept was promising but the execution was poor.", "Negative"),
    ("It looks nice on the outside but falls apart quickly.", "Negative"),
    ("I've seen better from cheaper alternatives honestly.", "Negative"),
    ("Not the worst thing ever, but pretty close to it.", "Negative"),
    ("They clearly rushed this out without proper testing.", "Negative"),
    ("It works sometimes, which is the best thing I can say about it.", "Negative"),
    ("The hype was completely unjustified, very overrated.", "Negative"),
]


def _classification_report(
    y_true: list[str], y_pred: list[str], labels: list[str]
) -> str:
    """Build a classification report without sklearn dependency."""
    lines: list[str] = []
    lines.append(f"{'':>15s} {'precision':>10s} {'recall':>10s} {'f1-score':>10s} {'support':>10s}")
    lines.append("")

    total_correct = 0
    total_support = 0
    macro_p, macro_r, macro_f = 0.0, 0.0, 0.0

    for label in labels:
        tp = sum(1 for t, p in zip(y_true, y_pred) if t == label and p == label)
        fp = sum(1 for t, p in zip(y_true, y_pred) if t != label and p == label)
        fn = sum(1 for t, p in zip(y_true, y_pred) if t == label and p != label)
        support = tp + fn

        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

        lines.append(f"{label:>15s} {precision:>10.4f} {recall:>10.4f} {f1:>10.4f} {support:>10d}")

        total_correct += tp
        total_support += support
        macro_p += precision
        macro_r += recall
        macro_f += f1

    n_labels = len(labels)
    accuracy = total_correct / total_support if total_support else 0.0
    macro_p /= n_labels
    macro_r /= n_labels
    macro_f /= n_labels

    lines.append("")
    lines.append(f"{'accuracy':>15s} {'':>10s} {'':>10s} {accuracy:>10.4f} {total_support:>10d}")
    lines.append(f"{'macro avg':>15s} {macro_p:>10.4f} {macro_r:>10.4f} {macro_f:>10.4f} {total_support:>10d}")

    return "\n".join(lines)


async def main() -> None:
    engine = TransformerEngine()
    labels = sorted({label for _, label in EVAL_DATA})

    y_true: list[str] = []
    y_pred: list[str] = []

    easy = sum(1 for _ in EVAL_DATA[:5]) + sum(1 for _ in EVAL_DATA[15:20])
    hard = len(EVAL_DATA) - easy
    print(f"Running evaluation on {len(EVAL_DATA)} samples ({easy} easy, {hard} adversarial) with TransformerEngine...")
    print(f"Model: distilbert-base-uncased-finetuned-sst-2-english\n")

    for text, true_label in EVAL_DATA:
        result = await engine.predict(text)
        y_true.append(true_label)
        y_pred.append(result.label)
        match = "OK" if result.label == true_label else "MISS"
        print(f"  [{match}] {true_label:>8s} -> {result.label:>8s}  ({result.score:.4f})  {text[:60]}")

    print("\n" + "=" * 70)
    print("Classification Report")
    print("=" * 70)
    print(_classification_report(y_true, y_pred, labels))


if __name__ == "__main__":
    asyncio.run(main())
