# Training the letter model (EMNIST)

Training needs the EMNIST dataset (about 535 MB download), so do it on **Google Colab** (free GPU, about 10 to 15 minutes).

1. Open https://colab.research.google.com, **New notebook**, then **Runtime > Change runtime type > T4 GPU**.
2. Paste each block into its own cell and run it:

```python
!git clone https://github.com/YOUR_USERNAME/CodeAlpha_HandwrittenCharacterRecognition.git
%cd CodeAlpha_HandwrittenCharacterRecognition/backend
!pip install -q tensorflow-datasets matplotlib scikit-learn
```
```python
!python training/train_emnist.py --epochs 12
```
3. When it finishes, open `models/samples.png` (letters must look upright), `models/metrics.json` and `models/confusion_letters.png`.
4. Download `models/emnist_cnn.keras` (and the metrics and confusion matrix, they are great for your video) and put them in `backend/models/` in your repo, then commit and push.

Expected accuracy: roughly 87 to 89% on all 62 classes. Some letters are the same shape in both cases (c/C, o/O, s/S, v/V, w/W, x/X, z/Z), so the API says "case unclear" for those instead of guessing.
