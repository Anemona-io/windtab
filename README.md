# windtab

Drop a `.tab` file in the browser and the charts appear. No install. Nothing leaves your machine.

Renders a wind rose, per-sector Weibull fits, a joint probability heatmap, and a sector statistics table from WAsP Observed Wind Climate files.

## Run locally

```bash
cd web
npm install
npm run dev
```

Vite dev server at `http://localhost:5173`.

## Build

```bash
cd web
npm run build   # output goes to web/dist/
```

Cloudflare Pages serves from `web/`, building on every push to `master`.

## .tab file format

```
Line 1:  Site name
Line 2:  x_east   y_north   height_m
Line 3:  n_sectors   speed_scale   direction_offset
Line 4:  f_0  f_1  ...  f_{N-1}    (sector %, sum ≈ 100)
Line 5+: v_i  g_i0  g_i1  ...      (per-mille within sector)
```

Full field reference and calculation details at `/docs.html` in the app.

## License

MIT © Anemona.io
