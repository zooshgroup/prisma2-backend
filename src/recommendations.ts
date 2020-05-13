import { Review, ReviewData, RecommendMovie } from "./types";

const MIN_RES = 2;
const MIN_REL = 150;
const MIN_LIK = 7;

export function recommendForUser(reviews: Review[], reviewsByUser?: Review[]) {
    if (!reviewsByUser) return [];

    reviews.sort((r1: Review, r2: Review) => r1.user_id > r2.user_id ? 1 : (r1.user_id === r2.user_id ? 0 : -1));
    const filteredReviews = reviews.filter(r => r.user_id !== reviewsByUser[0].user_id);

    let reviewsPerUser: ReviewData[] = [];
    let theId = '-1';
    for (let rev of filteredReviews) {
        if (theId !== rev.user_id) {
            theId = rev.user_id;
            let theScore = -1;
            let theMovie = reviewsByUser.find(r => r.movie_id === rev.movie_id);
            if (theMovie) {
                theScore = calcRelevance(theMovie.rating, rev.rating);
            }
            const theReviewData: ReviewData = { uid: theId, movies: [{ movie_id: rev.movie_id, rating: rev.rating, score: theScore }], score: theScore };
            reviewsPerUser.push(theReviewData);
        }
        else {
            let theReview: ReviewData = reviewsPerUser[reviewsPerUser.length - 1];
            let theScore = -1;
            let theMovie = reviewsByUser.find(r => r.movie_id === rev.movie_id);
            if (theMovie) {
                theScore = calcRelevance(theMovie.rating, rev.rating);
            }
            theReview.score += theScore;
            theReview.movies.push({ movie_id: rev.movie_id, rating: rev.rating, score: theScore });
        }
    }
    reviewsPerUser.sort((u1, u2) => u1.score > u2.score ? -1 : (u1.score === u2.score ? 0 : 1));

    let recommendedMovies: RecommendMovie[] = [];
    for (let i = 0; i < reviewsPerUser.length; i++) {
        let allowed = false;
        if (recommendedMovies.length < MIN_RES) allowed = true;
        if (reviewsPerUser[i].score >= MIN_REL) allowed = true;
        if (allowed) {
            reviewsPerUser[i].movies.sort((m1, m2) => m1.score > m2.score ? -1 : (m1.score === m2.score ? 0 : 1));
            for (let mv of reviewsPerUser[i].movies) {
                if (!reviewsByUser.find(r => r.movie_id === mv.movie_id)) {
                    let theMovies = [];
                    let forloopSize = reviewsPerUser[i].movies.length > 2 ? 3 : reviewsPerUser[i].movies.length;
                    for (let y = 0; y < forloopSize; y++) {
                        theMovies.push(reviewsPerUser[i].movies[y].movie_id);
                    }
                    if (mv.rating >= MIN_LIK) recommendedMovies.push({ id: mv.movie_id, reason: { user_id: reviewsPerUser[i].uid, movies: theMovies } });
                }
            }
        }
    }

    return recommendedMovies;
}

function calcRelevance(users: number, others: number): number {
    return 10 - Math.abs(users - others);
}