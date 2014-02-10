from cStringIO import StringIO
import shapefile
import json
import zipfile
from itertools import izip_longest

def grouper(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return izip_longest(*args, fillvalue=fillvalue)


def make_shapes(content, get_jobs=False):
    zf = StringIO(content)
    shp = StringIO()
    dbf = StringIO()
    shx = StringIO()
    with zipfile.ZipFile(zf) as f:
        for name in f.namelist():
            if name.endswith('.shp'):
                shp.write(f.read(name))
            if name.endswith('.shx'):
                shx.write(f.read(name))
            if name.endswith('.dbf'):
                dbf.write(f.read(name))
    shape_reader = shapefile.Reader(shp=shp, dbf=dbf, shx=shx)
    records = shape_reader.shapeRecords()
    fields = [f[0] for f in shape_reader.fields[1:5]]
    record_groups = grouper(records, 1000)
    geo = {'type': 'FeatureCollection', 'features': []}
    for records in record_groups:
        i = 0
        for record in records:
            if record:
                properties = {}
                for k,v in zip(fields, record.record):
                    properties[k] = v
                dump = {
                    'type': 'Feature', 
                    'geometry': record.shape.__geo_interface__,
                    'id': i,
                    'properties': properties
                }
                if get_jobs:
                    dump = add_jobs(tract_fips, dump)
                i += 1
                geo['features'].append(dump)
    return geo

if __name__ == "__main__":
    import sys
    fname = sys.argv[1]
    f = open(fname, 'rb')
    geo = make_shapes(f.read())
    outp = '%s.geojson' % '_'.join(fname.split(' '))
    o = open(outp, 'wb')
    o.write(json.dumps(geo))
