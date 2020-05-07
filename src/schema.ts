import { makeExecutableSchema } from 'graphql-tools';
import { sign } from 'jsonwebtoken';
import { APP_SECRET, Context } from './context';
import { createError } from 'apollo-errors';
import { reviewOrderByInput } from '@prisma/client';

const WrongCredentialsError = createError('WrongCredentialsError', {
  message: 'The provided credentials are invalid.',
});

const EmailTakenError = createError('EmailTakenError', {
  message: 'The provided email is taken.',
});

const ReviewCreateError = createError('ReviewCreateError', {
  message: 'Failed to add review.',
});

type ReviewArgs = {
  data: ReviewCreateInput,
};

type ReviewCreateInput = {
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

const typeDefs = `
type User {
  email: String!
  name: String
  age: Int
  id: ID
  review: [Review!]!
}

type Movie {
  title: String!
  length: Int
  id: ID
  review: [Review!]!
}

type Review {
  id: ID
  rating: Int
  review: String
  user: ReviewReturnUser
  movie: Movie
}

type Query {
  users(search: String): [User!]!
  movies(search: String): [Movie!]!
  reviews(search: String, orderByRatingAsc: Boolean): [Review!]!
  whoami: User!
  movie(id: String): Movie!
}

type Mutation {
  signupUser(data: UserCreateInput!): User!
  addMovie(data: MovieCreateInput!): Movie!
  addReview(data: ReviewCreateInput!): Review!
  loginUser(data: LoginInput!): loginOutput!
}

type loginOutput {
  token: String
  user: User
}

type ReviewReturnUser {
  id: ID
  name: String
}

input LoginInput {
  email: String
  password: String
}

input UserCreateInput {
  name: String
  email: String!
  password: String!
  age: Int
}

input MovieCreateInput {
  title: String!
  length: Int
}

input ReviewCreateInput {
  rating: Int
  review: String
  movieId: String
}
`;

const resolvers: any = {
  Query: {
    users: (parent: any, args: any, ctx: Context) => {
      const users = ctx.prisma.user.findMany({
        where: {
          OR: [{ name: { contains: args.search } }],
        },
      });
      return users;
    },
    reviews: (parent: any, args: any, ctx: Context) => {
      let sort:reviewOrderByInput = { rating: 'desc' };
      if (args.orderByRatingAsc === true) sort = { rating: 'asc' };

      const filteredReviews = ctx.prisma.review.findMany({
        where: {
          OR: [{ review: { contains: args.search } }],
        },
        include: {
          movie: true,
          user: true,
        },
        orderBy: args.orderByRatingAsc!==undefined ? sort : null,
      });
      return filteredReviews;
    },
    movies: async (parent: any, args: any, ctx: Context) => {
      let search = "";
      if(args.search) search = args.search;
      const movies = await ctx.prisma.raw(`SELECT * FROM public.movie WHERE LOWER(title) LIKE LOWER('%${search}%');`);
      return movies;
    },
    movie: (parent: any, args: any, ctx: Context) => {
      const movie = ctx.prisma.movie.findOne({
        where: {
          id: args.id,
        },
      });
      return movie;
    },
    whoami: async (parent: any, args: any, ctx: Context) => {
      const userId = ctx.userId;
      const user = await ctx.prisma.user.findOne({
        where: {
          id: String(userId),
        },
      });
      return user;
    },
  },
  Mutation: {
    signupUser: async (parent: any, args: any, ctx: Context) => {
      const emailTaken = await ctx.prisma.user.findOne({
        where: {
          email: args.data.email,
        },
      });
      if (emailTaken) throw new EmailTakenError();
      //const hashedPassword = hash(password, 10)
      const user = ctx.prisma.user.create(args);
      return user;
    },
    addReview: async (parent: any, args: any, ctx: Context) => {
      const newreview: ReviewCreateInput = {
        rating: args.data.rating,
        review: args.data.review,
        user: {
          connect: { id: ctx.userId },
        },
        movie: {
          connect: { id: args.data.movieId },
        },
      };
      // if(Failed to connect IDs) throw new ReviewCreateError();
      const r_args: ReviewArgs = {
        data: newreview,
      };

      const review = ctx.prisma.review.create(r_args);
      const theId = (await review).id;
      
      const newRev = ctx.prisma.review.findOne({
        where: {
          id: theId,
        },
        include: {
          movie: true,
          user: true,
        }
      });

      return newRev;
    },
    addMovie: (parent: any, args: any, ctx: Context) => {
      const movie = ctx.prisma.movie.create(args);
      return movie;
    },
    loginUser: async (parent: any, args: any, ctx: Context) => {
      const user = await ctx.prisma.user.findOne({
        where: {
          email: args.data.email,
        },
      });
      if (!user) {
        throw new WrongCredentialsError();
      }
      const passwordValid = args.data.password == user.password
      if (!passwordValid) {
        throw new WrongCredentialsError();
      }
      return {
        token: sign({ userId: user.id }, APP_SECRET),
        user,
      };
    },
  },
  User: {},
  Movie: {},
  Review: {},
};

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
});
