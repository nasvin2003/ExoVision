import sys
import os
import time
from flask import Flask, send_file, jsonify, send_from_directory
from lightkurve import search_targetpixelfile
from lightkurve import TessTargetPixelFile
import lightkurve as lk
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from keras.models import load_model
from keras.optimizers import Adam
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, Activation, Conv1D, MaxPooling1D, Flatten
from wotan import slide_clip
from wotan import transit_mask, flatten
from astropy.stats import sigma_clip
from astropy import units as u
import csv
import shutil
from scipy.interpolate import interp1d
from tsfresh import extract_features
from tsfresh.utilities.dataframe_functions import make_forecasting_frame
from tsfresh.utilities.dataframe_functions import impute
from statsmodels.tsa.seasonal import seasonal_decompose
import tempfile


app = Flask(__name__)
@app.route('/api/graphs/<identifier>/general', methods=['GET'])
def plot_graphs(identifier):

    images_dir = os.path.join(tempfile.gettempdir(), 'plot_images')
    os.makedirs(images_dir, exist_ok=True)

    general_plot_path = os.path.join(images_dir, f'{identifier}_general_plot.png')
    trend_plot_path = os.path.join(images_dir, f'{identifier}_trend_plot.png')

    sectorsdata = lk.search_lightcurve(identifier, author=["TESS-SPOC"], exptime=1800)
    if (sectorsdata.download_all()!= None):
        sectors = sectorsdata.download_all()
        for i in sectors:
            i.flux = i.pdcsap_flux.value.unmasked
            i.flux_err = i.pdcsap_flux_err.value.unmasked
            
        stiched_lc = sectors.stitch()

        time = stiched_lc['time'].value
        flux = stiched_lc['pdcsap_flux'].value
        
        flatten_lc, trend_lc = flatten(time, flux, method='biweight', return_trend=True) 

        plt.figure(figsize=(9.10, 2.15))
        plt.plot(time,flatten_lc, color="#FF4C29")
        plt.gcf().set_facecolor('#202123')  # Set background color of the figure
        plt.grid(False)
        plt.axis('off')
        plt.savefig(general_plot_path)
        plt.close()

        lightc = lk.LightCurve(time = time,flux = flatten_lc)

        min_period = 0.5  
        max_period = 100.0  
        num_periods = 1000 

        period_time = np.logspace(np.log10(min_period), np.log10(max_period), num_periods)

        bls_periodogram = lightc.to_periodogram(method='bls', period=period_time)

        planet_period = bls_periodogram.period_at_max_power
        planet_t0 = bls_periodogram.transit_time_at_max_power
        planet_duration = bls_periodogram.duration_at_max_power

        folded_light_curve = lightc.fold(period=planet_period, epoch_time=planet_t0)

        duration_days = planet_duration.value

        folded_light_curve_time = folded_light_curve.time

        t = pd.DataFrame({'Time': folded_light_curve_time.value, 'Flux': folded_light_curve.flux.value})
        t = t.reset_index()
        temp = t[len(t.sort_values(by='Time'))//2-500:len(t.sort_values(by='Time'))//2+500]
        temp = temp.reset_index()

        time_index = folded_light_curve_time.value

        mean_flux = np.nanmean(folded_light_curve.flux)
        flux_values_filled = np.nan_to_num(folded_light_curve.flux, nan=mean_flux)

        flux_series = pd.Series(flux_values_filled, index=time_index)

        per_val = int(planet_period.value)
        if per_val == 0:
            per_val = 1

        decompose_result_mult = seasonal_decompose(flux_series, model="additive", period=per_val)

        trend = decompose_result_mult.trend
        seasonal = decompose_result_mult.seasonal
        residual = decompose_result_mult.resid

        t = pd.DataFrame({'Time': trend.index, 'Flux': trend})
        t = t.reset_index()
        temp1 = t[len(t)//2-500:len(t)//2+500]  
        temp1.reset_index()

        plt.figure(figsize=(9.10, 2.15))
        plt.plot(temp1.Time, temp1.Flux, color="#FF4C29")
        plt.gcf().set_facecolor('#202123')  # Set background color of the figure
        plt.grid(False)
        plt.axis('off')
        plt.savefig(trend_plot_path)
        plt.close()

        return jsonify({
        'general_plot_url': f'/api/images/{identifier}_general_plot.png',
        'trend_plot_url': f'/api/images/{identifier}_trend_plot.png'
    })

@app.route('/api/images/<filename>')
def serve_image(filename):
    images_dir = os.path.join(tempfile.gettempdir(), 'plot_images')
    return send_from_directory(images_dir, filename)

@app.route('/api/archive')
def get_archive():
    archive = pd.read_csv('../../../ExoVision/Datasets/updated_database_exoplanet.csv')[['tid','confirmed_planet']]
    return jsonify(archive.to_dict(orient='records'))

if __name__ == "__main__":
    app.run(debug=True)