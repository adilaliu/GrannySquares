# Granny Squares

A recipe platform.

## Setup

1. Install dependencies:

```sh
npm install
```

2. Configure environment. Check `.env.example` for variables needed.

- [Supabase](https://supabase.com): Run `schema.sql` in SQL Editor. Use the Postgres credentials to connect with Next.js app.
- [OpenAI](https://openai.com) API key in `OPENAI_API_KEY`.
- S3 credentials either from AWS or Cloudflare R2 S3-compatible API

3. Start the development server:

```sh
npm run dev
```
