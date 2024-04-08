import os
import lightkurve as lk
import numpy as np
import pandas as pd
from wotan import flatten
import csv
from statsmodels.tsa.seasonal import seasonal_decompose
import numpy as np
import pandas as pd
import lightkurve as lk
import requests
from astroquery.mast import Catalogs
from tslearn.preprocessing import TimeSeriesResampler
from sklearn.preprocessing import MinMaxScaler

value_df = 10000
num_planets = 0

def install_datasets():
    datasets = [
        ("1VCI3JlN3IHheNCJ7YbTUfQ5M3x2bn_Mz","./Datasets/star1.csv"),
        ("1vgRCWTXid6tordkbLI4OqUQC7UpmoZwc","./Datasets/star2.csv"),
        ("1NFYDKSj-wCqmNJkA_fUxSkUnJdePW3-j","./Datasets/star3.csv"),
        ("1sLNInRE2QBf5oY2t47pyLPj2itMdJuQ2","./Datasets/star4.csv"),
        ("17nmD760i-k8duNJeNArVKajaZ30tqO2L","./Datasets/confirmed_stars.csv"),
    ]
    for i in datasets:
        file_id = i[0]
        url = f"https://drive.google.com/uc?export=download&id={file_id}"
        response = requests.get(url)
        open(i[1], 'wb').write(response.content)
        
def get_planet_ids():
    stars1 = pd.read_csv('./Datasets/star1.csv')
    stars2 = pd.read_csv('./Datasets/star2.csv')
    stars3 = pd.read_csv('./Datasets/star3.csv')
    stars4 = pd.read_csv('./Datasets/star4.csv')
    stars = pd.concat([stars1,stars2,stars3,stars4])
    stars = stars.drop_duplicates('target_name')
    stars['target_name'] = stars['target_name'].apply(lambda x: 'TIC ' + str(x))
    confirmed_stars = pd.read_csv('./Datasets/confirmed_stars.csv')
    confirmed_stars['tid'] = confirmed_stars['tid'].apply(lambda x: 'TIC ' + str(x))
    stars['confirmed_planet'] = stars['target_name'].isin(confirmed_stars['tid']).astype(int)
    stars = stars.reset_index()
    confirmed_index = np.array(stars[stars['confirmed_planet']==1].index)
    unconfirmed_index = np.array(stars[stars['confirmed_planet']==0].index)
    return stars, confirmed_index, unconfirmed_index

def init_new_dataset():
    with open('./Datasets/exoplanet_star_updated_flux_1.csv', 'w', newline="", encoding="utf-8") as file:
        csvwriter = csv.writer(file)
        csvwriter.writerow(np.concatenate([['tid', 'confirmed_planet'], np.arange(1, value_df+1)]))

def populate_dataset(stars, confirmed_index, unconfirmed_index):
    for planet_index in range(0,10000):
        for conf_index in ['confirmed','nonconfirmed']:
            idno = ""
            planet = ""
            if conf_index == 'confirmed':
                idno = stars.iloc[confirmed_index[planet_index]]['target_name']
                planet = stars.iloc[confirmed_index[planet_index]]['confirmed_planet']
            else:
                idno = stars.iloc[unconfirmed_index[planet_index]]['target_name']
                planet = stars.iloc[unconfirmed_index[planet_index]]['confirmed_planet']
            sectorsdata = lk.search_lightcurve(idno, author=["TESS-SPOC"], exptime=1800)
            if(sectorsdata.download_all()!= None):
                sectors = sectorsdata.download_all()
                #shutil.rmtree('~/.lightkurve/cache/mastDownload/') # Preferrably use this line to remove the cache files by finding lightkurve cache directory
                for i in sectors:
                    i.flux = i.pdcsap_flux.value.unmasked
                    i.flux_err = i.pdcsap_flux_err.value.unmasked
                stitched_lc = sectors.stitch()
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
                trend = TimeSeriesResampler(sz=value_df).fit_transform(decompose_result_mult.trend)[0]
                scaler = MinMaxScaler()
                print(trend)
                new_ts = np.array(trend[0])
                new_new_ts = scaler.fit_transform(new_ts)
                with open('./Datasets/exoplanet_star_updated_flux_1.csv', 'a', newline="", encoding="utf-8") as file:
                    csvwriter = csv.writer(file)
                    csvwriter.writerow([i[0] for i in new_new_ts])
                num_planets += 1
                print(num_planets)
        
def get_star_metadata():
    star = pd.read_csv('./Datasets/exoplanet_star_updated_flux_1.csv')
    star_list = [int(i[0][4:]) for i in star[['tid']].to_numpy()]
    catalog_data = Catalogs.query_criteria(catalog="Tic", ID=star_list)
    catalog_data = catalog_data[['ID','Teff','logg','MH','rad','mass','rho','lum','Tmag','ra','dec','plx']]
    catalog_data['ID'] = ['TIC ' + str(id) for id in catalog_data['ID']]
    catalog_data = catalog_data.to_pandas()
    catalog_data = catalog_data.rename(columns={'ID': 'tid'})
    new_star = pd.merge(star, catalog_data, on='tid', how='inner')
    new_star = new_star.drop_duplicates(subset='tid', keep='first')
    new_star = new_star.fillna(0)
    return new_star

def __main__():
    if not os.path.exists('./Datasets'):
        os.makedirs('./Datasets')
        install_datasets()
    stars, confirmed_index, unconfirmed_index = get_planet_ids()
    init_new_dataset()
    populate_dataset(stars, confirmed_index, unconfirmed_index)
    star_dataset = get_star_metadata()
    star_dataset.to_csv('./Datasets/updated_database_exoplanet_1.csv')
    
__main__()