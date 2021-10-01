# WalletConnect Bridge Server

Bridge Server for relaying WalletConnect connections

## Environment Variables

The following environment variables should be set for the container:

* `LOG_FILE` - Log file path, does not log to file by default.
* `LOG_LEVEL` - Log level for console and file, default: `info`. Supports `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`.

## Develop

```bash
yarn dev
```

## Production

### Using NPM

1. Build

```bash
yarn build
```

## Build Docker

```bash
yarn
make build-docker
```

## Run

```bash
yarn start
```

3. Server accessible from host:

```bash
$ curl http://localhost:5000/hello
> Hello World, this is WalletConnect v1.0.0-beta
```

## Using Docker

1. Build the container with:

```bash
make build-docker
```

2. Run the container with:

```bash
docker run -p 5000:5000 walletconnect/node-walletconnect-bridge
```

3. Server accessible from host:

```bash
$ curl http://localhost:5000/hello
> Hello World, this is WalletConnect v1.0.0-beta
```
