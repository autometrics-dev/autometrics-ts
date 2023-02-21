## Fastify API + Prisma + Autometrics example

This is a very simple example for an API built with Fastify and Prisma, and
instrumented with Autometrics.

### Running the example

1. Copy `.env.example` as `.env`

2. Install the dependencies

```shell
npm install
```

3. Run the initial migration

```shell
npx prisma migrate dev --name init
```

4. Generate the client

```shell
npx prisma generate
```

5. Build and run the application

```shell
npm run build && npm run start
```
