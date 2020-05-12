export type ReviewArgs = {
    data: ReviewCreateInput,
};

export type ReviewCreateInput = {
    rating: number,
    review: string,
    movie: connectMovie,
    user: connectUser,
};

type connectMovie = {
    connect: uniqueMovie,
};

type connectUser = {
    connect: uniqueUser,
};

type uniqueMovie = {
    id: string,
};

type uniqueUser = {
    id: string,
};

export type Review = {
    review: string | null;
    id: string;
    rating: number;
    movie_id: string;
    user_id: string;
}