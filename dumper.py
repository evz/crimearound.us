import pymongo
from datetime import datetime, timedelta
import os
from bson import json_util
from boto.s3.connection import S3Connection
from boto.s3.key import Key
from utils import make_meta

AWS_KEY = os.environ['AWS_ACCESS_KEY']
AWS_SECRET = os.environ['AWS_SECRET_KEY']

def daterange(start_date, end_date):
    for n in range(int((end_date - start_date).days)):
        yield start_date + timedelta(n)

def dumpit(crime, weather):
    s3conn = S3Connection(AWS_KEY, AWS_SECRET)
    bucket = s3conn.get_bucket('crime.static-eric.com')
    for single_date in daterange(datetime(2001, 1, 1), datetime.now()):
        weat = [w for w in weather.find({'DATE': single_date})]
        if len(weat) > 0:
            midnight = single_date.replace(hour=0).replace(minute=0)
            one_til = single_date.replace(hour=23).replace(minute=59)
            crimes = [c for c in crime.find({'Date': {'$gt': midnight, '$lt': one_til}})]
            if len(crimes) > 0:
                try:
                    os.makedirs('data/%s/%s/' % (single_date.year, single_date.month))
                except os.error:
                    pass
                out = {
                    'weather': {
                        'CELSIUS_MIN': weat[0]['CELSIUS_MIN'],
                        'CELSIUS_MAX': weat[0]['CELSIUS_MAX'],
                        'FAHR_MAX': weat[0]['FAHR_MAX'],
                        'FAHR_MIN': weat[0]['FAHR_MIN'],
                    }, 
                    'meta': make_meta(crimes),
                    'geojson': {
                        'type': 'FeatureCollection',
                        'features': [{
                            'type': 'Feature',
                            'geometry': f.get('Location'),
                            'properties': {
                                'title': f.get('Primary Type').title(),
                                'description': f.get('Description').title(), 
                                'key': '_'.join(f.get('Primary Type').lower().split()),
                                'arrest': f.get('Arrest'),
                                'beat': f.get('Beat'),
                                'block': f.get('Block'),
                                'community_area': f.get('Community Area'),
                                'district': f.get('District'),
                                'domestic': f.get('Domestic'),
                                'location_desc': f.get('Location Description'),
                                'ward': f.get('Ward')
                            }
                        } for f in crimes]
                    }
                }
                # f = open('data/%s/%s/%s.json' % (single_date.year, single_date.month, single_date.day), 'wb')
                # f.write(json_util.dumps(out, indent=4, sort_keys=True))
                # f.close()
                k = Key(bucket)
                k.key = 'data/%s/%s/%s.json' % (single_date.year, single_date.month, single_date.day)
                k.set_contents_from_string(json_util.dumps(out, indent=4))
                k.set_acl('public-read')
                print 'Uploaded %s' % k.key

if __name__ == '__main__':
    c = pymongo.MongoClient()
    db = c['chicago']
    crime = db['crime']
    weather = db['weather']
    dumpit(crime, weather)
