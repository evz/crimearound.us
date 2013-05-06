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
                    'meta': {
                        'total': {'key': 'total', 'name': 'Total', 'value': len(crimes)},
                        'detail': [
                            {'key': 'arson', 'name': 'Arson', 'value': len([c for c in crimes if c.get('Primary Type') == 'ARSON'])},
                            {'key': 'assault', 'name': 'Assault', 'value': len([c for c in crimes if c.get('Primary Type') == 'ASSAULT'])},
                            {'key': 'battery', 'name': 'Battery', 'value': len([c for c in crimes if c.get('Primary Type') == 'BATTERY'])},
                            {'key': 'burglary', 'name': 'Burglary', 'value': len([c for c in crimes if c.get('Primary Type') == 'BURGLARY'])},
                            {'key': 'crim_sexual_assault', 'name': 'Criminal Sexual Assault', 'value': len([c for c in crimes if c.get('Primary Type') == 'CRIM SEXUAL ASSAULT'])},
                            {'key': 'criminal_damage', 'name': 'Criminal Damage', 'value': len([c for c in crimes if c.get('Primary Type') == 'CRIMINAL DAMAGE'])},
                            {'key': 'criminal_trespass', 'name': 'Criminal Trespass', 'value': len([c for c in crimes if c.get('Primary Type') == 'CRIMINAL TRESPASS'])},
                            {'key': 'deceptive_practice', 'name': 'Deceptive Practice', 'value': len([c for c in crimes if c.get('Primary Type') == 'DECEPTIVE PRACTICE'])},
                            {'key': 'domestic_violence', 'name': 'Domestic Violence', 'value': len([c for c in crimes if c.get('Primary Type') == 'DOMESTIC VIOLENCE'])},
                            {'key': 'gambling', 'name': 'Gambling', 'value': len([c for c in crimes if c.get('Primary Type') == 'GAMBLING'])},
                            {'key': 'homicide', 'name': 'Homicide', 'value': len([c for c in crimes if c.get('Primary Type') == 'HOMICIDE'])},
                            {'key': 'interfere_with_public_officer', 'name': 'Interfere with Public Officer', 'value': len([c for c in crimes if c.get('Primary Type') == 'INTERFERE WITH PUBLIC OFFICER'])},
                            {'key': 'interference_with_public_officer', 'name': 'Interference with Public Officer', 'value': len([c for c in crimes if c.get('Primary Type') == 'INTERFERENCE WITH PUBLIC OFFICER'])},
                            {'key': 'intimidation', 'name': 'Intimidation', 'value': len([c for c in crimes if c.get('Primary Type') == 'INTIMIDATION'])},
                            {'key': 'kidnapping', 'name': 'Kidnapping', 'value': len([c for c in crimes if c.get('Primary Type') == 'KIDNAPPING'])},
                            {'key': 'liquor_law_violation', 'name': 'Liquor Law Violation', 'value': len([c for c in crimes if c.get('Primary Type') == 'LIQUOR LAW VIOLATION'])},
                            {'key': 'motor_vehicle_theft', 'name': 'Motor Vehicle Theft', 'value': len([c for c in crimes if c.get('Primary Type') == 'MOTOR VEHICLE THEFT'])},
                            {'key': 'narcotics', 'name': 'Narcotics', 'value': len([c for c in crimes if c.get('Primary Type') == 'NARCOTICS'])},
                            {'key': 'non_criminal', 'name': 'Non-Criminal', 'value': len([c for c in crimes if c.get('Primary Type') == 'NON-CRIMINAL'])},
                            {'key': 'non_criminal_subject_specified', 'name': 'Non-Criminal (Subject Specified)', 'value': len([c for c in crimes if c.get('Primary Type') == 'NON-CRIMINAL (SUBJECT SPECIFIED)'])},
                            {'key': 'obscenity', 'name': 'Obscenity', 'value': len([c for c in crimes if c.get('Primary Type') == 'OBSCENITY'])},
                            {'key': 'offense_involving_children', 'name': 'Offense Involving Children', 'value': len([c for c in crimes if c.get('Primary Type') == 'OFFENSE INVOLVING CHILDREN'])},
                            {'key': 'offenses_involving_children', 'name': 'Offenses Involving Children', 'value': len([c for c in crimes if c.get('Primary Type') == 'OFFENSES INVOLVING CHILDREN'])},
                            {'key': 'other_narcotic_violation', 'name': 'Other Narcotic Violation', 'value': len([c for c in crimes if c.get('Primary Type') == 'OTHER NARCOTIC VIOLATION'])},
                            {'key': 'other_offense', 'name': 'Other Offense', 'value': len([c for c in crimes if c.get('Primary Type') == 'OTHER OFFENSE'])},
                            {'key': 'prostitution', 'name': 'Prostitution', 'value': len([c for c in crimes if c.get('Primary Type') == 'PROSTITUTION'])},
                            {'key': 'public_indecency', 'name': 'Public Indecency',  'value': len([c for c in crimes if c.get('Primary Type') == 'PUBLIC INDECENCY'])},
                            {'key': 'public_peace_violation', 'name': 'Public Peace Violation', 'value': len([c for c in crimes if c.get('Primary Type') == 'PUBLIC PEACE VIOLATION'])},
                            {'key': 'ritualism', 'name': 'Ritualism', 'value': len([c for c in crimes if c.get('Primary Type') == 'RITUALISM'])},
                            {'key': 'robbery', 'name': 'Robbery', 'value': len([c for c in crimes if c.get('Primary Type') == 'ROBBERY'])},
                            {'key': 'sex_offense', 'name': 'Sex Offense', 'value': len([c for c in crimes if c.get('Primary Type') == 'SEX OFFENSE'])},
                            {'key': 'stalking', 'name': 'Stalking', 'value': len([c for c in crimes if c.get('Primary Type') == 'STALKING'])},
                            {'key': 'theft', 'name': 'Theft', 'value': len([c for c in crimes if c.get('Primary Type') == 'THEFT'])},
                            {'key': 'weapons_violation', 'name': 'Weapons Violation', 'value': len([c for c in crimes if c.get('Primary Type') == 'WEAPONS VIOLATION'])},
                        ]
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
