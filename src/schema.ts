import { makeExecutableSchema } from 'graphql-tools';
import { sign } from 'jsonwebtoken';
import { APP_SECRET, Context } from './context';
import { createError } from 'apollo-errors';
import { reviewOrderByInput, userCreateInput, movieCreateArgs } from '@prisma/client';
import { compare, hash } from 'bcryptjs'
import { recommendForUser } from './recommendations';
import { ReviewCreateInput, ReviewArgs, Recommendations } from './types';

const WrongCredentialsError = createError('WrongCredentialsError', {
  message: 'The provided credentials are invalid.',
});

const EmailTakenError = createError('EmailTakenError', {
  message: 'The provided email is taken.',
});

const ReviewCreateError = createError('ReviewCreateError', {
  message: 'You have already reviewed this movie.',
});

const RecommendationError = createError('RecommendationError', {
  message: 'Movie recommendations cannot be provided.',
});

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
  recommendMovies(options: RecommendOptions): [Recommendations!]!
}

type Mutation {
  signupUser(data: UserCreateInput!): User!
  addMovie(data: MovieCreateInput!): Movie!
  addReview(data: ReviewCreateInput!): Review!
  loginUser(data: LoginInput!): loginOutput!
  genmovies(size: Int): String
  genreviews(size: Int): String
  genusers(size: Int): String
}

type Recommendations {
  movie: Movie!
  info: InfoOnRec!
}

