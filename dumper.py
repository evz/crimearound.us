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
                            'arson': len([c for c in crimes if c.get('Primary Type') == 'ARSON']),
                            'assault': len([c for c in crimes if c.get('Primary Type') == 'ASSAULT']),
                            'battery': len([c for c in crimes if c.get('Primary Type') == 'BATTERY']),
                            'burglary': len([c for c in crimes if c.get('Primary Type') == 'BURGLARY']),
                            'crim_sexual_assault': len([c for c in crimes if c.get('Primary Type') == 'CRIM SEXUAL ASSAULT']),
                            'criminal_damage': len([c for c in crimes if c.get('Primary Type') == 'CRIMINAL DAMAGE']),
                            'criminal_trespass': len([c for c in crimes if c.get('Primary Type') == 'CRIMINAL TRESPASS']),
                            'deceptive_practice': len([c for c in crimes if c.get('Primary Type') == 'DECEPTIVE PRACTICE']),
                            'domestic_violence': len([c for c in crimes if c.get('Primary Type') == 'DOMESTIC VIOLENCE']),
                            'gambling': len([c for c in crimes if c.get('Primary Type') == 'GAMBLING']),
                            'homicide': len([c for c in crimes if c.get('Primary Type') == 'HOMICIDE']),
                            'interfere_with_public_officer': len([c for c in crimes if c.get('Primary Type') == 'INTERFERE WITH PUBLIC OFFICER']),
                            'interference_with_public_officer': len([c for c in crimes if c.get('Primary Type') == 'INTERFERENCE WITH PUBLIC OFFICER']),
                            'intimidation': len([c for c in crimes if c.get('Primary Type') == 'INTIMIDATION']),
                            'kidnapping': len([c for c in crimes if c.get('Primary Type') == 'KIDNAPPING']),
                            'liquor_law_violation': len([c for c in crimes if c.get('Primary Type') == 'LIQUOR LAW VIOLATION']),
                            'motor_vehicle_theft': len([c for c in crimes if c.get('Primary Type') == 'MOTOR VEHICLE THEFT']),
                            'narcotics': len([c for c in crimes if c.get('Primary Type') == 'NARCOTICS']),
                            'non_criminal': len([c for c in crimes if c.get('Primary Type') == 'NON-CRIMINAL']),
                            'non_criminal_subject_specified': len([c for c in crimes if c.get('Primary Type') == 'NON-CRIMINAL (SUBJECT SPECIFIED)']),
                            'obscenity': len([c for c in crimes if c.get('Primary Type') == 'OBSCENITY']),
                            'offense_involving_children': len([c for c in crimes if c.get('Primary Type') == 'OFFENSE INVOLVING CHILDREN']),
                            'offenses_involving_children': len([c for c in crimes if c.get('Primary Type') == 'OFFENSES INVOLVING CHILDREN']),
                            'other_narcotic_violation': len([c for c in crimes if c.get('Primary Type') == 'OTHER NARCOTIC VIOLATION']),
                            'other_offense': len([c for c in crimes if c.get('Primary Type') == 'OTHER OFFENSE']),
                            'prostitution': len([c for c in crimes if c.get('Primary Type') == 'PROSTITUTION']),
                            'public_indecency': len([c for c in crimes if c.get('Primary Type') == 'PUBLIC INDECENCY']),
                            'public_peace_violation': len([c for c in crimes if c.get('Primary Type') == 'PUBLIC PEACE VIOLATION']),
                            'ritualism': len([c for c in crimes if c.get('Primary Type') == 'RITUALISM']),
                            'robbery': len([c for c in crimes if c.get('Primary Type') == 'ROBBERY']),
                            'sex_offense': len([c for c in crimes if c.get('Primary Type') == 'SEX OFFENSE']),
                            'stalking': len([c for c in crimes if c.get('Primary Type') == 'STALKING']),
                            'theft': len([c for c in crimes if c.get('Primary Type') == 'THEFT']),
                            'weapons_violation': len([c for c in crimes if c.get('Primary Type') == 'WEAPONS VIOLATION']),
                        },
                    },
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
                f = open('data/%s/%s/%s.json' % (single_date.year, single_date.month, single_date.day), 'wb')
                f.write(json_util.dumps(out, indent=4, sort_keys=True))
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
