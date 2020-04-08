import { makeExecutableSchema } from 'graphql-tools'
import { sign } from 'jsonwebtoken'
import { APP_SECRET, Context } from './context'

const typeDefs = `
type User {
  email: String!
  name: String
  age: Int
  id: ID
}

type Movie {
  title: String!
  length: Int
  id: ID
}

type Query {
  users(search: String): [User!]!
  movies(search: String): [Movie!]!
  whoami: User!
}

type Mutation {
  signupUser(data: UserCreateInput!): User!
  addMovie(data: MovieCreateInput!): Movie!
  loginUser(data: LoginInput!): loginOutput!
}

type loginOutput {
  token: String
  user: User
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
`


const resolvers = {
  Query: {
    users: (parent: any, args: any, ctx: Context) => {
      const users = ctx.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: args.search } }
          ]
        }
      return users
    },
    movies: (parent: any, args: any, ctx: Context) => {
      const filteredMovies = ctx.prisma.movie.findMany({
        where: {
          OR: [
            { title: { contains: args.search } }
          ]
        }
      })
      return filteredMovies
    },
    whoami: async (parent: any, args: any, ctx: Context) => {
      const userId = ctx.userId
      const user = await ctx.prisma.user.findOne({
        where : {
          id: String(userId),
        }
      })
      return user
    }
  },
  Mutation: {
    signupUser: async (parent: any, args: any, ctx: Context) => {
      const emailTaken = await ctx.prisma.user.findOne({
        where: {
          email: args.data.email
        },
      })
      if(emailTaken) throw new Error('Email already taken.')
      //const hashedPassword = hash(password, 10)
      const user = ctx.prisma.user.create(args)
      return user
    },
    addMovie: (parent: any, args: any, ctx: Context) => {
      const movie = ctx.prisma.movie.create(args)
      return movie
    },
    loginUser: async (parent: any, args: any, ctx: Context) => {
      const user = await ctx.prisma.user.findOne({
        where: {
          email: args.data.email
        },
      })
      if (!user) {
        throw new Error(`No user found for email: ${args.data.email}`)
      }
      const passwordValid = args.data.password == user.password
      if (!passwordValid) {
        throw new Error('Invalid password')
      }
      
      return {
        token: sign({ userId : user.id }, APP_SECRET),
        user,
      }
    }
  },
  User: {},
  Movie: {},
}

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs
});