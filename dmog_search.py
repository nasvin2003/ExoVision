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

gpus = tf.config.list_physical_devices('GPU')
print("Number of GPUs : ",len(gpus))
for gpu in gpus:
        tf.config.experimental.set_memory_growth(gpu, True)
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
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, Dense, Dropout, MaxPooling1D, Flatten, LeakyReLU
from scikeras.wrappers import KerasClassifier
from sklearn.model_selection import GridSearchCV


def create_model(conv_config='32-3', dense_config='64', pre_flatten_dropout=0.0, dense_dropout_config=(0,), use_leaky_relu=False):
    model = Sequential()
    print("Trying out ",conv_config,dense_config,pre_flatten_dropout,dense_dropout_config,use_leaky_relu)
    input_shape = (10000, 1)  # Adjust as per your input features

    conv_layers = conv_config.split('-')
    model.add(Input(input_shape if i == 0 else None))
    for i in range(0, len(conv_layers), 2):
        filters = int(conv_layers[i])
        kernel_size = int(conv_layers[i+1])
        model.add(Conv1D(filters=filters, kernel_size=kernel_size, activation=None if use_leaky_relu else 'relu'))
        if use_leaky_relu:
            model.add(LeakyReLU(alpha=0.01))
        model.add(MaxPooling1D(pool_size=2))

    if pre_flatten_dropout > 0:
        model.add(Dropout(rate=pre_flatten_dropout))

    model.add(Flatten())

    dense_units = [int(x) for x in dense_config.split('-')]
    for i, units in enumerate(dense_units):
        model.add(Dense(units=units, activation=None if use_leaky_relu else 'relu'))
        if use_leaky_relu:
            model.add(LeakyReLU(alpha=0.01))
        if i < len(dense_dropout_config):
            model.add(Dropout(rate=dense_dropout_config[i]))

    model.add(Dense(1, activation='sigmoid'))  # Adjust for your output

    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    return model

def generate_conv_configs(filters_options=['16', '32', '64'], kernel_sizes_options=['3', '5', '7'], max_layers=4):
    configs = []
    for num_layers in range(1, max_layers + 1):
        for combo in itertools.product(*[filters_options, kernel_sizes_options]*num_layers):
            config = '-'.join(combo)
            configs.append(config)
    return configs

conv_configs = generate_conv_configs()

early_stopping_callback = EarlyStopping(monitor='loss', patience=3, restore_best_weights=True)

model = KerasClassifier(build_fn=create_model, epochs=10, verbose=0, callbacks=[early_stopping_callback])

param_grid = {
    'model__conv_config': conv_configs,
    'model__dense_config': ['64', '128', '64-128', '128-64'],
    'model__pre_flatten_dropout': [0.0, 0.25, 0.5],
    'model__dense_dropout_config': [(0,), (0.25,), (0.5,), (0.25, 0.25), (0.5, 0.5), (0.25, 0.5), (0.5, 0.25)],
    'model__use_leaky_relu': [False, True]
}

grid = GridSearchCV(estimator=model, param_grid=param_grid, n_jobs=1, cv=3)
# Assuming X_train and y_train are already defined
grid_result = grid.fit(X_train, y_train)

print("Best: %f using %s" % (grid_result.best_score_, grid_result.best_params_))