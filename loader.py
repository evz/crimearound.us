import requests
import os
import json
import pymongo
from datetime import datetime, timedelta
from utils import sign_google

CRIMES = 'http://data.cityofchicago.org/resource/ijzp-q8t2.json'
MOST_WANTED = 'http://api1.chicagopolice.org/clearpath/api/1.0/mostWanted/list'

class SocrataError(Exception): 
    def __init__(self, message):
        Exception.__init__(self, message)
        self.message = message

# In Feature properties, define title and description keys. Can also 
# define marker-color, marker-size, marker-symbol and marker-zoom.

def geocode_it(block):
    add_parts = block.split()
    add_parts[0] = str(int(add_parts[0].replace('X', '0')))
    address = '%s Chicago, IL' % ' '.join(add_parts)
    params = {'address': address, 'sensor': 'false'}
    u = sign_google('http://maps.googleapis.com/maps/api/geocode/json', params)
    r = requests.get(u)
    resp = json.loads(r.content.decode('utf-8'))
    try:
        res = resp['results'][0]
        p = (float(res['geometry']['location']['lng']), float(res['geometry']['location']['lat']))
        feature = {'type': 'Point', 'coordinates': p}
    except IndexError:
        print resp
        feature = {'type': 'Point'}
    return feature

def get_crimes():
    c = pymongo.MongoClient()
    db = c['chicago']
    coll = db['crime']
    crimes = requests.get(CRIMES)
    existing = 0
    new = 0
    if crimes.status_code == 200:
        for crime in crimes.json():
            for k,v in crime.items():
                crime[' '.join(k.split('_')).title()] = v
                del crime[k]
            try:
                crime['Location'] = {
                    'type': 'Point',
                    'coordinates': (float(crime['Longitude']), float(crime['Latitude']))
                }
            except KeyError:
                print 'Gotta geocode %s' % crime['Block']
                crime['Location'] = geocode_it(crime['Block'])
            crime['Updated On'] = datetime.strptime(crime['Updated On'], '%Y-%m-%dT%H:%M:%S')
            crime['Date'] = datetime.strptime(crime['Date'], '%Y-%m-%dT%H:%M:%S')
            update = coll.update({'Case Number': crime['Case Number']}, crime, upsert=True)
            if update['updatedExisting']:
                existing += 1
            else:
                new += 1
        print 'Updated %s, Created %s' % (existing, new)
    else:
        raise SocrataError('Socrata API responded with a %s status code: %s' % (crimes.status_code, crimes.content[300:]))
    return None

if __name__ == '__main__':
    get_crimes()
