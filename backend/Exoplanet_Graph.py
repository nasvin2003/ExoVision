import os
import tempfile
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import lightkurve as lk
from astropy.time import Time
import astropy.io.fits as fits
from astroquery.mast import Catalogs
from keras.layers import Concatenate, Conv1D, Dense, Dropout, Flatten, Input, MaxPooling1D
from keras.models import Model, load_model
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.seasonal import seasonal_decompose
from tslearn.preprocessing import TimeSeriesResampler
from wotan import flatten

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

ARCHIVE_CSV_PATH = Path(os.getenv("EXOVISION_ARCHIVE_CSV", ROOT_DIR / "data" / "star_archive.csv"))
MODEL_WEIGHTS_PATH = Path(os.getenv("EXOVISION_MODEL_WEIGHTS", ROOT_DIR / "models" / "model_weights_v5.h5"))

if not ARCHIVE_CSV_PATH.is_absolute():
    ARCHIVE_CSV_PATH = ROOT_DIR / ARCHIVE_CSV_PATH
if not MODEL_WEIGHTS_PATH.is_absolute():
    MODEL_WEIGHTS_PATH = ROOT_DIR / MODEL_WEIGHTS_PATH

FEATURE_COLUMNS = ["Teff", "logg", "MH", "rad", "mass", "rho", "lum", "Tmag", "ra", "dec", "plx"]
VALUE_DF = 10000

app = Flask(__name__)
CORS(app)


