import { rule, shield } from "graphql-shield";
import * as jwt from "jsonwebtoken";
import { Context } from "./context";

// App secret
export const APP_SECRET = 'appsecret321'

// Token
interface Token {
    userId: string
}

// Auth
export function getUserId(context: Context) {
    const Authorization = context.request.get('Authorization')
    if (Authorization) {
        //const token = Authorization.replace('Bearer ', '')
        //const verifiedToken = verify(token, APP_SECRET) as Token
        const verifiedToken = jwt.verify(Authorization, APP_SECRET) as Token
        //return verifiedToken && verifiedToken.userId
        return verifiedToken.userId
    }
}
  
// Rules
const isAuthenticated = rule()( (parent, args, context) => {
    const userId = getUserId(context)
    return Boolean(userId)
})

// Permissions
export const permissions = shield({
    Query: {
        users: isAuthenticated,
        movies: isAuthenticated
    },
    Mutation: {
        addMovie: isAuthenticated
    }
})