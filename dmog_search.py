import sys
import os
import time
from lightkurve import search_targetpixelfile
from lightkurve import TessTargetPixelFile
import lightkurve as lk
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from keras.models import load_model
from keras.optimizers import Adam
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, Activation, Conv1D, MaxPooling1D, Input, Flatten
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
from multiprocessing import Pool
import multiprocessing
import numpy as np
import pandas as pd
import lightkurve as lk
from scipy.signal import find_peaks
from astropy.timeseries import BoxLeastSquares
from scipy.interpolate import interp1d
import itertools
from keras.callbacks import EarlyStopping
from ray import train, tune
from tensorflow.keras.callbacks import EarlyStopping
from ray.tune.integration.keras import TuneReportCallback
import ray



value_df = 10000
os.chdir('Satellite Datasets')
star_check = pd.read_csv("exoplanet_star_updated_flux.csv")
star_check = star_check.drop(['tid'],axis=1)
star_check_y = star_check[['confirmed_planet']]
star_check = star_check.reset_index().drop('index',axis=1)
star_check = star_check.drop('confirmed_planet',axis=1).apply(lambda row: row.fillna(0), axis=1)
star_check[['confirmed_planet']] = star_check_y
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(star_check.drop('confirmed_planet',axis=1),star_check[['confirmed_planet']], test_size=0.1, random_state=42)

def generate_conv_configs(filters_options=['8', '16', '32', '64', '128'], kernel_sizes_options=['3', '5', '7'], max_layers=4):
    configs = []
    for num_layers in range(1, max_layers + 1):
        for combo in itertools.product(*[filters_options, kernel_sizes_options]*num_layers):
            config = '-'.join(combo)
            configs.append(config)
    return configs

conv_configs = generate_conv_configs()

search_space = {
    "conv_layers": tune.choice(conv_configs),
    "dense_config": tune.choice(['64', '128', '64-128', '128-64','64-64']),
    "batch_size": tune.grid_search([32,64,128]),
    'pre_flatten_dropout': tune.choice([0.0, 0.25, 0.5]),
    'model__dense_dropout_config': tune.choice([(0,), (0.25,), (0.5,), (0.25, 0.25), (0.5, 0.5), (0.25, 0.5), (0.5, 0.25)])
}



def model_build(config):
    model = Sequential()
    input_shape = (10000, 1)  # Assuming each sample is a sequence of 10000 steps with 1 feature

    conv_layers = config['conv_config'].split('-')
    for i in range(0, len(conv_layers), 2):
        filters = int(conv_layers[i])
        kernel_size = int(conv_layers[i+1])
        if i == 0:
            model.add(Conv1D(filters=filters, kernel_size=kernel_size, activation='relu', input_shape=input_shape))
        else:
            model.add(Conv1D(filters=filters, kernel_size=kernel_size, activation='relu'))
        model.add(MaxPooling1D(pool_size=2))

    if config['pre_flatten_dropout'] > 0:
        model.add(Dropout(rate=config['pre_flatten_dropout']))

    model.add(Flatten())

    dense_units = [int(x) for x in config['dense_config'].split('-')]
    for i, units in enumerate(dense_units):
        model.add(Dense(units=units, activation='relu'))
        if 'dense_dropout_config' in config and i < len(config['dense_dropout_config']):
            model.add(Dropout(rate=config['dense_dropout_config'][i]))

    model.add(Dense(1, activation='sigmoid'))
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    return model

def objective(config, X_train=None, X_test=None, y_train=None, y_test=None):
    
    model = model_build(config)

    X_train_reshaped = X_train.values.reshape((-1, 10000, 1))
    X_test_reshaped = X_test.values.reshape((-1, 10000, 1))

    early_stopping = EarlyStopping(monitor='val_loss', patience=10)

    model.fit(X_train_reshaped, y_train, 
              validation_data=(X_test_reshaped, y_test), 
              epochs=100, 
              callbacks=[early_stopping],
              batch_size=config['batch_size'])
    
    train_acc = model.evaluate(X_train_reshaped, y_train)
    test_acc = model.evaluate(X_test_reshaped, y_test)
    
    print("Train Accuracy : ",train_acc,"Test Accuracy : ",test_acc)
    
    score = test_acc[1]
    # if test_acc[1] > 0.9 and train_acc[1] > 0.9:
    #     score = test_acc[1]
    # elif train_acc[1] > 0.9:
    #     score = test_acc[1]/1.5
    # elif test_acc[1] > 0.8 and train_acc[1] > 0.8:
    #     score = test_acc[1]/2
    # elif train_acc[1] > 0.8:
    #     score = test_acc[1]/2.5
    # elif test_acc[1] > 0.7 and train_acc[1] > 0.7:
    #     score = test_acc[1]/4
    # elif test_acc[1] > 0.6 and train_acc[1] > 0.6:
    #     score = test_acc[1]/2
    # else:
    #     score = 0
        
    return {"score": score}


if not ray.is_initialized():
    ray.init()

analysis = tune.run(
    tune.with_parameters(
        objective,
        X_train=X_train,
        X_test=X_test,
        y_train=y_train,
        y_test=y_test
    ),
    config=search_space,
    num_samples=500,  # You can adjust this based on how many samples you want to run
    resources_per_trial={"cpu": 8, "gpu": 0},  # Adjust based on your hardware
    metric="score",  # Or another metric you defined in your objective function
    mode="max"  # Assuming you're maximizing the metric
)

# Extract and print the best trial information
best_trial = analysis.get_best_trial("score", "max", "all")
print("Best trial config: {}".format(best_trial.config))
print("Best trial final validation score: {}".format(best_trial.last_result["score"]))