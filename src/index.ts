import Trakt from 'trakt.tv';
import axios from 'axios';
import { LetterboxdApi } from 'letterboxd-mark-as-watched';
import pMap from 'p-map';

const LETTERBOXD_LIST_ORIGIN = 'https://letterbox-list-radarr.herokuapp.com';

const {
    TRAKT_CLIENT_ID,
    TRAKT_CLIENT_SECRET,
    TRAKT_ACCESS_TOKEN,
    TRAKT_ACCESS_TOKEN_EXPIRES,
    TRAKT_REFRESH_TOKEN,
    LETTERBOXD_USERNAME,
    LETTERBOXD_PASSWORD
} = process.env;

const TRAKT_TOKEN = {
    access_token: TRAKT_ACCESS_TOKEN,
    expires: TRAKT_ACCESS_TOKEN_EXPIRES,
    refresh_token: TRAKT_REFRESH_TOKEN
};

const traktClient = new Trakt({ client_id: TRAKT_CLIENT_ID, client_secret: TRAKT_CLIENT_SECRET });
const letterboxdClient = new LetterboxdApi(LETTERBOXD_USERNAME, LETTERBOXD_PASSWORD);

interface Movie {
    title: string;
    year: number;
    traktId?: number;
    traktSlug?: string;
    letterboxdSlug?: string;
    imdb: string;
    tmdb: number;
}

const transformTraktResponseToMovieList = (res: any[]): Movie[] => res.map(entry => ({
    title: entry.movie.title,
    year: entry.movie.year,
    traktId: entry.movie.ids.trakt,
    traktSlug: entry.movie.ids.slug,
    imdb: entry.movie.ids.imdb,
    tmdb: entry.movie.ids.tmdb
}));

const transformLetterboxdResponseToMovieList = (res: any[]): Movie[] => res.map(movie => ({
    title: movie.title,
    year: +movie.release_year,
    letterboxdSlug: movie.clean_title,
    imdb: movie.imdb_id,
    tmdb: movie.id
}));

const removeMoviesByProperty = (propertyName: keyof Movie, source: Movie[], remove: Movie[]): Movie[] => {
    const removeProperties = remove.map(movie => movie[propertyName]);
    return source.filter(movie => removeProperties.indexOf(movie[propertyName]) === -1);
};

const diffMovieList = (source: Movie[], remove: Movie[]) => {
    const tmdbMatched = removeMoviesByProperty('tmdb', source, remove);
    const imdbMatched = removeMoviesByProperty('imdb', tmdbMatched, remove);
    return imdbMatched;
};

const markAsWatchedTrakt = async (movies: Movie[]) => {
    if(movies.length === 0){
        return;
    }

    await traktClient.sync.history.add({
        movies: movies.map(movie => ({
            ids: {
                imdb: movie.imdb,
                tmdb: movie.tmdb
            }
        }))
    });
};

const markAsWatchedLetterboxd = async (movies: Movie[]) => {
    if(movies.length === 0){
        return;
    }

    pMap(movies, async (movie) => {
        const slug = await letterboxdClient.getSlug(movie.tmdb.toString(), movie.imdb);
        await letterboxdClient.markAsWatched(slug);
    }, { concurrency: 3 });
};

(async function(){
    await traktClient.import_token(TRAKT_TOKEN);
    await letterboxdClient.authenticate();
    const watchedTraktMovies = transformTraktResponseToMovieList(await traktClient.sync.watched({ type: 'movies' }));
    const watchedLetterboxdMovies = transformLetterboxdResponseToMovieList(await (await axios.get(`${LETTERBOXD_LIST_ORIGIN}/${LETTERBOXD_USERNAME}/films`)).data);

    const missingMoviesFromTrakt = diffMovieList(watchedTraktMovies, watchedLetterboxdMovies);
    const missingMoviesFromLetterboxd = diffMovieList(watchedLetterboxdMovies, watchedTraktMovies);

    await markAsWatchedLetterboxd(missingMoviesFromTrakt);
    await markAsWatchedTrakt(missingMoviesFromLetterboxd);
})();
