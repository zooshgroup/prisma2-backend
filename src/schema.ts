import { makeExecutableSchema } from 'graphql-tools'
import { Context } from './context'

const typeDefs = `
type User {
  id: String!
  name: String
  password: String
}

type Query {
  users: [User!]!
}

type Mutation {
  signupUser(data: UserCreateInput!): User!
}

input UserCreateInput {
  id: String!
  name: String
  password: String
}
`


const resolvers = {
  Query: {
    users: (parent, args, ctx: Context) => {
      const allUsers = ctx.prisma.user.findMany();
      return allUsers;
    }
  },
  Mutation: {
    signupUser: (parent, args, ctx: Context) => {
      return ctx.prisma.user.create(args)
    },
  },
  User: {},
}

export const schema = makeExecutableSchema({
  resolvers,
  typeDefs,
})