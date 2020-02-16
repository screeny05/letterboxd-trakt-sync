const TRAKT_CLIENT_ID = 'xxx';
const TRAKT_CLIENT_SECRET = 'xxx';

const SELF_HOSTNAME = 'http://127.0.0.1:8080'; // 'https://trakt-letterboxd-sync.herokuapp.com';

import Trakt from 'trakt.tv';
import express from 'express';
import os from 'os';

const traktClient = new Trakt({
    client_id: TRAKT_CLIENT_ID,
    client_secret: TRAKT_CLIENT_SECRET,
    redirect_uri: SELF_HOSTNAME + '/authorize'
});

const app = express();

app.get('/', (req, res) => res.redirect(traktClient.get_url()));
app.get('/authorize', async (req, res) => {
    try {
        const traktOauth = await traktClient.exchange_code(req.query.code, req.query.state);
        console.log(traktClient.export_token())
        res.send(traktOauth.access_token);
    } catch (err) {
        return res.send(`Error: ${err.message}`);
    }
});

app.listen(8080);
