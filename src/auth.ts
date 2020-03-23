import { rule, shield } from "graphql-shield";
import { getUserId } from "./context";

  
// Rules
const isAuthenticated = rule()( (parent, args, context) => {
    const userId = getUserId(context)
    return Boolean(userId)
})

// Permissions
export const permissions = shield({
    Query: {
        users: isAuthenticated,
        movies: isAuthenticated,
        whoami: isAuthenticated,
    },
    Mutation: {
        addMovie: isAuthenticated
    }
}, {
    allowExternalErrors: true
})