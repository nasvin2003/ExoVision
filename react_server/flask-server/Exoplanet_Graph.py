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
from astroquery.mast import Catalogs


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

@app.route('/api/planet_meta/<identifier>/metadata')
def get_metadata(identifier):
    if identifier[0:4] == "TIC ":
        catalog_data = Catalogs.query_criteria(catalog="Tic", ID=int(identifier[4:]))
        catalog_data = catalog_data.to_pandas().fillna(0)
        if(len(catalog_data)==0):
            return jsonify({})
        catalog = {
            'Unique identifier': catalog_data['ID'].values[0],
            'Type of object': catalog_data['objType'].values[0],
            'Source of object type': catalog_data['typeSrc'].values[0],
            'Right Ascension': catalog_data['ra'].values[0],
            'Declination': catalog_data['dec'].values[0],
            'Parallax measurement': catalog_data['plx'].values[0],
            'Nearest neighbor distance': catalog_data['prox'].values[0],
            'TESS band magnitude': catalog_data['Tmag'].values[0],
            'Surface temperature': catalog_data['Teff'].values[0],
            'Surface gravity': catalog_data['logg'].values[0],
            'Metal content': catalog_data['MH'].values[0],
            'Stellar radius': catalog_data['rad'].values[0],
            'Stellar mass': catalog_data['mass'].values[0],
            'Stellar density': catalog_data['rho'].values[0],
            'Stellar luminosity': catalog_data['lum'].values[0],
            'Distance to star': catalog_data['d'].values[0]
        }
        return jsonify(catalog)
    else:
        return jsonify({})

@app.route('/api/planet_meta/<identifier>/lightcurves')
def get_metadata_lightcurve(identifier):
    sectorsdata = lk.search_lightcurve(identifier, author=["TESS-SPOC"], exptime=1800)
    if(len(sectorsdata.table)==0):
        return jsonify({})
    search_data = sectorsdata.table.to_pandas(index=False).replace({np.nan: None})
            
    search = {
        'intentType': search_data['intentType'].values.tolist(),
        'obs_collect§ion': search_data['obs_collection'].values.tolist(),
        'provenance_name': search_data['provenance_name'].values.tolist(),
        'instrument§_name': search_data['instrument_name'].values.tolist(),
        'project': search_data['project'].values.tolist(),
        'filters': search_data['filters'].values.tolist(),
        'wavelength_region': search_data['wavelength_region'].values.tolist(),
        'target_name': search_data['target_name'].values.tolist(),
        'target_classification': search_data['target_classification'].values.tolist(),
        'obs_id': search_data['obs_id'].values.tolist(),
        's_ra': search_data['s_ra'].values.tolist(),
        's_dec': search_data['s_dec'].values.tolist(),
        'dataproduct_type': search_data['dataproduct_type'].values.tolist(),
        'proposal_pi': search_data['proposal_pi'].values.tolist(),
        'calib_level': search_data['calib_level'].values.tolist(),
        't_min': search_data['t_min'].values.tolist(),
        't_max': search_data['t_max'].values.tolist(),
        't_exptime': search_data['t_exptime'].values.tolist(),
        'em_min': search_data['em_min'].values.tolist(),
        'em_max': search_data['em_max'].values.tolist(),
        'obs_title': search_data['obs_title'].values.tolist(),
        't_obs_release': search_data['t_obs_release'].values.tolist(),
        'proposal_id': search_data['proposal_id'].values.tolist(),
        'proposal_type': search_data['proposal_type'].values.tolist(),
        'sequence_number': search_data['sequence_number'].values.tolist(),
        's_region': search_data['s_region'].values.tolist(),
        'jpegURL': search_data['jpegURL'].values.tolist(),
        'dataURL': search_data['dataURL'].values.tolist(),
        'dataRights': search_data['dataRights'].values.tolist(),
        'mtFlag': search_data['mtFlag'].values.tolist(),
        'srcDen': search_data['srcDen'].values.tolist(),
        'obsid': search_data['obsid'].values.tolist(),
        'objID': search_data['objID'].values.tolist(),
        'exptime': search_data['exptime'].values.tolist(),
        'distance': search_data['distance'].values.tolist(),
        'obsID': search_data['obsID'].values.tolist(),
        'obs_collection_products': search_data['obs_collection_products'].values.tolist(),
        'dataproduct_type_products': search_data['dataproduct_type_products'].values.tolist(),
        'description': search_data['description'].values.tolist(),
        'type': search_data['type'].values.tolist(),
        'dataURI': search_data['dataURI'].values.tolist(),
        'productType': search_data['productType'].values.tolist(),
        'productGroupDescription': search_data['productGroupDescription'].values.tolist(),
        'productSubGroupDescription': search_data['productSubGroupDescription'].values.tolist(),
        'productDocumentationURL': search_data['productDocumentationURL'].values.tolist(),
        'project_products': search_data['project_products'].values.tolist(),
        'prvversion': search_data['prvversion'].values.tolist(),
        'proposal_id_products': search_data['proposal_id_products'].values.tolist(),
        'productFilename': search_data['productFilename'].values.tolist(),
        'size': search_data['size'].values.tolist(),
        'parent_obsid': search_data['parent_obsid'].values.tolist(),
        'dataRights_products': search_data['dataRights_products'].values.tolist(),
        'calib_level_products': search_data['calib_level_products'].values.tolist(),
        'author': search_data['author'].values.tolist(),
        'mission': search_data['mission'].values.tolist(),
        'year': search_data['year'].values.tolist(),
        'sort_order': search_data['sort_order'].values.tolist(),
    }
    return search


if __name__ == "__main__":
    app.run(debug=True)