type InfoOnRec {
  user_id: String!
  movies: [String!]!
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

input RecommendOptions {
  size: Int
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
      let sort: reviewOrderByInput = { rating: 'desc' };
      if (args.orderByRatingAsc === true) sort = { rating: 'asc' };

      const filteredReviews = ctx.prisma.review.findMany({
        where: {
          OR: [{ review: { contains: args.search } }],
        },
        include: {
          movie: true,
          user: true,
        },
        orderBy: args.orderByRatingAsc !== undefined ? sort : null,
      });
      return filteredReviews;
    },
    movies: async (parent: any, args: any, ctx: Context) => {
      let search = "";
      if (args.search) search = args.search;
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
    recommendMovies: async (parent: any, args: any, ctx: Context) => {
      const reviews = await ctx.prisma.review.findMany();
      const userReviews = reviews.filter(r => r.user_id === ctx.userId);
      const recommendations = recommendForUser(reviews, userReviews);

      if (recommendations.length === 0) throw new RecommendationError();

      const recommendedMovies = await ctx.prisma.movie.findMany();
      const filteredRecommendedMovies = recommendedMovies.filter(m => recommendations.find(r => r.id === m.id));

      let theRecs: Recommendations[] = [];

      for (let frm of filteredRecommendedMovies) {
        theRecs.push({ movie: frm, info: { user_id: recommendations.find(r => r.id === frm.id)?.reason.user_id, movies: recommendations.find(r => r.id === frm.id)?.reason.movies } });
      }

      return theRecs;
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

      const hashedPassword = await hash(args.data.password, 10);

      const newUser: userCreateInput = { email: args.data.email, name: args.data.name, password: hashedPassword, age: args.data.age };
      const user = ctx.prisma.user.create({ data: newUser });

      return user;
    },
    addReview: async (parent: any, args: any, ctx: Context) => {
      const theUserReviews = await ctx.prisma.review.findMany({
        where: {
          user_id: ctx.userId,
        },
        include: {
          movie: true,
        }
      });

      const hasReviewed = theUserReviews.find(r => r.movie_id === args.data.movieId);
      if (hasReviewed) {
        throw new ReviewCreateError();
      }

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
    // Generate movies for DB
    genmovies: async (parent: any, args: any, ctx: Context) => {
      // Not allowed
      if (true) return -1;
      for (let i = 0; i < args.size; i++) {
        let topic = Math.random() > 0.5 ? (Math.random() > 0.5 ? 'Akcio' : 'Dokumentum') : (Math.random() > 0.5 ? 'Horror' : 'Gyerek');
        const margs: movieCreateArgs = { data: { title: `Superman: ${i}. ${topic} film`, length: Math.floor(Math.random() * 150 + 45) } };
        await ctx.prisma.movie.create(margs);
      }

      return 1;
    },
    // Generate reviews for DB
    genreviews: async (parent: any, args: any, ctx: Context) => {
      // Not allowed
      if (true) return -1;
      const users = ['3d3f317b-a390-4c89-835d-00045cce4834', 'b9047e32-d572-46f9-8559-ee1e9a9e7800', 'e3f3acc7-8252-460b-81f5-7edd5caabdd5', '3053fe60-9a6f-469c-aa74-71d09a4cb81a', 'a831752e-2229-4c8e-9e60-0c2003a6a8cf', 'a8ce71c9-9ca2-4af2-9231-86ff19ef7585', '014af580-418d-4ccf-8479-93c183c9e6a7', '9ac6f54a-c657-41a3-904c-9a0e361f9656'];
      const newUser = ['b42a798f-3e47-4712-9290-8228fa1ca832'];
      const movies = [{ "id": "151d4f12-7bd9-4d41-b2e5-b4977b6db676" }, { "id": "40b0fe05-77c0-4daf-9a27-38eb8dcf5c4b" }, { "id": "466f81ce-d194-41fd-8e49-c8f6e740a48b" }, { "id": "aeb2adb5-1b26-46cb-8f1c-eaf1c67a58ff" }, { "id": "3bc68687-766d-4a8f-aacc-271c3c4d7d7a" }, { "id": "4f270a04-0a30-40ab-8fa5-c6969c6a77a4" }, { "id": "babcbba0-ed26-41b0-bc49-856fa51b287b" }, { "id": "8ba0370f-645c-4264-a227-4a86e965c4ab" }, { "id": "3ab391d6-6be4-4244-b525-b2f8c64ea76a" }, { "id": "ca18a46c-4658-436b-94ba-600570d7545f" }, { "id": "ef936003-ce47-40d1-b2af-35d4145c3afd" }, { "id": "cba645c0-dece-4f85-b135-49a75af81b70" }, { "id": "79da93ed-9dfa-4a97-b629-5f19147d1bef" }, { "id": "dc1cf7e0-3d37-4648-95f7-bee353d24245" }, { "id": "87d5cf53-8f3c-4b42-b8a4-40636455c2a3" }, { "id": "7bdd8b62-0cc4-4b54-82ab-91d2ae0b14b6" }, { "id": "9e0f802d-ee9f-446b-a398-bb381b72d4f9" }, { "id": "a7b407c5-8233-4b95-bfbc-46283ddbcbd8" }, { "id": "4ddecffa-4e98-4b07-bf22-b2c0cc22d951" }, { "id": "d9676dd8-4414-4722-83df-43e772ad7e07" }, { "id": "b1bd9840-3b27-443b-8acb-72c2020b4977" }, { "id": "05449e4c-ca3d-4786-af89-4a9f0a188e90" }, { "id": "f815dbdc-696a-449e-b838-f5e6725275e5" }, { "id": "dc413649-80f3-4a81-a9a0-9373005208c8" }, { "id": "73a76ce2-12aa-447b-95e9-0618893ec0d8" }, { "id": "fc0e976b-57ab-4fec-b9a7-e515607d38d5" }, { "id": "f32c9148-901b-4786-bf7f-ffc140718e95" }, { "id": "3ddd5215-26c7-43a6-8da6-2100003d1dd7" }, { "id": "1f66d6e5-1796-4e5c-85fe-bd2e912fb3ef" }, { "id": "b217f8f2-e61c-4957-9df8-fcb4b84253d8" }, { "id": "52e38551-eb98-4049-8762-9e9b92b70ba9" }, { "id": "9e740b7a-246b-4a07-be2d-fc6222b827d2" }, { "id": "36a2947c-28f4-4c0a-b89e-950395988c93" }, { "id": "c513b427-b2d1-4abe-9505-4b929bda5bef" }, { "id": "cc009f01-881c-4006-b760-c444a729286e" }, { "id": "93f22993-d01f-4dcf-9ea4-a3937d841674" }, { "id": "97951a3c-5b9e-4c45-a5eb-51957f4a45b3" }, { "id": "725bcf52-34b1-42dd-b8ae-d41fd542059c" }, { "id": "3a7b839a-367b-497e-8070-1c9e6f6602b4" }, { "id": "6cf668e6-ec7a-486d-9bd2-73613588fd17" }, { "id": "7603c816-6772-45b0-8f5b-7d2b8061e3b7" }, { "id": "d87ed753-682b-467d-abac-c22fba0f0783" }, { "id": "ec054fb2-a88e-48f9-a06d-bb4f158819e9" }, { "id": "881c1f38-691d-4fc1-bcd5-84922f96b269" }, { "id": "104176dd-3109-4773-abb5-8d56567ef09f" }, { "id": "4fe8f6db-dcd2-4656-ba0e-6b5ece806452" }, { "id": "2771e0fd-9791-4a4e-90cb-aada120ed443" }, { "id": "1107052c-457d-4193-bd80-1c37dc182672" }, { "id": "5475ea56-1a08-4c23-b03c-512e7adb287b" }, { "id": "432cb470-238a-46b0-a061-6992193ca397" }, { "id": "9a915209-d01c-4cc0-88d8-9798d4d8c1a4" }, { "id": "165bbd09-7ff8-44ff-bc47-518a55c3e82e" }, { "id": "8fcc931b-4d83-476a-a1d8-a98eb7fb0ed9" }, { "id": "f1d7a46a-c41e-4a4a-b51f-6d9f5d730d6f" }, { "id": "7a244198-b794-42f3-8660-609eb10ffcfd" }, { "id": "2e0d4c64-8a6a-489b-9849-0e8508444b5f" }, { "id": "a60aa25f-694d-466c-8b69-61feb882457a" }, { "id": "e61645b2-6f6b-4946-9896-d32e082d1c37" }, { "id": "5b000cc3-d31d-4694-bc60-5e06f404f232" }, { "id": "e12e5ca4-b5da-4611-acab-5a77fa86f46d" }, { "id": "a637e87d-0bc5-4198-bb11-c890c278b7d9" }, { "id": "51af0f0d-1dc1-48cb-aeb1-66698364f770" }, { "id": "290ff2d1-ffc5-4e91-838a-005dd4259344" }, { "id": "af93fac3-c40d-4f68-9d3f-346d0199eab2" }, { "id": "a2f8ccbe-598e-4222-9a48-2461651bddfc" }, { "id": "f2bd78b6-4b4c-43ab-9fb5-81957371fe55" }, { "id": "e3be08a3-f0f4-470c-bd86-f8dad91a0e39" }, { "id": "aeb8a9e9-e980-4023-915c-a5e39d2a1151" }, { "id": "0214050e-8405-4b5e-9323-9c9467a45bbb" }, { "id": "b7f6bbd3-1eaa-4970-9500-8d37032e308b" }, { "id": "5d3ecdf7-cd1b-4aea-b9eb-82e4e1c2093e" }, { "id": "53d0c1b4-4a62-4605-b19e-5af91458dc04" }, { "id": "334e94db-ccb1-4ed3-9118-602fe9eb7e7d" }, { "id": "01058f1a-8bc6-4b32-8947-559a8fd11054" }, { "id": "9fa37e60-8b83-4c27-b210-a1745d2cf4e8" }, { "id": "7888ec37-67d4-44df-8d51-22f396507870" }, { "id": "bed83146-79c0-4e39-b1d3-f0c082e97538" }, { "id": "7beff247-a7bd-41b2-a0a5-8722cf8052e1" }, { "id": "655938e8-aa8e-4e4f-a4be-842c5771b0f3" }, { "id": "49a97e9a-13ef-4400-a098-1eb2ca9ce5d4" }, { "id": "26d92ede-b267-47c5-9bb3-29d2f81d2544" }, { "id": "02686e67-14ce-4686-83d4-b0e77716b627" }, { "id": "a1613178-e779-4b07-a0c7-6bb38de5581b" }, { "id": "68cd5c9a-37ef-4fb6-9cbd-9399bb054c5e" }, { "id": "5357cc30-1ade-4182-b607-00bd69428793" }, { "id": "dec6cb2c-9a0c-4ad5-a382-08f265f69e80" }, { "id": "e7a7207e-55e9-4232-9ef9-cb4dc46868e3" }, { "id": "eff0d5d8-1e9e-4d2b-9f3e-d15af0e8630e" }, { "id": "46b91ddb-0e30-4dcb-82e7-11a917fe1ea8" }, { "id": "477f0f22-154c-41c3-866b-c085415a5693" }, { "id": "532c7f9f-c561-4576-adf7-d640abbda079" }, { "id": "9d06659e-3cce-4e16-af87-21f8f3517dec" }, { "id": "194101a6-d07a-46f8-a354-f866906d62bf" }, { "id": "9ffc5fff-b827-4bfb-bec7-2a06009b8c13" }, { "id": "3f375c7b-68b9-41d2-8def-0b12b8aaf370" }, { "id": "0d7e7b1b-3541-4c71-a7bb-570bdd4e4f73" }, { "id": "46670426-bde3-4d68-a382-a647446affb5" }, { "id": "f4bb0311-9503-457f-8a4a-bbb3a181649e" }, { "id": "b4997295-5c03-4e87-ab81-5a534aab2708" }, { "id": "a9c8fcb1-9ed4-449f-8492-cea259a03b71" }, { "id": "a37f5893-5959-4cc9-9b15-fe8d0d0692ff" }, { "id": "828c2dfb-ce43-40f4-a1f0-2d2901e2263b" }, { "id": "7c180ff4-ec8a-4f4c-b272-c947475ba9a3" }, { "id": "c2e573e6-6f17-41b8-91db-baf0abfb1c78" }, { "id": "03a8b26a-1494-4661-97b0-6c342876c1f2" }, { "id": "4814e84a-ba95-4fdb-aff8-ce5c3e380c54" }, { "id": "615fad42-12f8-4257-bb03-d334fcf99c94" }, { "id": "92996975-4fe1-40c8-81c2-b10bdc6f9da8" }, { "id": "7677b9a5-21e8-4583-9ba8-b8fee32783fa" }, { "id": "b429e913-01fe-462b-ae5b-87b9918912b6" }, { "id": "f3b77b50-bf3d-47d0-a667-7155d20a8449" }, { "id": "ed032091-90fb-48e3-9df5-c6c65708acdf" }, { "id": "d65bf5c2-23c1-4f32-9bbc-d117d5ac89ae" }, { "id": "b3053ef9-eecf-4e18-a616-687b2278c1b7" }, { "id": "2b3f7443-4b05-4397-90d2-cb0cb65788f0" }, { "id": "29689001-14c2-4f62-93f3-ece10d86870e" }, { "id": "b8671430-0b3f-47c9-bc52-79f23ea98ebd" }, { "id": "89e6ae3d-373a-44d8-a4e3-ac9486afe63a" }, { "id": "2e2e6f44-c980-4132-8b62-b0d83da10519" }, { "id": "d18be600-fb44-431b-b84e-c5b323ced8cf" }, { "id": "9f278ae3-5dec-4828-920e-bdc8307aca23" }, { "id": "070d4ddc-af13-4c6f-a1e2-48472ed1489b" }, { "id": "d0f5a6c6-2e2c-45ac-8870-9534366fdc0b" }, { "id": "53231f6d-141b-4234-905e-c629a94b3278" }, { "id": "212bd550-d9f1-47a6-97c3-e4aca3a4ba17" }, { "id": "2a195623-9e96-4908-bd65-4248376cbbd8" }, { "id": "62bbe24e-72e9-41eb-8994-8d285c9755e5" }, { "id": "36c55f5d-085b-4f69-9f20-735cc2630093" }, { "id": "33b1b453-30a0-457a-a1a5-bf2aa63228d9" }, { "id": "6691b037-344d-4be5-a980-1f4eb6853992" }, { "id": "da2d8670-1674-4880-8c04-2dff744ae754" }, { "id": "488c0c2a-b168-4d5c-bbd5-a946f0e2798d" }, { "id": "e24fd035-da9e-4eb6-8647-6945971c0315" }, { "id": "bd98de4e-f691-450f-918f-fb3de980608f" }, { "id": "778ee2ae-95e2-4ca8-a69e-59669a06ce05" }, { "id": "692ded8a-8fdc-4a74-9854-b33455c1320f" }, { "id": "25671baa-e66b-446f-b896-7690f2c6168a" }, { "id": "23e93ef5-1ba6-4c13-948b-8f7ef20789a4" }, { "id": "f96c64a0-1630-4108-9278-1dce08c04e57" }, { "id": "0fe5a420-33da-4296-83f1-3876ea9dcad4" }, { "id": "07c84479-cede-4971-bdd8-600666067eb4" }, { "id": "7faea511-32d2-4572-976d-c9217474ec7a" }, { "id": "f4f4649f-052a-4cd2-a387-65a1404f7cc3" }, { "id": "b61bbaaf-a0b4-4157-b240-34f563f8c953" }, { "id": "7689a536-e2ed-46d1-955c-fbbed644da50" }, { "id": "05c7a4ed-687e-424d-ab66-7d6758767a63" }, { "id": "71d52a6c-f00d-44fd-8016-ad0a5e0d9802" }, { "id": "7eca4d95-e427-46b2-93e5-6baf9349f498" }, { "id": "e3fe9333-2567-416b-a7b8-f2e87dc87338" }, { "id": "f67bcc48-4e5f-4844-8faa-82ec3d8d34eb" }, { "id": "0880e167-ac12-4e2d-b97c-f69dab0885ac" }, { "id": "4d6adda3-0c2d-4e06-9330-06d69c80c6c8" }, { "id": "58e100f1-a839-4b88-ba5d-de76d43f6978" }, { "id": "bf270111-4b45-4e5a-9cee-1420bb0e21ed" }, { "id": "15a39e27-13c6-4663-9e2d-ef67718de31d" }, { "id": "06f0e8d4-a0cc-4572-83b9-67e9ae3bb24f" }, { "id": "d7d89c6f-2ef8-4544-a004-247d43a8e3e8" }, { "id": "066fabce-ae7b-4105-b6ad-ac32e0b13d4c" }, { "id": "43d0b256-cc54-4f44-a3c5-3f383d3c4e82" }, { "id": "1e385f73-65ea-49e4-b2f0-351ba68b4234" }, { "id": "40f8a280-2fae-48ad-939c-494bd48fe70f" }, { "id": "65cb67f6-bd66-4c00-b063-d6864051ddcb" }, { "id": "ce7a173e-edbe-4ea7-9fd3-5e9e729f57ad" }, { "id": "b114b059-77b1-4cf4-a6ea-745f377be919" }, { "id": "fc149a0b-7c1a-45b6-8778-5a7400acb7ef" }, { "id": "ffe2ef50-07ee-4980-8cf4-db71fbe9a91e" }, { "id": "0c173fdf-c22b-40df-82f7-78fa4058fabf" }, { "id": "88b56acc-7b41-4061-b694-ebd5a2210f11" }, { "id": "72b590bd-215d-4919-83bd-263a58a80015" }, { "id": "4cb5fa46-ae66-4e20-b74e-35baa10b143e" }, { "id": "53bc6b5f-5527-4b9a-b7d7-023210bd1e32" }, { "id": "9817b745-1afb-46af-8d7a-43f7ce77b9a8" }, { "id": "fe1408b8-7b10-4e09-b2a4-0856d3d4e860" }, { "id": "32401c0f-73fb-427c-bd0f-503aad271d45" }];
      if (args.size > movies.length - 1) return 0;
      for (let i = 0; i < newUser.length; i++) {
        for (let y = 0; y < args.size; y++) {
          const margs: ReviewCreateInput = {
            rating: Math.round(Math.random() * 9 + 1),
            review: Math.random() > 0.5 ? (Math.random() > 0.5 ? 'Csodalatos' : 'Borzaszto') : (Math.random() > 0.5 ? 'Anyaaaa' : 'Hmm') + ' ' + i,
            user: {
              connect: { id: newUser[i] },
            },
            movie: {
              connect: { id: movies[y].id },
            },
          };
          await ctx.prisma.review.create({ data: margs });
        }
      }
      return 1;
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

      const passwordValid = await compare(args.data.password, user.password);
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
