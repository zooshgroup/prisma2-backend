import { PrismaClient } from '@prisma/client'
import { ContextParameters } from 'graphql-yoga/dist/types'
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  request: any
}

export function createContext(request: ContextParameters): Context  {
  return {
    ...request,
    prisma,
  }
}

// App secret
export const APP_SECRET = 'appsecret321'

// Token
interface Token {
    userId: string
}

// Getting UserId
export function getUserId(context: Context) {
    const Authorization = context.request.get('Authorization')
    if (Authorization) {
        const token = Authorization.replace('Bearer ', '')
        const verifiedToken = jwt.verify(token, APP_SECRET) as Token
        return verifiedToken && verifiedToken.userId
    }
}