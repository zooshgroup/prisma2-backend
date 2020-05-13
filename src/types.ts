export type ReviewArgs = {
    data: ReviewCreateInput;
};

export type ReviewCreateInput = {
    rating: number;
    review: string;
    movie: connectMovie;
    user: connectUser;
};

type connectMovie = {
    connect: uniqueMovie;
};

type connectUser = {
    connect: uniqueUser;
};

type uniqueMovie = {
    id: string;
};

type uniqueUser = {
    id: string;
};

export type Review = {
    review: string | null;
    id: string;
    rating: number;
    movie_id: string;
    user_id: string;
};

type Movie = {
    id: string;
    length: number | null;
    title: string;
};

export type Recommendations = {
    movie: Movie;
    info: InfoOnRec;
};

type InfoOnRec = {
    user_id: string | undefined;
    movies: string[] | undefined;
};

export type ReviewData = {
    uid: string;
    movies: MovieData[];
    score: number;
};

type MovieData = {
    movie_id: string;
    rating: number;
    score: number;
};

export type RecommendMovie = {
    id: string;
    reason: ReasonToRec;
};

type ReasonToRec = {
    user_id: string;
    movies: string[];
};