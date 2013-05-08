import requests
from base64 import b64decode
import os
import json
import pymongo
from operator import itemgetter
from itertools import groupby
from datetime import datetime, timedelta
from utils import sign_google, make_meta
from boto.s3.connection import S3Connection
from boto.s3.key import Key

CRIMES = 'http://data.cityofchicago.org/resource/ijzp-q8t2.json'
MOST_WANTED = 'http://api1.chicagopolice.org/clearpath/api/1.0/mostWanted/list'
MUGSHOTS = 'http://api1.chicagopolice.org/clearpath/api/1.0/mugshots'
WEATHER_KEY = os.environ['WEATHER_KEY']
AWS_KEY = os.environ['AWS_ACCESS_KEY']
AWS_SECRET = os.environ['AWS_SECRET_KEY']

class SocrataError(Exception): 
    def __init__(self, message):
        Exception.__init__(self, message)
        self.message = message

class WeatherError(Exception): 
    def __init__(self, message):
        Exception.__init__(self, message)
        self.message = message

class ClearPathError(Exception): 
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
    dates = []
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
            dates.append(crime['Date'])
            update = coll.update({'Case Number': crime['Case Number']}, crime, upsert=True)
            if update['updatedExisting']:
                existing += 1
            else:
                new += 1
        unique_dates = list(set([datetime.strftime(d, '%Y%m%d') for d in dates]))
        get_weather(unique_dates)
        print 'Updated %s, Created %s' % (existing, new)
    else:
        raise SocrataError('Socrata API responded with a %s status code: %s' % (crimes.status_code, crimes.content[300:]))
    return None

def get_weather(dates):
    c = pymongo.MongoClient()
    db = c['chicago']
    coll = db['weather']
    for date in dates:
        url = 'http://api.wunderground.com/api/%s/history_%s/q/IL/Chicago.json' % (WEATHER_KEY, date)
        weat = requests.get(url)
        weather = {
            'CELSIUS_MAX': None,
            'CELSIUS_MIN': None,
            'FAHR_MIN': None, 
            'FAHR_MAX': None,
        }
        if weat.status_code == 200:
            summary = weat.json()['history']['dailysummary'][0]
            weather['CELSIUS_MAX'] = summary['maxtempm']
            weather['CELSIUS_MIN'] = summary['mintempm']
            weather['FAHR_MAX'] = summary['maxtempi']
            weather['FAHR_MIN'] = summary['mintempi']
            weather['DATE'] = datetime.strptime(date, '%Y%m%d')
            update = {'$set': weather}
            up = coll.update({'DATE': datetime.strptime(date, '%Y%m%d')}, update, upsert=True)
            print 'Updated %s weather' % (date)
        else:
            raise WeatherError('Wunderground API responded with %s: %s' % (weat.status_code, weat.content[300:]))

def get_most_wanted():
    wanted = requests.get(MOST_WANTED, params={'max': 100})
    if wanted.status_code == 200:
        s3conn = S3Connection(AWS_KEY, AWS_SECRET)
        bucket = s3conn.get_bucket('crime.static-eric.com')
        wanted_list = []
        for person in wanted.json():
            warrant = person['warrantNo']
            wanted_list.append(warrant)
            mugs = requests.get(MUGSHOTS, params={'warrantNo': warrant})
            person['mugs'] = []
            if mugs.status_code == 200:
                for mug in mugs.json():
                    image_path = 'images/wanted/%s_%s.jpg' % (warrant, mug['mugshotNo'])
                    k = Key(bucket)
                    k.key = image_path
                    k.set_contents_from_string(b64decode(mug['image']))
                    k.set_acl('public-read')
                    person['mugs'].append({'angle': mug['mugshotNo'], 'image_path': image_path})
            else:
                raise ClearPathError('ClearPath API returned %s when fetching mugshots for %s: %s' % (mugs.status_code, warrant, mugs.content[300:]))
            k = Key(bucket)
            k.key = 'data/wanted/%s.json' % warrant
            k.set_contents_from_string(json.dumps(person, indent=4))
            k.set_acl('public-read')
        k = Key(bucket)
        k.key = 'data/wanted/wanted_list.json'
        k.set_contents_from_string(json.dumps(wanted_list))
        k.set_acl('public-read')
    else:
        raise ClearPathError('ClearPath API returned %s when getting most wanted list: %s' % (wanted.status_code, wanted.content[300:]))

def get_by_temp():
    c = pymongo.MongoClient()
    db = c['chicago']
    weather = db['weather']
    crime = db['crime']
    grouped = []
    for temp in range(-30, 120):
        days = [d['DATE'] for d in weather.find({'FAHR_MAX': {'$gt': temp, '$lt': temp + 1}})]
        if days:
            grouped.append({'temp': temp, 'days': days})
    for group in grouped:
        crime_summary = []
        for day in group['days']:
            crimes = [c for c in crime.find({'Date': {'$gt': day, '$lt': day + timedelta(hours=24)}})]
            crime_summary.append(make_meta(crimes))
        summary = {
            'total': 0,
            'detail': {
                'arson': 0,
                'assault': 0,
                'battery': 0,
                'burglary': 0,
                'crim_sexual_assault': 0,
                'criminal_damage': 0,
                'criminal_trespass': 0,
                'deceptive_practice': 0,
                'domestic_violence': 0,
                'gambling': 0,
                'homicide': 0,
                'interfere_with_public_officer': 0,
                'interference_with_public_officer': 0,
                'intimidation' :0,
                'kidnapping': 0,
                'liquor_law_violation': 0,
                'motor_vehicle_theft': 0,
                'narcotics': 0,
                'non_criminal': 0,
                'non_criminal_subject_specified': 0,
                'obscenity': 0,
                'offense_involving_children': 0,
                'offenses_involving_children': 0,
                'other_narcotic_violation': 0,
                'other_offense': 0,
                'prostitution': 0,
                'public_indecency': 0,
                'public_peace_violation': 0,
                'ritualism': 0,
                'robbery': 0,
                'sex_offense': 0,
                'stalking': 0,
                'theft': 0,
                'weapons_violation': 0,
            }
        }
        for cr in crime_summary:
            summary['total'] += cr['total']['value']
            for detail in cr['detail']:
                summary['detail'][detail['key']] += detail['value']
        group['summary'] = summary
    organizer = []
    for group in grouped:
        organizer.append({'key': 'total', 'temp': group['temp'], 'average': float(group['summary']['total']) / float(len(group['days']))})
        for k,v in group['summary']['detail'].items():
            organizer.append({'key': k, 'temp': group['temp'], 'average': float(v) / float(len(group['days']))})
    output = []
    organizer = sorted(organizer, key=itemgetter('key'))
    for k,g in groupby(organizer, key=itemgetter('key')):
        output.append({'key': k, 'data': list(g)})
    for group in output:
        s3conn = S3Connection(AWS_KEY, AWS_SECRET)
        bucket = s3conn.get_bucket('crime.static-eric.com')
        k = Key(bucket)
        name = 'data/weather/%s.json' % group['key']
        k.key = name
        k.set_contents_from_string(json.dumps(group, indent=4))
        k.set_acl('public-read')
        print 'Uploaded %s' % name

if __name__ == '__main__':
    #get_crimes()
    #get_most_wanted()
    get_by_temp()
