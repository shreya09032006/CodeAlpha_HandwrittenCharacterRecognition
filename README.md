# CodeAlpha_HandwrittenCharacterRecognition

CodeAlpha Machine Learning Internship — **Task 3: Handwritten Character Recognition**.

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS, Recharts |
| Backend (next) | Python + Flask, OpenCV, ReportLab |
| ML (next) | TensorFlow + Keras CNN (EMNIST) / CRNN (IAM), TrOCR |
| Essay correction (next) | LLM API |
| Data & auth (next) | Supabase PostgreSQL, Auth, Storage |

## Features
- Alphabet recognition A–Z / a–z (CNN, EMNIST) with the predicted letter shown beside the original image
- Word recognition from an uploaded image (CRNN)
- Upload JPG, JPEG, PNG
- Handwritten essay → extracted text → corrected essay, feedback, scores, PDF report
- History and analytics dashboard

## Run the frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Without a backend the UI shows sample output, clearly tagged "Sample output · backend not connected".
The API contract is documented at the top of `src/lib/api.js`.
