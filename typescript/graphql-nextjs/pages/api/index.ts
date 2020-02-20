import { idArg, makeSchema, objectType, stringArg, asNexusMethod } from 'nexus'
import { GraphQLDate } from 'graphql-iso-date'
import { PrismaClient } from '@prisma/client'
import { graphql } from 'graphql'
import path from 'path'

export const GQLDate = asNexusMethod(GraphQLDate, 'date')

const prisma = new PrismaClient()

const User = objectType({
  name: 'User',
  definition(t) {
    t.id('id')
    t.string('name')
    t.string('email')
    t.list.field('posts', {
      type: 'Post',
      resolve: parent =>
        prisma.user
          .findOne({
            where: { id: parent.id },
          })
          .posts(),
    })
  },
})

const Post = objectType({
  name: 'Post',
  definition(t) {
    t.id('id')
    t.date('createdAt')
    t.date('updatedAt')
    t.string('title')
    t.string('content', {
      nullable: true,
    })
    t.boolean('published')
    t.field('author', {
      type: 'User',
      nullable: true,
      resolve: parent =>
        prisma.post
          .findOne({
            where: { id: parent.id },
          })
          .author(),
    })
  },
})

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.field('post', {
      type: 'Post',
      args: {
        postId: idArg({ nullable: false }),
      },
      resolve: (_, args) => {
        console.log(`resolve post`, args)
        return prisma.post.findOne({
          where: { id: args.postId },
        })
      },
    })

    t.list.field('feed', {
      type: 'Post',
      resolve: (_parent, _args, ctx) => {
        return prisma.post.findMany({
          where: { published: true },
        })
      },
    })

    t.list.field('drafts', {
      type: 'Post',
      resolve: (_parent, _args, ctx) => {
        return prisma.post.findMany({
          where: { published: false },
        })
      },
    })

    t.list.field('filterPosts', {
      type: 'Post',
      args: {
        searchString: stringArg({ nullable: true }),
      },
      resolve: (_, { searchString }, ctx) => {
        return prisma.post.findMany({
          where: {
            OR: [
              { title: { contains: searchString } },
              { content: { contains: searchString } },
            ],
          },
        })
      },
    })
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signupUser', {
      type: 'User',
      args: {
        name: stringArg(),
        email: stringArg({ nullable: false }),
      },
      resolve: (_, { name, email }, ctx) => {
        return prisma.user.create({
          data: {
            name,
            email,
          },
        })
      },
    })

    t.field('deletePost', {
      type: 'Post',
      nullable: true,
      args: {
        postId: idArg(),
      },
      resolve: (_, { postId }, ctx) => {
        return prisma.post.delete({
          where: { id: postId },
        })
      },
    })

    t.field('createDraft', {
      type: 'Post',
      args: {
        title: stringArg({ nullable: false }),
        content: stringArg(),
        authorEmail: stringArg(),
      },
      resolve: (_, { title, content, authorEmail }, ctx) => {
        return prisma.post.create({
          data: {
            title,
            content,
            published: false,
            author: {
              connect: { email: authorEmail },
            },
          },
        })
      },
    })

    t.field('publish', {
      type: 'Post',
      nullable: true,
      args: {
        postId: idArg(),
      },
      resolve: (_, { postId }, ctx) => {
        return prisma.post.update({
          where: { id: postId },
          data: { published: true },
        })
      },
    })
  },
})

export const schema = makeSchema({
  types: [Query, Mutation, Post, User, GQLDate],
  outputs: {
    typegen: path.join(__dirname, 'nexus-typegen.ts'),
    schema: path.join(__dirname, 'schema.graphql')
  },
})

export default async (req, res) => {
  const query = req.body.query
  const variables = req.body.variables
  console.log(`serve graphql`, query, variables)
  const response = await graphql(schema, query, {}, {}, variables)

  return res.end(JSON.stringify(response))
}
