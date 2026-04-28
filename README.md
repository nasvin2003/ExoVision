# ExoVision

ExoVision is a full-stack exoplanet transit analysis project. It combines a React web interface, a Flask API, and a convolutional neural network that analyzes TESS light-curve data and stellar metadata to classify possible exoplanet candidates.

The project supports four main workflows:

1. Search a star by TIC identifier and view available TESS metadata.
2. Generate light-curve and trend plots for a selected star.
3. Run the trained model on a TIC target or uploaded FITS light curve.
4. Browse a local archive of labeled TIC stars.

## Project structure

```text
ExoVision/
├── backend/                  # Flask API for TESS queries, plotting, archive, and inference
├── frontend/                 # React user interface
├── models/                   # Trained model weights
├── data/                     # Local archive CSV and sample FITS file
├── notebooks/                # Training and visualization notebooks
├── scripts/                  # Dataset preparation utility
├── docs/images/              # Training plots and model architecture image
├── .env.example              # Example runtime configuration
├── requirements.txt          # Python dependencies
├── run_userinterface.sh      # Starts frontend and backend together
└── README.md
```

## Features

- TESS light-curve search using Lightkurve.
- TIC stellar metadata retrieval using Astroquery MAST.
- BLS-based period search and folded light-curve processing.
- CNN-based exoplanet candidate classification using flux trends and stellar parameters.
- React dashboard for search, archive browsing, analysis, and custom FITS upload.
- Local CSV-backed archive to avoid committing database credentials.

## Model overview

The model uses two input branches:

- A 1D CNN branch for a 10,000-point processed flux trend.
- A dense branch for 11 stellar metadata features.

The branches are concatenated and passed through dense layers for binary classification.

Training artifacts are included in `docs/images/`:

- `model_architecture.png`
- `training_accuracy.png`
- `training_loss.png`

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ExoVision
```

### 2. Create a Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

The default configuration works with the included local archive CSV and model weight path.

## Running the app

From the project root:

```bash
chmod +x run_userinterface.sh
./run_userinterface.sh
```

This starts:

- Flask backend on `http://127.0.0.1:5000`
- React frontend on `http://localhost:3000`

You can also start each service separately.

### Backend only

```bash
source .venv/bin/activate
cd backend
python Exoplanet_Graph.py
```

### Frontend only

```bash
cd frontend
npm start
```

## API endpoints

| Endpoint | Method | Description |
|---|---:|---|
| `/api/archive` | GET | Returns local star archive records. |
| `/api/planet_meta/<identifier>/metadata` | GET | Returns TIC metadata for a target such as `TIC 18067025`. |
| `/api/planet_meta/<identifier>/lightcurves` | GET | Returns available TESS light-curve product metadata. |
| `/api/graphs/<identifier>/general` | GET | Generates light-curve plots and model prediction. |
| `/upload` | POST | Uploads a `.fits` file for custom light-curve analysis. |
| `/upload_model` | POST | Uploads a `.h5` model for optional evaluation. |

## Data notes

The repository includes a small local archive file at:

```text
data/star_archive.csv
```

This replaces the original hardcoded Azure SQL connection so the project can be pushed publicly without exposing credentials.

The sample FITS file is included at:

```text
data/samples/test_fits.fits
```

Large raw training datasets are not included. Use `scripts/prepare_dataset.py` as a starting point for rebuilding the dataset.

## Model notes

The included model weights are:

```text
models/model_weights_v5.h5
```

Only the latest weight file is included to keep the repository clean. Older versions were intentionally removed.

For a production-grade model pipeline, save and reuse the same scaler fitted during training instead of fitting a new scaler during inference.

## Git LFS recommendation

The model weight file is below GitHub's hard file-size limit, but Git LFS is still recommended for `.h5` files:

```bash
git lfs install
git lfs track "*.h5"
git add .gitattributes
```

## Technologies

- Python
- Flask
- TensorFlow/Keras
- Lightkurve
- Astroquery
- Astropy
- Pandas / NumPy
- Scikit-learn
- React
- React Router
- Boxicons

## Security cleanup

The original database credentials were removed. Runtime configuration should be stored in `.env`, not committed to GitHub.

## License

Add your preferred license before publishing the repository.
