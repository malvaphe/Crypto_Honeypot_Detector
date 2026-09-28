# @honeypot-detector/webapp

Web interface of [Crypto Honeypot Detector](../../README.md) (React 19, Vite, Tailwind CSS 4).

```bash
npm run dev     # http://localhost:3000, proxies /api to http://localhost:8080
npm run build   # dist/, served by the API server
```

Set `VITE_API_URL` at build time to use an API hosted on another origin.
