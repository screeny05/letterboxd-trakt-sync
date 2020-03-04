const { TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET } = process.env;

const SELF_HOSTNAME = 'http://127.0.0.1:8080';

import Trakt from 'trakt.tv';
import express from 'express';

const traktClient = new Trakt({
    client_id: TRAKT_CLIENT_ID,
    client_secret: TRAKT_CLIENT_SECRET,
    redirect_uri: SELF_HOSTNAME + '/authorize'
});

const app = express();
const server = app.listen(8080, () => console.log(`Visit ${SELF_HOSTNAME}`));

app.get('/', (req, res) => res.redirect(traktClient.get_url()));
app.get('/authorize', async (req, res) => {
    try {
        await traktClient.exchange_code(req.query.code, req.query.state);
        const exportedToken = traktClient.export_token();
        res.send('Done. Check Console.');
        console.log(
            `Put these in your .env file:\n\n` +
            `TRAKT_ACCESS_TOKEN=${exportedToken.access_token}\n` +
            `TRAKT_REFRESH_TOKEN=${exportedToken.refresh_token}\n` +
            `TRAKT_ACCESS_TOKEN_EXPIRES=${exportedToken.expires}`
        );
        server.close();
    } catch (err) {
        return res.send(`Error: ${err.message}`);
    }
});
