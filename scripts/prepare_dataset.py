"""Build the ExoVision training dataset from TESS light curves.

This script downloads seed TIC lists, labels confirmed exoplanet hosts, processes
TESS light curves into 10,000-point trend vectors, appends stellar metadata from
MAST, and writes the final CSV dataset.

This can take a long time because it downloads and processes light curves for
many stars.
"""

import csv
import os
from pathlib import Path

import lightkurve as lk
import numpy as np
import pandas as pd
import requests
from astroquery.mast import Catalogs
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.seasonal import seasonal_decompose
from tslearn.preprocessing import TimeSeriesResampler
from wotan import flatten

VALUE_DF = 10000
DATA_DIR = Path("Datasets")
RAW_FLUX_FILE = DATA_DIR / "exoplanet_star_updated_flux_1.csv"
FINAL_DATASET_FILE = DATA_DIR / "updated_database_exoplanet_1.csv"


def install_datasets():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    datasets = [
        ("1VCI3JlN3IHheNCJ7YbTUfQ5M3x2bn_Mz", DATA_DIR / "star1.csv"),
        ("1vgRCWTXid6tordkbLI4OqUQC7UpmoZwc", DATA_DIR / "star2.csv"),
        ("1NFYDKSj-wCqmNJkA_fUxSkUnJdePW3-j", DATA_DIR / "star3.csv"),
        ("1sLNInRE2QBf5oY2t47pyLPj2itMdJuQ2", DATA_DIR / "star4.csv"),
        ("17nmD760i-k8duNJeNArVKajaZ30tqO2L", DATA_DIR / "confirmed_stars.csv"),
    ]
    for file_id, output_path in datasets:
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        output_path.write_bytes(response.content)


def get_planet_ids():
    stars = pd.concat([
        pd.read_csv(DATA_DIR / "star1.csv"),
        pd.read_csv(DATA_DIR / "star2.csv"),
        pd.read_csv(DATA_DIR / "star3.csv"),
        pd.read_csv(DATA_DIR / "star4.csv"),
    ])
    stars = stars.drop_duplicates("target_name")
    stars["target_name"] = stars["target_name"].apply(lambda x: "TIC " + str(x))

    confirmed_stars = pd.read_csv(DATA_DIR / "confirmed_stars.csv")
    confirmed_stars["tid"] = confirmed_stars["tid"].apply(lambda x: "TIC " + str(x))
    stars["confirmed_planet"] = stars["target_name"].isin(confirmed_stars["tid"]).astype(int)
    stars = stars.reset_index(drop=True)

    confirmed_index = np.array(stars[stars["confirmed_planet"] == 1].index)
    unconfirmed_index = np.array(stars[stars["confirmed_planet"] == 0].index)
    return stars, confirmed_index, unconfirmed_index


def init_new_dataset():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with RAW_FLUX_FILE.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["tid", "confirmed_planet", *np.arange(1, VALUE_DF + 1)])


def process_star(tic_id):
    sectors_data = lk.search_lightcurve(tic_id, author=["TESS-SPOC"], exptime=1800)
    sectors = sectors_data.download_all()
    if sectors is None:
        return None

    for light_curve in sectors:
        light_curve.flux = light_curve.pdcsap_flux.value.unmasked
        light_curve.flux_err = light_curve.pdcsap_flux_err.value.unmasked

    stitched_lc = sectors.stitch().remove_nans()
    period_time = np.logspace(np.log10(1), np.log10(1000), VALUE_DF)
    bls_periodogram = stitched_lc.to_periodogram(method="bls", period=period_time)
    planet_period = bls_periodogram.period_at_max_power
    planet_t0 = bls_periodogram.transit_time_at_max_power
    folded_light_curve = stitched_lc.fold(period=planet_period, epoch_time=planet_t0)
    flatten_lc, _ = flatten(folded_light_curve.time.value, folded_light_curve.flux, method="biweight", return_trend=True)

    light = pd.DataFrame({"Time": folded_light_curve.time.value, "Flux": flatten_lc}).dropna()
    if len(light) < 20:
        return None

    flux_series = pd.Series(light["Flux"].to_numpy(), index=light["Time"].to_numpy()).sort_index()
    period = max(2, min(int(abs(planet_period.value)), max(2, len(flux_series) // 3)))
    decompose_result = seasonal_decompose(flux_series, model="additive", period=period, extrapolate_trend="freq")
    trend = TimeSeriesResampler(sz=VALUE_DF).fit_transform(np.asarray(decompose_result.trend).reshape(-1, 1))[0]

    scaler = MinMaxScaler()
    scaled_trend = scaler.fit_transform(np.nan_to_num(trend).reshape(-1, 1)).reshape(-1)
    return scaled_trend


def populate_dataset(stars, confirmed_index, unconfirmed_index, limit_per_class=10000):
    count = 0
    with RAW_FLUX_FILE.open("a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        for planet_index in range(limit_per_class):
            for index_group in (confirmed_index, unconfirmed_index):
                if planet_index >= len(index_group):
                    continue
                row = stars.iloc[index_group[planet_index]]
                tic_id = row["target_name"]
                label = int(row["confirmed_planet"])
                trend = process_star(tic_id)
                if trend is None:
                    continue
                writer.writerow([tic_id, label, *trend.tolist()])
                count += 1
                print(f"Processed {count}: {tic_id}")


def get_star_metadata():
    star = pd.read_csv(RAW_FLUX_FILE)
    star_list = [int(str(tid)[4:]) for tid in star["tid"].to_numpy()]
    catalog_data = Catalogs.query_criteria(catalog="Tic", ID=star_list)
    catalog_data = catalog_data[["ID", "Teff", "logg", "MH", "rad", "mass", "rho", "lum", "Tmag", "ra", "dec", "plx"]]
    catalog_data["ID"] = ["TIC " + str(identifier) for identifier in catalog_data["ID"]]
    catalog_data = catalog_data.to_pandas().rename(columns={"ID": "tid"})

    merged = pd.merge(star, catalog_data, on="tid", how="inner")
    merged = merged.drop_duplicates(subset="tid", keep="first")
    return merged.fillna(0)


def main():
    if not DATA_DIR.exists():
        install_datasets()
    stars, confirmed_index, unconfirmed_index = get_planet_ids()
    init_new_dataset()
    populate_dataset(stars, confirmed_index, unconfirmed_index)
    final_dataset = get_star_metadata()
    final_dataset.to_csv(FINAL_DATASET_FILE, index=False)
    print(f"Saved {FINAL_DATASET_FILE}")


if __name__ == "__main__":
    main()
