import pymongo
from datetime import datetime, timedelta
import os
from bson import json_util
from boto.s3.connection import S3Connection
from boto.s3.key import Key

AWS_KEY = os.environ['AWS_ACCESS_KEY']
AWS_SECRET = os.environ['AWS_SECRET_KEY']

def daterange(start_date, end_date):
    for n in range(int((end_date - start_date).days)):
        yield start_date + timedelta(n)

def dumpit(crime, weather):
    # s3conn = S3Connection(AWS_KEY, AWS_SECRET)
    # bucket = S3conn.get_bucket('www.crimesaround.us')
    for single_date in daterange(datetime(2013, 1, 1), datetime.now()):
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
                    'crimes': {
                        'meta': {
                            'total': len(crimes),
                            'ARSON': len([c for c in crimes if c.get('Primary Type') == 'ARSON']),
                            'ASSAULT': len([c for c in crimes if c.get('Primary Type') == 'ASSAULT']),
                            'BATTERY': len([c for c in crimes if c.get('Primary Type') == 'BATTERY']),
                            'BURGLARY': len([c for c in crimes if c.get('Primary Type') == 'BURGLARY']),
                            'CRIM SEXUAL ASSAULT': len([c for c in crimes if c.get('Primary Type') == 'CRIM SEXUAL ASSAULT']),
                            'CRIMINAL DAMAGE': len([c for c in crimes if c.get('Primary Type') == 'CRIMINAL DAMAGE']),
                            'CRIMINAL TRESPASS': len([c for c in crimes if c.get('Primary Type') == 'CRIMINAL TRESPASS']),
                            'DECEPTIVE PRACTICE': len([c for c in crimes if c.get('Primary Type') == 'DECEPTIVE PRACTICE']),
                            'DOMESTIC VIOLENCE': len([c for c in crimes if c.get('Primary Type') == 'DOMESTIC VIOLENCE']),
                            'GAMBLING': len([c for c in crimes if c.get('Primary Type') == 'GAMBLING']),
                            'HOMICIDE': len([c for c in crimes if c.get('Primary Type') == 'HOMICIDE']),
                            'INTERFERE WITH PUBLIC OFFICER': len([c for c in crimes if c.get('Primary Type') == 'INTERFERE WITH PUBLIC OFFICER']),
                            'INTERFERENCE WITH PUBLIC OFFICER': len([c for c in crimes if c.get('Primary Type') == 'INTERFERENCE WITH PUBLIC OFFICER']),
                            'INTIMIDATION': len([c for c in crimes if c.get('Primary Type') == 'INTIMIDATION']),
                            'KIDNAPPING': len([c for c in crimes if c.get('Primary Type') == 'KIDNAPPING']),
                            'LIQUOR LAW VIOLATION': len([c for c in crimes if c.get('Primary Type') == 'LIQUOR LAW VIOLATION']),
                            'MOTOR VEHICLE THEFT': len([c for c in crimes if c.get('Primary Type') == 'MOTOR VEHICLE THEFT']),
                            'NARCOTICS': len([c for c in crimes if c.get('Primary Type') == 'NARCOTICS']),
                            'NON-CRIMINAL': len([c for c in crimes if c.get('Primary Type') == 'NON-CRIMINAL']),
                            'NON-CRIMINAL (SUBJECT SPECIFIED)': len([c for c in crimes if c.get('Primary Type') == 'NON-CRIMINAL (SUBJECT SPECIFIED)']),
                            'OBSCENITY': len([c for c in crimes if c.get('Primary Type') == 'OBSCENITY']),
                            'OFFENSE INVOLVING CHILDREN': len([c for c in crimes if c.get('Primary Type') == 'OFFENSE INVOLVING CHILDREN']),
                            'OFFENSES INVOLVING CHILDREN': len([c for c in crimes if c.get('Primary Type') == 'OFFENSES INVOLVING CHILDREN']),
                            'OTHER NARCOTIC VIOLATION': len([c for c in crimes if c.get('Primary Type') == 'OTHER NARCOTIC VIOLATION']),
                            'OTHER OFFENSE': len([c for c in crimes if c.get('Primary Type') == 'OTHER OFFENSE']),
                            'PROSTITUTION': len([c for c in crimes if c.get('Primary Type') == 'PROSTITUTION']),
                            'PUBLIC INDECENCY': len([c for c in crimes if c.get('Primary Type') == 'PUBLIC INDECENCY']),
                            'PUBLIC PEACE VIOLATION': len([c for c in crimes if c.get('Primary Type') == 'PUBLIC PEACE VIOLATION']),
                            'RITUALISM': len([c for c in crimes if c.get('Primary Type') == 'RITUALISM']),
                            'ROBBERY': len([c for c in crimes if c.get('Primary Type') == 'ROBBERY']),
                            'SEX OFFENSE': len([c for c in crimes if c.get('Primary Type') == 'SEX OFFENSE']),
                            'STALKING': len([c for c in crimes if c.get('Primary Type') == 'STALKING']),
                            'THEFT': len([c for c in crimes if c.get('Primary Type') == 'THEFT']),
                            'WEAPONS VIOLATION': len([c for c in crimes if c.get('Primary Type') == 'WEAPONS VIOLATION']),
                        },
                        'data': crimes
                    },
                    'geojson': {
                        'type': 'FeatureCollection',
                        'features': [{
                            'type': 'Feature',
                            'geometry': f.get('Location'),
                            'properties': {
                                'title': f.get('Primary Type'),
                                'description': f.get('Description')
                            }
                        } for f in crimes]
                    }
                }
                f = open('data/%s/%s/%s.json' % (single_date.year, single_date.month, single_date.day), 'wb')
                f.write(json_util.dumps(out, indent=4))
                f.close()
                # k = Key(bucket)
                # k.key = 'data/%s/%s/%s.json' % (single_date.year, single_date.month, single_date.day)
                # k.set_contents_from_string(json_util.dumps(out, indent=4))

if __name__ == '__main__':
    c = pymongo.MongoClient()
    db = c['chicago']
    crime = db['crime']
    weather = db['weather']
    dumpit(crime, weather)
