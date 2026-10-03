"""Extrai valores pontuais de GRIB2 CPTEC (WRF/MERGE) para JSON otimizado.

Uso:
  python extract_grib.py <arquivo.grib2> <lat> <lon> [--out ponto.json]

Requer: pip install xarray cfgrib eccodes
Verificado em 2026-09-30 com amostras reais CPTEC.
"""
import json
import sys

def main() -> None:
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(2)
    path, lat, lon = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    out = sys.argv[5] if len(sys.argv) > 5 and sys.argv[4] == "--out" else None

    from cfgrib import open_datasets

    def clean(v):
        fv = float(v)
        return None if fv != fv else fv  # NaN -> null (JSON estrito)

    lon360 = lon % 360
    points = []
    for ds in open_datasets(path):
        pt = ds.sel(latitude=lat, longitude=lon360, method="nearest")
        vals = {}
        for v in ds.data_vars:
            vals[v] = {
                "value": clean(pt[v].values),
                "units": ds[v].attrs.get("units"),
                "name": ds[v].attrs.get("GRIB_name"),
            }
        points.append({
            "time": str(ds["time"].values),
            "valid_time": str(ds["valid_time"].values),
            "nearest": {"latitude": float(pt["latitude"]), "longitude": float(pt["longitude"])},
            "values": vals,
        })
        ds.close()
    doc = {"file": path, "query": {"latitude": lat, "longitude": lon}, "datasets": points}
    text = json.dumps(doc, indent=2)
    if out:
        open(out, "w").write(text)
        print(f"ok -> {out}")
    else:
        print(text)


if __name__ == "__main__":
    main()
