import numpy as np

# EMNIST "byclass": 62 classes. 0-9, then A-Z, then a-z.
LABELS = list("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")

# The Alphabet page only cares about letters (indices 10..61).
LETTER_IDX = np.arange(10, 62)
