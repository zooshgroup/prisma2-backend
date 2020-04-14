import { PrismaClient } from '@prisma/client'
import { ContextParameters } from 'graphql-yoga/dist/types'
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
  userId: string
}

export function createContext(request: ContextParameters): Context  {
  const tryUserId = getUserId(request)
  const userId = tryUserId ? tryUserId : ""
  return {
    userId,
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
function getUserId(request: any) {
    const Authorization = request.request.get('Authorization')
    if (Authorization) {
        const token = Authorization.replace('Bearer ', '')
        let verifiedToken
        try {
          verifiedToken = jwt.verify(token, APP_SECRET) as Token
        }
        catch(e) {
          return undefined;
        }
        return verifiedToken && verifiedToken.userId
    }
}