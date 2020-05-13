import { Review } from "./types";

const MIN_RES = 2;
const MIN_REL = 6;
const MIN_LIK = 7;

type ReviewData = {
    uid: string,
    movies: MovieData[],
    score: number,
};

type MovieData = {
    movie_id: string,
    rating: number,
};

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
            const theReviewData: ReviewData = { uid: theId, movies: [{ movie_id: rev.movie_id, rating: rev.rating }], score: theScore };
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
            theReview.movies.push({ movie_id: rev.movie_id, rating: rev.rating });
        }
    }
    reviewsPerUser.sort((u1, u2) => u1.score > u2.score ? -1 : (u1.score === u2.score ? 0 : 1));

    let recommendedMovies = [];
    for (let i = 0; i < reviewsPerUser.length; i++) {
        let allowed = false;
        if (recommendedMovies.length < MIN_RES) allowed = true;
        if (reviewsPerUser[i].score >= MIN_REL) allowed = true;
        if (allowed) {
            for (let mv of reviewsPerUser[i].movies) {
                if (!reviewsByUser.find(r => r.movie_id === mv.movie_id)) {
                    if (mv.rating >= MIN_LIK) recommendedMovies.push(mv.movie_id);
                }
            }
        }
    }

    return recommendedMovies;
}

function calcRelevance(users: number, others: number): number {
    return 10 - Math.abs(users - others);
}