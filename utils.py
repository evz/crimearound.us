import urllib
import urlparse
import hmac
import base64
import hashlib
import os

GOOG_KEY = os.environ['GOOG_KEY']
GOOG_ACCT = os.environ['GOOG_ACCT']

def encoded_dict(in_dict):
    out_dict = {}
    for k, v in in_dict.iteritems():
        if isinstance(v, unicode):
            v = v.encode('utf8')
        elif isinstance(v, str):
        # Must be encoded in UTF-8
            v.decode('utf8')
        out_dict[k] = v
    return out_dict

def sign_google(u, params):
    key = GOOG_KEY
    params['client'] = GOOG_ACCT
    qs = urllib.urlencode(encoded_dict(params), True)
    full_url = u + '?' + qs
    url = urlparse.urlparse(full_url)
    urlToSign = url.path + "?" + url.query
    decodedKey = base64.urlsafe_b64decode(key)
    signature = hmac.new(decodedKey, urlToSign, hashlib.sha1)
    encodedSignature = base64.urlsafe_b64encode(signature.digest())
    originalUrl = url.scheme + "://" + url.netloc + url.path + "?" + url.query
    return '%s&signature=%s' % (originalUrl, encodedSignature)

def make_meta(crimes):
    out =  {
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
    }
    return out
