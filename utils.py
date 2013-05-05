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
