import { rule, shield } from 'graphql-shield';
import { Context } from './context';

// Rules
const isAuthenticated = rule()((parent: any, args: any, context: Context) => {
  const userId = context.userId;
  return Boolean(userId);
});

// Permissions
export const permissions = shield(
  {
    Query: {
      users: isAuthenticated,
      movies: isAuthenticated,
      whoami: isAuthenticated,
      reviews: isAuthenticated,
    },
    Mutation: {
      addMovie: isAuthenticated,
      addReview: isAuthenticated,
    },
  },
  {
    allowExternalErrors: true,
  },
);
