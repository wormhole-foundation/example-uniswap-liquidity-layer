# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.17.1
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ARG YARN_VERSION=3.6.4

# Install Yarn 3
RUN corepack enable && \
    yarn set version ${YARN_VERSION}

# Throw-away build stage to reduce size of final image
FROM base as deps

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y build-essential pkg-config python-is-python3

# Install node modules
COPY --link .yarnrc.yml package.json yarn.lock tsconfig.json tsconfig.compile.json .barrelsby.json ./

RUN yarn install --immutable

FROM deps as build

# Copy application code
COPY --link . .

RUN yarn build

# Final stage for app image
FROM deps

WORKDIR /app
# Copy built application
COPY --from=build /app/dist/ /app

# Start the server by default, this can be overwritten at runtime
EXPOSE 3333

CMD [ "node","main.js" ]
