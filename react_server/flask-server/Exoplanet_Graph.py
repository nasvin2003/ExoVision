import sys
import os
import time
from flask import Flask, request, jsonify, send_from_directory
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
from keras.models import Model, Sequential
from keras.layers import Input, Dense, Conv1D, Flatten, MaxPooling1D, Concatenate, Dropout
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
from tslearn.preprocessing import TimeSeriesResampler
from sklearn.preprocessing import MinMaxScaler
import pandas as pd
from astropy.time import Time
import astropy.io.fits as fits
import pyodbc
import logging
from flask_cors import CORS


app = Flask(__name__)
CORS(app) 

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
            
        stitched_lc = sectors.stitch()

        time = stitched_lc['time'].value
        flux = stitched_lc['pdcsap_flux'].value

        plt.figure(figsize=(9.10, 2.15))
        plt.plot(time,flux, color="#FF4C29")
        plt.gcf().set_facecolor('#202123')  # Set background color of the figure
        plt.grid(False)
        plt.axis('off')
        plt.savefig(general_plot_path)
        plt.close()

        min_period = 1
        max_period = 1000
        num_periods = 10000
        period_time = np.logspace(np.log10(min_period), np.log10(max_period), num_periods)
        bls_periodogram = stitched_lc.to_periodogram(method='bls', period=period_time)
        planet_period = bls_periodogram.period_at_max_power
        planet_t0 = bls_periodogram.transit_time_at_max_power
        folded_light_curve = stitched_lc.fold(period=planet_period, epoch_time=planet_t0)
        flatten_lc, trend_lc = flatten(folded_light_curve.time.value, folded_light_curve.flux, method='biweight', return_trend=True)
        light = pd.DataFrame({'Time':folded_light_curve.time.value,'Flux':flatten_lc}).dropna()
        flux_series = pd.Series([i[0] for i in light[['Flux']].to_numpy()], index=[i[0] for i in light[['Time']].to_numpy()])
        decompose_result_mult = seasonal_decompose(flux_series, model="additive", period=int(planet_period.value))
        trend = TimeSeriesResampler(sz=10000).fit_transform(np.array(decompose_result_mult.trend))[0]
        
        status = 0
        model = input_flux = Input(shape=(10000,1))
        x = Conv1D(filters=64, kernel_size=3, activation='relu')(input_flux)
        x = MaxPooling1D(pool_size=2)(x)
        x = Conv1D(filters=64, kernel_size=5, activation='relu')(x)
        x = MaxPooling1D(pool_size=2)(x)
        x = Conv1D(filters=64, kernel_size=5, activation='relu')(x)
        x = MaxPooling1D(pool_size=2)(x)
        x = Flatten()(x)
        x = Dropout(0.75)(x)
        model_flux = Model(inputs=input_flux, outputs=x)

        input_params = Input(shape=(11,))
        y = Dense(128, activation='relu')(input_params)
        model_params = Model(inputs=input_params, outputs=y)

        combined = Concatenate()([model_flux.output, model_params.output])
        z = Dropout(0.5)(combined)
        z = Dense(128, activation='relu')(z)
        final_output = Dense(1, activation='sigmoid')(z)

        model = Model(inputs=[model_flux.input, model_params.input], outputs=final_output)
        
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        
        model.load_weights('../../Models/model_weights_v5.h5')
        
        catalog_data = Catalogs.query_criteria(catalog="Tic", ID=int(identifier[4:]))[['Teff','logg','MH','rad','mass','rho','lum','Tmag','ra','dec','plx']].to_pandas().fillna(0)
        
        scaler = MinMaxScaler()
        catalog_data = scaler.fit_transform(catalog_data)
    
        status_val = model.predict([trend.reshape(1, 10000, 1), catalog_data.reshape(1, -1)], verbose=0)
        if status_val == 1:
            status = "Potential Exoplanet Candidate"
        else:
            status = "No Exoplanet Transit Signals Detected"
        
        plt.figure(figsize=(9.10, 2.15))
        plt.plot(range(10000), trend, color="#FF4C29")
        plt.gcf().set_facecolor('#202123')  # Set background color of the figure
        plt.grid(False)
        plt.axis('off')
        plt.savefig(trend_plot_path)
        plt.close()

        return jsonify({
        'general_plot_url': f'/api/images/{identifier}_general_plot.png',
        'trend_plot_url': f'/api/images/{identifier}_trend_plot.png',
        'status': status
    })


@app.route('/api/images/<filename>')
def serve_image(filename):
    images_dir = os.path.join(tempfile.gettempdir(), 'plot_images')
    return send_from_directory(images_dir, filename)

@app.route('/api/archive')
def get_archive():
    server = 'exovision.database.windows.net'
    database = 'exovision-starlist'
    username = 'exovision'
    password = 'password@123'

    cnxn = pyodbc.connect(
        'DRIVER={ODBC Driver 18 for SQL Server};'
        'SERVER=' + server + ';'
        'DATABASE=' + database + ';'
        'UID=' + username + ';'
        'PWD=' + password
    )

    crsr = cnxn.cursor()

    crsr.execute("SELECT * FROM exovision_stars")

    row = crsr.fetchall()
    archive = pd.DataFrame([[i[0],i[1],i[2]] for i in row], columns=[i[0] for i in crsr.description])
    archive.reset_index(drop=True, inplace=True)

    crsr.close()
    cnxn.close()
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

