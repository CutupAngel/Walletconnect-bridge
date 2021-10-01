import { inspect } from 'util'
import { IncomingMessage, OutgoingMessage } from 'http'

import fastify from 'fastify'
import fastifyCors from 'fastify-cors'
import Helmet from 'fastify-helmet'
import WebSocket from 'ws'
import config from './config'
import pubsub, { cleanUpSub, cleanUpPub, subs, pubs, getSub } from './pubsub'
import { setNotification } from './notification'

import pkg from '../package.json'

const CLIENT_PING_INTERVAL = 30 * 1000
const LOGGING_INTERVAL = 30 * 60 * 1000

const ALLOWORIGINS = [
  "https://www.binance.org", 
  "https://testnet.binance.org",
  "https://trustwalletapp.com",
  "https://trustwallet.com",
  "https://local.binance.org:3000"
 ]

const ALLOWMETHODS = ["GET", "HEAD", "POST", "OPTIONS"]

const noop = () => {}

const app = fastify({
  logger: {
    serializers: {
      req: (req: IncomingMessage) => req.url,
      res: (res: OutgoingMessage) => inspect(res)
    },
    prettyPrint: {
      crlf: false,
      colorize: false,
      levelFirst: true,
      translateTime: true
    },
    prettifier: require('../lib/pretty'),
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || undefined
  }
})

app.register(Helmet)

app.register(fastifyCors, {
  origin: ALLOWORIGINS,
  methods: ALLOWMETHODS
})

// for container health checks
app.get('/health', (_, res) => {
  res.status(204).send()
})

app.get('/hello', (_, res) => {
  res.status(200).send(`Hello World, this is WalletConnect v${pkg.version}`)
})

app.get('/info', (_, res) => {
  res.status(200).send({
    name: pkg.name,
    description: pkg.description,
    version: pkg.version
  })
})

app.get('/checkTopic', (req, res) => {
  const topic = req.query.topic
  if(!topic){
    res.status(400).send({
      message: 'Error: Invalid topic'
    })
  }

  let subscribers = getSub(topic)
  subscribers = subscribers.filter(sub=>sub.socket && sub.socket.readyState === 1)
  res.status(200).send({ isAlive: subscribers.length >= 1 })
})

app.post('/subscribe', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).send({
      message: 'Error: missing or invalid request body'
    })
    return
  }

  const { topic, webhook } = req.body

  if (!topic || typeof topic !== 'string') {
    res.status(400).send({
      message: 'Error: missing or invalid topic field'
    })
    return
  }

  if (!webhook || typeof webhook !== 'string') {
    res.status(400).send({
      message: 'Error: missing or invalid webhook field'
    })
    return
  }

  // Check webhook whitelist
  if (config.webhook_whitelist) {
    const whitelist = config.webhook_whitelist.split(',')
    if (!whitelist.includes(webhook)) {
      res.status(400).send({
        message: 'Error:  invalid webhook value'
      })
      return
    }
  }

  setNotification({ topic, webhook })

  res.status(200).send({
    success: true
  })
})

const wsServer = new WebSocket.Server({ server: app.server })
const aliveSockets = new Map<WebSocket, boolean>()

app.ready(() => {
  wsServer.on('connection', (socket: WebSocket) => {
    aliveSockets.set(socket, true)
    socket.on('pong', () => {
      aliveSockets.set(socket, true)
    })
    socket.on('message', async data => {
      pubsub(app, socket, data)
    })
    socket.on('close', async => {
      cleanUpSub(socket)
    })
  })
})

// client ping loop
setInterval(function ping () {
  app.log.debug(`Pinging client sockets (${aliveSockets.entries.length} alive)`)
  wsServer.clients.forEach(socket => {
    if (!aliveSockets.has(socket)) {
      return socket.terminate()
    }
    aliveSockets.delete(socket)
    socket.ping(noop)
  })
  cleanUpPub()
}, CLIENT_PING_INTERVAL)

setInterval(function logging () {
  app.log.info(`Pubs active: ` + pubs.size)
  app.log.info(`Subs active: ` + subs.size)
}, LOGGING_INTERVAL)

const [host, port] = config.host.split(':')
app.listen(+port, host, (err, address) => {
  if (err) throw err
  app.log.info(`Server listening on ${address}`)
})