def image_dir() -> Path:
    directory = Path(tempfile.gettempdir()) / "exovision_plot_images"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def build_model() -> Model:
    input_flux = Input(shape=(VALUE_DF, 1))
    x = Conv1D(filters=64, kernel_size=3, activation="relu")(input_flux)
    x = MaxPooling1D(pool_size=2)(x)
    x = Conv1D(filters=64, kernel_size=5, activation="relu")(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = Conv1D(filters=64, kernel_size=5, activation="relu")(x)
    x = MaxPooling1D(pool_size=2)(x)
    x = Flatten()(x)
    x = Dropout(0.75)(x)
    model_flux = Model(inputs=input_flux, outputs=x)

    input_params = Input(shape=(11,))
    y = Dense(128, activation="relu")(input_params)
    model_params = Model(inputs=input_params, outputs=y)

    combined = Concatenate()([model_flux.output, model_params.output])
    z = Dropout(0.5)(combined)
    z = Dense(128, activation="relu")(z)
    final_output = Dense(1, activation="sigmoid")(z)

    model = Model(inputs=[model_flux.input, model_params.input], outputs=final_output)
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    return model


@lru_cache(maxsize=1)
def get_inference_model() -> Model:
    if not MODEL_WEIGHTS_PATH.exists():
        raise FileNotFoundError(f"Model weights not found: {MODEL_WEIGHTS_PATH}")
    model = build_model()
    model.load_weights(str(MODEL_WEIGHTS_PATH))
    return model


def save_plot(x_values, y_values, output_path: Path) -> None:
    plt.figure(figsize=(9.10, 2.15))
    plt.plot(x_values, y_values, color="#FF4C29")
    plt.gcf().set_facecolor("#202123")
    plt.grid(False)
    plt.axis("off")
    plt.savefig(output_path, bbox_inches="tight", pad_inches=0)
    plt.close()


def resample_trend(time_values, flux_values) -> np.ndarray:
    data = pd.DataFrame({"Time": np.asarray(time_values, dtype=float), "Flux": np.asarray(flux_values, dtype=float)})
    data = data.replace([np.inf, -np.inf], np.nan).dropna()
    if len(data) < 20:
        raise ValueError("Not enough valid light-curve points after cleaning.")

    series = pd.Series(data["Flux"].to_numpy(), index=data["Time"].to_numpy()).sort_index()
    series = series[~series.index.duplicated(keep="first")]

    period = max(2, min(50, len(series) // 3))
    try:
        decomposed = seasonal_decompose(series, model="additive", period=period, extrapolate_trend="freq")
        trend_values = np.asarray(decomposed.trend, dtype=float)
    except Exception:
        trend_values = series.to_numpy(dtype=float)

    trend_values = np.nan_to_num(trend_values, nan=float(np.nanmedian(trend_values)))
    trend_values = trend_values.reshape(-1, 1)
    trend = TimeSeriesResampler(sz=VALUE_DF).fit_transform(trend_values)[0].reshape(VALUE_DF)
    return np.nan_to_num(trend, nan=0.0, posinf=0.0, neginf=0.0)


def trend_from_lightkurve_identifier(identifier: str):
    sectors_data = lk.search_lightcurve(identifier, author=["TESS-SPOC"], exptime=1800)
    if len(sectors_data.table) == 0:
        raise ValueError(f"No TESS-SPOC light curves found for {identifier}.")

    sectors = sectors_data.download_all()
    if sectors is None or len(sectors) == 0:
        raise ValueError(f"Unable to download light curves for {identifier}.")

    for light_curve in sectors:
        if hasattr(light_curve, "pdcsap_flux") and light_curve.pdcsap_flux is not None:
            light_curve.flux = light_curve.pdcsap_flux.value.unmasked
        if hasattr(light_curve, "pdcsap_flux_err") and light_curve.pdcsap_flux_err is not None:
            light_curve.flux_err = light_curve.pdcsap_flux_err.value.unmasked

    stitched_lc = sectors.stitch().remove_nans()
    time = stitched_lc.time.value
    flux = stitched_lc.flux.value

    period_time = np.logspace(np.log10(1), np.log10(1000), VALUE_DF)
    bls_periodogram = stitched_lc.to_periodogram(method="bls", period=period_time)
    planet_period = bls_periodogram.period_at_max_power
    planet_t0 = bls_periodogram.transit_time_at_max_power
    folded_lc = stitched_lc.fold(period=planet_period, epoch_time=planet_t0)

    flattened_flux, _ = flatten(folded_lc.time.value, folded_lc.flux.value, method="biweight", return_trend=True)
    trend = resample_trend(folded_lc.time.value, flattened_flux)
    return time, flux, trend


def trend_from_fits_file(file_path: Path):
    with fits.open(file_path) as hdulist:
        time = hdulist[1].data["TIME"].astype(float)
        flux = hdulist[1].data["PDCSAP_FLUX"].astype(float)
        error = hdulist[1].data["PDCSAP_FLUX_ERR"].astype(float)

    finite_mask = np.isfinite(time) & np.isfinite(flux) & np.isfinite(error)
    time, flux, error = time[finite_mask], flux[finite_mask], error[finite_mask]
    if len(time) < 20:
        raise ValueError("The FITS file does not contain enough valid time/flux points.")

    lc = lk.LightCurve(time=Time(time, format="jd"), flux=flux, flux_err=error).remove_nans()
    period_time = np.logspace(np.log10(1), np.log10(1000), VALUE_DF)
    bls_periodogram = lc.to_periodogram(method="bls", period=period_time)
    planet_period = bls_periodogram.period_at_max_power
    planet_t0 = bls_periodogram.transit_time_at_max_power
    folded_lc = lc.fold(period=planet_period, epoch_time=planet_t0)
    flattened_flux, _ = flatten(folded_lc.time.value, folded_lc.flux.value, method="biweight", return_trend=True)
    trend = resample_trend(folded_lc.time.value, flattened_flux)
    return folded_lc.time.value, folded_lc.flux.value, trend


def stellar_params(identifier: str) -> np.ndarray:
    if not identifier.startswith("TIC "):
        return np.zeros((1, len(FEATURE_COLUMNS)))

    catalog = Catalogs.query_criteria(catalog="Tic", ID=int(identifier[4:]))
    if len(catalog) == 0:
        return np.zeros((1, len(FEATURE_COLUMNS)))

    values = catalog[FEATURE_COLUMNS].to_pandas().fillna(0)
    if values.empty:
        return np.zeros((1, len(FEATURE_COLUMNS)))

    scaler = MinMaxScaler()
    return scaler.fit_transform(values.iloc[[0]])


def predict_status(trend: np.ndarray, params: np.ndarray):
    model = get_inference_model()
    score = float(model.predict([trend.reshape(1, VALUE_DF, 1), params.reshape(1, -1)], verbose=0)[0][0])
    label = "Potential Exoplanet Candidate" if score >= 0.5 else "No Exoplanet Transit Signals Detected"
    return label, score


@app.route("/api/graphs/<identifier>/general", methods=["GET"])
def plot_graphs(identifier):
    try:
        directory = image_dir()
        safe_identifier = identifier.replace(" ", "_")
        general_plot_path = directory / f"{safe_identifier}_general_plot.png"
        trend_plot_path = directory / f"{safe_identifier}_trend_plot.png"

        time_values, flux_values, trend = trend_from_lightkurve_identifier(identifier)
        save_plot(time_values, flux_values, general_plot_path)
        save_plot(range(VALUE_DF), trend, trend_plot_path)

        status, score = predict_status(trend, stellar_params(identifier))
        return jsonify({
            "general_plot_url": f"/api/images/{general_plot_path.name}",
            "trend_plot_url": f"/api/images/{trend_plot_path.name}",
            "status": status,
            "score": score,
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/images/<filename>")
def serve_image(filename):
    return send_from_directory(image_dir(), filename)


@app.route("/api/archive")
def get_archive():
    if not ARCHIVE_CSV_PATH.exists():
        return jsonify([])
    archive = pd.read_csv(ARCHIVE_CSV_PATH)
    return jsonify(archive.to_dict(orient="records"))


@app.route("/api/planet_meta/<identifier>/metadata")
def get_metadata(identifier):
    try:
        if not identifier.startswith("TIC "):
            return jsonify({})
        catalog_data = Catalogs.query_criteria(catalog="Tic", ID=int(identifier[4:])).to_pandas().fillna(0)
        if len(catalog_data) == 0:
            return jsonify({})
        row = catalog_data.iloc[0]
        return jsonify({
            "Unique identifier": row.get("ID", ""),
            "Type of object": row.get("objType", ""),
            "Source of object type": row.get("typeSrc", ""),
            "Right Ascension": row.get("ra", ""),
            "Declination": row.get("dec", ""),
            "Parallax measurement": row.get("plx", ""),
            "Nearest neighbor distance": row.get("prox", ""),
            "TESS band magnitude": row.get("Tmag", ""),
            "Surface temperature": row.get("Teff", ""),
            "Surface gravity": row.get("logg", ""),
            "Metal content": row.get("MH", ""),
            "Stellar radius": row.get("rad", ""),
            "Stellar mass": row.get("mass", ""),
            "Stellar density": row.get("rho", ""),
            "Stellar luminosity": row.get("lum", ""),
            "Distance to star": row.get("d", ""),
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/api/planet_meta/<identifier>/lightcurves")
def get_metadata_lightcurve(identifier):
    try:
        sectors_data = lk.search_lightcurve(identifier, author=["TESS-SPOC"], exptime=1800)
        if len(sectors_data.table) == 0:
            return jsonify({})
        search_data = sectors_data.table.to_pandas(index=False).replace({np.nan: None})
        return jsonify({column: search_data[column].values.tolist() for column in search_data.columns})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if not uploaded_file.filename.lower().endswith(".fits"):
        return jsonify({"error": "Invalid file format. Please upload a .fits file."}), 400

    temp_dir = Path(tempfile.mkdtemp())
    file_path = temp_dir / uploaded_file.filename
    uploaded_file.save(file_path)

    try:
        directory = image_dir()
        general_plot_path = directory / "custom_general_plot.png"
        trend_plot_path = directory / "custom_trend_plot.png"

        time_values, flux_values, trend = trend_from_fits_file(file_path)
        save_plot(time_values, flux_values, general_plot_path)
        save_plot(range(VALUE_DF), trend, trend_plot_path)

        status, score = predict_status(trend, np.zeros((1, len(FEATURE_COLUMNS))))
        return jsonify({
            "general_plot_url": f"/api/images/{general_plot_path.name}",
            "trend_plot_url": f"/api/images/{trend_plot_path.name}",
            "status": status,
            "score": score,
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/upload_model", methods=["POST"])
def upload_model():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if not uploaded_file.filename.lower().endswith(".h5"):
        return jsonify({"error": "Invalid file format. Please upload a .h5 file."}), 400

    temp_dir = Path(tempfile.mkdtemp())
    file_path = temp_dir / uploaded_file.filename
    uploaded_file.save(file_path)

    dataset_path = ROOT_DIR / "data" / "final_dataset.csv"
    if not dataset_path.exists():
        return jsonify({
            "accuracy": "N/A",
            "precision": "N/A",
            "recall": "N/A",
            "f1": "N/A",
            "message": "Model uploaded, but data/final_dataset.csv was not found for evaluation.",
        })

    try:
        model = load_model(str(file_path))
        dataset = pd.read_csv(dataset_path).drop(columns=["tid"], errors="ignore").fillna(0)
        y = dataset["confirmed_planet"]
        x = dataset.drop(columns=["confirmed_planet"])
        x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.1, random_state=42)
        y_pred = (model.predict(x_test, verbose=0) >= 0.5).astype(int).reshape(-1)
        return jsonify({
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    app.run(host=host, port=port, debug=debug)
