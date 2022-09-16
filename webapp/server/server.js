import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import http from 'http';
import { url, port } from './config/const.js';

const app = express();

// Enable cors
app.use(
  cors({
    origin: url,
    methods: ['GET', 'POST'],
  })
);

// Enable helmet
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Apis route
import apis from './apis/apis.js';
app.use('/', apis);

// Server creation and listening
const httpserver = http.createServer(app);
httpserver.listen(port, async () => {
  console.log(`The crypto honeypot detector server is running on port ${port}`);
});
