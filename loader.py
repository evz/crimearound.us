import requests
import os
import json
from datetime import datetime, timedelta
#from boto.s3.connection import S3Connection
from pyproj import Proj, transform

CRIMES = 'http://api1.chicagopolice.org/clearpath/api/1.0/crimes/list'
MOST_WANTED = 'http://api1.chicagopolice.org/clearpath/api/1.0/mostWanted/list'

class ClearPathError(Exception): 
    def __init__(self, message):
        Exception.__init__(self, message)
        self.message = message

# In Feature properties, define title and description keys. Can also 
# define marker-color, marker-size, marker-symbol and marker-zoom.

def get_crimes():
    today = datetime.now()
    then = today - timedelta(days=7)
    req_date = datetime.strftime(then, '%m-%d-%Y')
    crimes = requests.get(CRIMES, params={'dateOccurred': req_date, max:100})
    if crimes.status_code == 200:
        headers = crimes.json()[0].keys()
        headers.extend(['x', 'y'])
        il_east_proj = Proj(init="epsg:3435", preserve_units=True)
        geojson = {'type': 'FeatureCollection', 'features': []}
        for crime in crimes.json():
            crime_date = datetime.strptime(crime['dateOccurred'], '%b-%d-%Y')
            fname = 'geojson/%s/%s-%s-%s.json' % (crime['primary'], crime_date.month, crime_date.day, crime_date.year)
            try:
                f = open(fname, 'rb')
                incoming = json.loads(f.read())
                f.close()
            except IOError:
                incoming = geojson
            if crime['xCoordinate'] and crime['yCoordinate']:
                feature = {
                    'type': 'Feature', 
                    'geometry': {
                        'type': 'Point', 
                        'coordinates': []
                    },
                    'properties': {}
                }
                x, y = il_east_proj(float(crime['xCoordinate']), float(crime['yCoordinate']), inverse=True)
                feature['geometry']['coordinates'].extend([x,y])
                for k,v in crime.items():
                    feature['properties'][k] = v
                try:
                    os.mkdir('geojson/%s' % (crime['primary']))
                except OSError:
                    pass
                incoming['features'].append(feature)
                f = open(fname, 'wb')
                f.write(json.dumps(incoming, indent=4))
                f.close()
            else:
                continue
        out = open('geojson/%s.json' % req_date, 'wb')
    else:
        raise ClearPathError('ClearPath API responded with a %s status code: %s' % (crimes.status_code, crimes.content[300:]))
    return None

if __name__ == '__main__':
    get_crimes()
