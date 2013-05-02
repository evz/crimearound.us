import requests
#import os
from datetime import datetime, timedelta
import csv
#from boto.s3.connection import S3Connection
#from cStringIO import StringIO

CRIMES = 'http://api1.chicagopolice.org/clearpath/api/1.0/crimes/list'
MOST_WANTED = 'http://api1.chicagopolice.org/clearpath/api/1.0/mostWanted/list'

class ClearPathError(Exception): 
    def __init__(self, message):
        Exception.__init__(self, message)
        self.message = message

def get_crimes():
    today = datetime.now()
    then = today - timedelta(days=7)
    req_date = datetime.strftime(then, '%m-%d-%Y')
    crimes = requests.get(CRIMES, params={'dateOccurred': req_date})
    if crimes.status_code == 200:
        headers = crimes.json()[0].keys()
        inp = crimes.json()
        out = open('%s.csv' % req_date, 'wb')
        writer = csv.DictWriter(out, headers)
        writer.writer.writerow(headers)
        writer.writerows(crimes.json())
    else:
        raise ClearPathError('ClearPath API responded with a %s status code: %s' % (crimes.status_code, crimes.content[300:]))
    return None

if __name__ == '__main__':
    get_crimes()
