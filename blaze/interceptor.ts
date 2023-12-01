import { constants } from 'crypto'
import fs from 'fs'
import net from 'net'
import * as tls from 'tls'
import { Agent, fetch } from 'undici'

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
    secureOptions: constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION,
  },
})

enum MessageType {
  MESSAGE = 0,
  REPLY = 1,
  NOTIFICATION = 2,
  ERROR_REPLY = 3,
  PING = 4,
  PING_REPLY = 5,
}

const PORT = 1337

const reqBody = `<?xml version="1.0" encoding="UTF-8"?>
<serverinstancerequest>
  <blazesdkversion>15.1.1.0.4</blazesdkversion>
  <blazesdkbuilddate>Jun 14 2016 07:38:08</blazesdkbuilddate>
  <clientname>pamplona client</clientname>
  <clienttype>CLIENT_TYPE_GAMEPLAY_USER</clienttype>
  <clientplatform>pc</clientplatform>
  <clientskuid>pc</clientskuid>
  <clientversion>pmp-1</clientversion>
  <dirtysdkversion>15.1.1.0.4</dirtysdkversion>
  <environment>prod</environment>
  <clientlocale>1701729619</clientlocale>
  <name>mirrorsedgecatalyst-2016-pc</name>
  <platform>Windows</platform>
  <connectionprofile>standardSecure_v4</connectionprofile>
  <istrial>0</istrial>
</serverinstancerequest>`

const readHeader = (data: Buffer) => {
  let header = {
    payloadSize: (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | (data[3] << 0),
    metadataSize: (data[4] << 8) | (data[5] << 0),
    component: (data[6] << 8) | (data[7] << 0),
    command: (data[8] << 8) | (data[9] << 0),
    msgNum: (data[10] >> 16) | (data[11] >> 8) | (data[12] >> 0),
    msgType: MessageType[data[13] >> 5],
    options: data[14],
    // reserved: data[15],
  }

  if (header.payloadSize >= 0x8000 || header.payloadSize < 0) {
    // weird payload size, probably without a header
    return "(Packet doesn't have a header)"
  }

  return header
}

const folder = Date.now().toString()

const options = {
  key: fs.readFileSync('./blaze/certs/private-key.pem'),
  cert: fs.readFileSync('./blaze/certs/public-cert.pem'),
  rejectUnauthorized: false,
}

const server = net.createServer()
server.listen(PORT, '127.0.0.1', () => {
  let clientPackets = 1
  let serverPackets = 1

  console.log('TCP Server is running on port ' + PORT + '.')

  server.on('connection', async function (sock) {
    console.log('CONNECTED: ' + sock.remoteAddress + ':' + sock.remotePort)

    const realServer = await fetch('https://159.153.64.178:42230/redirector/getServerInstance', {
      method: 'post',
      body: reqBody,
      headers: {
        'Content-Type': 'application/xml',
      },
      dispatcher: dispatcher,
    }).then((res) => res.text())

    let diceHostMatch = realServer.match(/<hostname>(.+)<\/hostname>/)
    let dicePortMatch = realServer.match(/<port>(.+)<\/port>/)

    if (!diceHostMatch || !dicePortMatch) {
      throw new Error('Failed to get server instance')
    }

    let diceHost = diceHostMatch[1]
    let dicePort = parseInt(dicePortMatch[1])

    const client = tls.connect(dicePort, diceHost, options, () => {
      console.log(`Connected to ${diceHost}:${dicePort}`)
      if (client.authorized) {
        console.log('Connection authorized by a Certificate Authority.')
      } else {
        console.log('Connection not authorized: ' + client.authorizationError)
      }
    })

    sock.on('data', (data) => {
      client.write(data)
      console.log('\x1b[36m%s\x1b[0m', '  Client -> Server  ')
      console.log(readHeader(data))

      fs.mkdir(`./blaze/packets/${folder}/client`, { recursive: true }, () => {
        fs.writeFileSync(`./blaze/packets/${folder}/client/${clientPackets}.tdf`, data)
      })

      clientPackets++
    })

    client.on('data', (data) => {
      sock.write(data)
      console.log('\x1b[33m%s\x1b[0m', '  Client <- Server ')
      console.log(readHeader(data))

      fs.mkdir(`./blaze/packets/${folder}/server`, { recursive: true }, () => {
        fs.writeFileSync(`./blaze/packets/${folder}/server/${serverPackets}.tdf`, data)
      })

      serverPackets++
    })

    client.on('close', () => {
      console.log('END: Connection closed')
    })
  })
})
