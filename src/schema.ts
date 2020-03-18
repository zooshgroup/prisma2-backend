import { makeExecutableSchema } from 'graphql-tools'
import { Context } from './context'

const typeDefs = `
type User {
  name: String
  password: String
  age: Int
  id: String!
}

type Movie {
  title: String
  length: Int
  id: Int!
}

type Query {
  users: [User!]!
  movies: [Movie!]!
  aUser(where: UserWhereUniqueInput): User!
  filterMovies(searchString: String): [Movie!]!
}

type Mutation {
  signupUser(data: UserCreateInput!): User!
  addMovie(data: MovieCreateInput!): Movie!
}

input UserWhereUniqueInput {
  id: String
}

input UserCreateInput {
  name: String
  password: String
  age: Int
  id: String!
}
input MovieCreateInput {
  title: String
  length: Int
  id: Int!
}
`


const resolvers = {
  Query: {
    users: (parent, args, ctx: Context) => {
      return ctx.prisma.user.findMany();
    },
    aUser: (parent, args, ctx: Context) => {
      return ctx.prisma.user.findOne({
        where: { id: args.where.id },
      })
    },
    movies: (parent, args, ctx: Context) => {
      return ctx.prisma.movie.findMany();
    },
    filterMovies: (parent, args, ctx: Context) => {
      return ctx.prisma.movie.findMany({
        where: {
          OR: [
            { title: { contains: args.searchString } }
          ]
        }
      })
    }
  },
  Mutation: {
    signupUser: (parent, args, ctx: Context) => {
      return ctx.prisma.user.create(args)
    },
    addMovie: (parent, args, ctx: Context) => {
      return ctx.prisma.movie.create(args)
    },
  },
  User: {},
  Movie: {},
}

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
})