# REST API Example

This example shows how to implement a **REST API with TypeScript** using [Express.JS](https://expressjs.com/) and [Prisma Client](https://github.com/prisma/prisma2/blob/master/docs/prisma-client-js/api.md).

## How to use

### 1. Download example & install dependencies

Clone the `prisma2` branch of this repository:

```
git clone git@github.com:prisma/prisma-examples.git --depth=1
```

Install Node dependencies:

```
cd prisma-examples/experimental/typescript/rest-express
npm install
```

### 2. Migrate your database schema & generate Prisma Client

### 2.1. Perform initial schem migration

Perform an initial schema migration against your database using the following commands:

```
npx prisma2 migrate save --name 'init' --experimental
npx prisma2 migrate up --experimental
```

> **Note**: You're using [npx](https://github.com/npm/npx) to run Prisma 2 CLI that's listed as a development dependency in [`package.json`](./package.json). Alternatively, you can install the CLI globally using `npm install -g prisma2`. When using Yarn, you can run: `yarn prisma2 dev`.

<Details>
<Summary><b>Alternative: </b>Connect to your own database</Summary>

Prisma supports MySQL and PostgreSQL at the moment. If you would like to connect to your own database, you can do so by specifying a different data source in the [Prisma schema file](prisma/schema.prisma).

For a MySQL provider:

```prisma
datasource mysql {
    provider = "mysql"
    url      = "mysql://johndoe:secret42@localhost:3306/mydatabase"
}
```

*OR*

For a PostgreSQL provider:

```prisma
datasource postgresql {
  provider = "postgresql"
  url      = "postgresql://johndoe:secret42@localhost:5432/mydatabase?schema=public"
}
```

> **Note**: In the above example connection strings, `johndoe` would be the username to your database, `secret42` the password, `mydatabase` the name of your database, and `public` the [PostgreSQL schema](https://www.postgresql.org/docs/9.1/ddl-schemas.html).

</Details>

### 2.2. Generate Prisma Client

Run the following command to generate your Prisma Client API:

```
npx prisma2 generate
```

This generates Prisma Client into `node_modules/@prisma/client` from where it can be imported like so:

```ts
import { PrismaClient } from '@prisma/client'
```

or

```js
const { PrismaClient } = require('@prisma/client')
```

### 3. Seed the database with test data

The `seed` script from `package.json` contains some code to seed the database with test data. Execute it with the following command:

```
npm run seed
```

### 4. Start the REST API server

```
npm run dev
```

The server is now running on `http://localhost:3000`. You can send the API requests implemented in `index.js`, e.g. [`http://localhost:3000/feed`](http://localhost:3000/feed).

### 3. Using the REST API

#### `GET`

- `/post/:id`: Fetch a single post by its `id`
- `/feed`: Fetch all _published_ posts
- `/filterPosts?searchString={searchString}`: Filter posts by `title` or `content`

#### `POST`

- `/post`: Create a new post
  - Body:
    - `title: String` (required): The title of the post
    - `content: String` (optional): The content of the post
    - `authorEmail: String` (required): The email of the user that creates the post
- `/user`: Create a new user
  - Body:
    - `email: String` (required): The email address of the user
    - `name: String` (optional): The name of the user

#### `PUT`

- `/publish/:id`: Publish a post by its `id`

#### `DELETE`
  
- `/post/:id`: Delete a post by its `id`


## Next steps

### Use Lift to persist the schema migration

The migrations that were generated throughout the development mode are _development migrations_ that are thrown away once the desired schema has been found. In that case, you need to persist the schema using the `lift` subcommands.

To persist your schema migration with Lift, run:

```
npx prisma2 lift save --name 'init'
npx prisma2 lift up
```

The first command, `lift save`, stores a number of migration files on the file sytem with details about the migration (such as the required migration steps and SQL operations), this doesn't yet affect the database. It also deletes the old development migrations. The second command, `lift up`, actually performs the schema migration against the database.

### Generate Photon.js with the CLI

Sometimes, e.g. in CI/CD environments, it can be helpful to generate Photon.js with a CLI command. This can be done with the `prisma2 generate command`. If you want to run it in this project, you need to prepend `npx` again:

```
npx prisma2 generate
```

### More things to explore

- Read the holistic, step-by-step [Prisma Framework tutorial](https://github.com/prisma/prisma2/blob/master/docs/tutorial.md)
- Check out the [Prisma Framework docs](https://github.com/prisma/prisma2) (e.g. for [data modeling](https://github.com/prisma/prisma2/blob/master/docs/data-modeling.md), [relations](https://github.com/prisma/prisma2/blob/master/docs/relations.md) or the [Prisma Client API](https://github.com/prisma/prisma2/tree/master/docs/prisma-client-js/api.md))
- Share your feedback in the [`prisma2-preview`](https://prisma.slack.com/messages/CKQTGR6T0/) channel on the Prisma Slack
- Create issues and ask questions on [GitHub](https://github.com/prisma/prisma2/)
- Track Prisma 2's progress on [`isprisma2ready.com`](https://isprisma2ready.com)