@app.route('/upload', methods=['POST', 'GET'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"})
    file = request.files['file']
    # print(file)
    if file.filename == '':
        return jsonify({"error": "No selected file"})
    if file and file.filename.endswith('.fits'):
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file.filename)
        
        file.save(file_path)
        temp = process_file(file_path)
        return temp
    return jsonify({"error": "Invalid file format"})

def process_file(file):
    images_dir = os.path.join(tempfile.gettempdir(), 'plot_images')
    os.makedirs(images_dir, exist_ok=True)

    general_plot_path = os.path.join(images_dir, f'custom_general_plot.png')
    trend_plot_path = os.path.join(images_dir, f'custom_trend_plot.png')
    try:
        with fits.open(file) as hdulist:
            time = hdulist[1].data['TIME'].astype(float)
            flux = hdulist[1].data['PDCSAP_FLUX'].astype(float)
            error = hdulist[1].data['PDCSAP_FLUX_ERR'].astype(float)

            finite_mask = np.isfinite(time) & np.isfinite(flux) & np.isfinite(error)
            time, flux, error = time[finite_mask], flux[finite_mask], error[finite_mask]
            
            lc = lk.LightCurve(time=Time(time, format='jd'), flux=flux, flux_err=error)

            # Simple example o folding and plotting
            period = 10  # This should be determined via analysis such as BLS
            folded_lc = lc.fold(period=period)
            plt.figure()
            plt.plot(folded_lc.time.value, folded_lc.flux, 'k.')
            plt.xlabel('Phase')
            plt.ylabel('Flux')
            plt.title('Folded Light Curve')
            plt.savefig(general_plot_path)
            plt.close()
        
            stitched_lc = lc
            min_period = 1
            max_period = 1000
            num_periods = 10000
            period_time = np.logspace(np.log10(min_period), np.log10(max_period), num_periods)
            bls_periodogram = stitched_lc.to_periodogram(method='bls', period=period_time)
            planet_period = bls_periodogram.period_at_max_power
            planet_t0 = bls_periodogram.transit_time_at_max_power
            folded_light_curve = stitched_lc.fold(period=planet_period)
            flatten_lc, trend_lc = flatten(folded_light_curve.time.value, folded_light_curve.flux, method='biweight', return_trend=True)
            light = pd.DataFrame({'Time':folded_light_curve.time.value,'Flux':flatten_lc}).dropna()
            flux_series = pd.Series([i[0] for i in light[['Flux']].to_numpy()], index=[i[0] for i in light[['Time']].to_numpy()])
            decompose_result_mult = seasonal_decompose(flux_series, model="additive", period=int(planet_period.value))
            trend = TimeSeriesResampler(sz=10000).fit_transform(np.array(decompose_result_mult.trend))[0]
            
            status = 0
            model = input_flux = Input(shape=(10000,1))
            x = Conv1D(filters=64, kernel_size=3, activation='relu')(input_flux)
            x = MaxPooling1D(pool_size=2)(x)
            x = Conv1D(filters=64, kernel_size=5, activation='relu')(x)
            x = MaxPooling1D(pool_size=2)(x)
            x = Conv1D(filters=64, kernel_size=5, activation='relu')(x)
            x = MaxPooling1D(pool_size=2)(x)
            x = Flatten()(x)
            x = Dropout(0.75)(x)
            model_flux = Model(inputs=input_flux, outputs=x)

            input_params = Input(shape=(11,))
            y = Dense(128, activation='relu')(input_params)
            model_params = Model(inputs=input_params, outputs=y)

            combined = Concatenate()([model_flux.output, model_params.output])
            z = Dropout(0.5)(combined)
            z = Dense(128, activation='relu')(z)
            final_output = Dense(1, activation='sigmoid')(z)

            model = Model(inputs=[model_flux.input, model_params.input], outputs=final_output)
            
            model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            
            model.load_weights('../../Models/model_weights_v5.h5')

            status_val = model.predict([trend.reshape(1, 10000, 1), np.array([0,0,0,0,0,0,0,0,0,0,0]).reshape(1, -1)])
            if status_val == 1:
                status = "Potential Exoplanet Candidate"
            else:
                status = "No Exoplanet Transit Signals Detected"
            
            if status == "Potential Exoplanet Candidate" or status == "No Exoplanet Transit Signals Detected":
                plt.figure(figsize=(9.10, 2.15))
                plt.plot(range(10000), trend, color="#FF4C29")
                plt.gcf().set_facecolor('#202123')  # Set background color of the figure
                plt.grid(False)
                plt.axis('off')
                plt.savefig(trend_plot_path)
                plt.close()

                return {
                'general_plot_url': f'/api/images/custom_general_plot.png',
                'trend_plot_url': f'/api/images/custom_trend_plot.png',
                'status': status
                }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    app.run(debug=True)