"""Train the letter-recognition CNN on EMNIST (byclass: 62 classes).

Run this on Google Colab (free GPU) or any machine with TensorFlow:
    python training/train_emnist.py --epochs 12

Outputs (in backend/models/):
    emnist_cnn.keras          the model the Flask API loads
    metrics.json              test accuracy, letters-only accuracy, most-confused pairs
    confusion_letters.png     confusion matrix for the 52 letters (nice for your LinkedIn video)
    samples.png               a few training images so you can eyeball the orientation
"""
import argparse
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

OUT = Path(__file__).resolve().parent.parent / "models"
LABELS = list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")


def build_model(num_classes: int = 62) -> keras.Model:
    """Small, fast CNN. The Random* layers only act during training (they are the augmentation)."""
    def block(x, filters):
        for _ in range(2):
            x = layers.Conv2D(filters, 3, padding="same", use_bias=False)(x)
            x = layers.BatchNormalization()(x)
            x = layers.ReLU()(x)
        x = layers.MaxPooling2D()(x)
        return layers.Dropout(0.25)(x)

    inp = keras.Input((28, 28, 1))
    x = layers.RandomRotation(0.06, fill_mode="constant")(inp)
    x = layers.RandomZoom(0.12, fill_mode="constant")(x)
    x = layers.RandomTranslation(0.08, 0.08, fill_mode="constant")(x)
    x = block(x, 32)
    x = block(x, 64)
    x = block(x, 128)
    x = layers.Flatten()(x)
    x = layers.Dense(256, use_bias=False)(x)
    x = layers.BatchNormalization()(x)
    x = layers.ReLU()(x)
    x = layers.Dropout(0.5)(x)
    out = layers.Dense(num_classes, activation="softmax")(x)
    model = keras.Model(inp, out, name="emnist_cnn")
    model.compile(optimizer=keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def load_data(batch: int):
    import tensorflow_datasets as tfds

    train, test = tfds.load("emnist/byclass", split=["train", "test"], as_supervised=True)

    def prep(img, label):
        img = tf.transpose(img, [1, 0, 2])        # EMNIST is stored rotated/mirrored: transpose makes it upright
        return tf.cast(img, tf.float32) / 255.0, label

    train = train.map(prep, num_parallel_calls=tf.data.AUTOTUNE).shuffle(50_000).batch(batch).prefetch(tf.data.AUTOTUNE)
    test = test.map(prep, num_parallel_calls=tf.data.AUTOTUNE).batch(batch).prefetch(tf.data.AUTOTUNE)
    return train, test


def save_samples(ds):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    x, y = next(iter(ds))
    fig, axes = plt.subplots(2, 8, figsize=(12, 3.4))
    for a, img, lab in zip(axes.ravel(), x.numpy(), y.numpy()):
        a.imshow(img[..., 0], cmap="gray"); a.set_title(LABELS[lab]); a.axis("off")
    fig.tight_layout(); fig.savefig(OUT / "samples.png", dpi=120); plt.close(fig)


def evaluate(model, test):
    from sklearn.metrics import confusion_matrix

    y_true, y_pred = [], []
    for x, y in test:
        y_true.append(y.numpy()); y_pred.append(np.argmax(model(x, training=False), axis=1))
    y_true, y_pred = np.concatenate(y_true), np.concatenate(y_pred)
    acc = float((y_true == y_pred).mean())

    # Letters only: how the Alphabet page behaves (digits are ignored at inference)
    mask = y_true >= 10
    lt, lp = y_true[mask], y_pred[mask]
    cm = confusion_matrix(lt, lp, labels=list(range(10, 62)))
    probs_letters_only_acc = float((cm.trace()) / cm.sum())
    # same letter, other case, counts as "case confusion" rather than a wrong letter
    same_letter = float(np.mean([LABELS[a].lower() == LABELS[b].lower() for a, b in zip(lt, lp)]))

    pairs = []
    for i in range(52):
        for j in range(52):
            if i != j and cm[i, j] > 0:
                pairs.append((int(cm[i, j]), LABELS[10 + i], LABELS[10 + j]))
    pairs.sort(reverse=True)
    metrics = {
        "test_accuracy_all_62": round(acc, 4),
        "letters_exact_accuracy": round(probs_letters_only_acc, 4),
        "letters_ignoring_case": round(same_letter, 4),
        "most_confused": [{"true": t, "predicted": p, "count": c} for c, t, p in pairs[:15]],
    }
    (OUT / "metrics.json").write_text(json.dumps(metrics, indent=2))

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(10, 9))
    ax.imshow(np.log1p(cm), cmap="magma")
    ticks = [LABELS[i] for i in range(10, 62)]
    ax.set_xticks(range(52)); ax.set_xticklabels(ticks, fontsize=6)
    ax.set_yticks(range(52)); ax.set_yticklabels(ticks, fontsize=6)
    ax.set_xlabel("Predicted"); ax.set_ylabel("True"); ax.set_title("EMNIST letters: confusion matrix (log scale)")
    fig.tight_layout(); fig.savefig(OUT / "confusion_letters.png", dpi=130); plt.close(fig)
    return metrics


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=12)
    ap.add_argument("--batch", type=int, default=256)
    args = ap.parse_args()

    OUT.mkdir(exist_ok=True)
    train, test = load_data(args.batch)
    save_samples(train)
    print(f"Look at {OUT / 'samples.png'}: the letters must be upright and not mirrored.")

    model = build_model()
    model.summary()
    cbs = [
        keras.callbacks.ModelCheckpoint(OUT / "emnist_cnn.keras", monitor="val_accuracy", save_best_only=True),
        keras.callbacks.ReduceLROnPlateau(monitor="val_accuracy", factor=0.5, patience=1, min_lr=1e-5),
        keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=3, restore_best_weights=True),
    ]
    model.fit(train, validation_data=test, epochs=args.epochs, callbacks=cbs)

    best = keras.models.load_model(OUT / "emnist_cnn.keras", compile=False)
    m = evaluate(best, test)
    print(json.dumps(m, indent=2))
    print(f"\nDone. Copy {OUT / 'emnist_cnn.keras'} into backend/models/ in your repo.")


if __name__ == "__main__":
    main()
