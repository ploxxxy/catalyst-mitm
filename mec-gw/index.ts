import bodyParser from 'body-parser'
import express from 'express'
import fs from 'node:fs'
import { Agent, fetch, setGlobalDispatcher } from 'undici'

const app = express()
const PORT = 1338

setGlobalDispatcher(
  new Agent({
    connect: {
      rejectUnauthorized: false,
    },
  })
)

type HeadersInit = [string, string][] | Record<string, string> | Headers

const tryAndParse = (str: string) => {
  try {
    return JSON.parse(str)
  } catch {
    return '\x1b[31mCould not parse JSON. Probably binary data.'
  }
}

app.use((req, res, next) => {
  // some requests don't have content-type header
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/x-encrypted'
  }
  next()
})

app.use(bodyParser.text({ type: 'application/json' })) // to save up time parsing json at this moment
app.use(bodyParser.raw({ type: 'application/x-encrypted' }))

app.get('*', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.method + 'Request: ' + req.url)

  const real = await fetch('https://mec-gw.ops.dice.se' + req.url, {
    method: 'GET',
    headers: req.headers as HeadersInit,
  })

  const response = await real.arrayBuffer()

  // weird workaround to send binary data
  fs.writeFileSync('./mec-gw/blob.bin', Buffer.from(response))
  res.status(real.status).sendFile(__dirname + '/blob.bin')

  console.log('\x1b[33m%s\x1b[0m', 'Response: ' + req.url)
  console.log(`Received ${response.byteLength / 1024} KB file`)
})

app.post('*', async (req, res) => {
  console.log('\x1b[36m%s\x1b[0m', req.method + 'Request: ' + req.url)

  const reqBody = tryAndParse(req.body)
  console.log(reqBody)

  const session = req.headers['x-gatewaysession'] ?? 'no-session'

  if (req.body instanceof Buffer) {
    fs.mkdir(`./mec-gw/requests/encrypted/${session}`, { recursive: true }, () => {
      fs.writeFile(`./mec-gw/requests/encrypted/${session}/${Date.now()}.bin`, req.body, () => {})
    })
  }

  const real = await fetch('https://mec-gw.ops.dice.se' + req.url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.body,
  })

  const response = await real.text()

  res
    .set({ ...real.headers })
    .status(real.status)
    .send(response)

  console.log('\x1b[33m%s\x1b[0m', 'Response: ' + req.url)
  const resBody = tryAndParse(response)
  console.log(resBody)

  fs.mkdir(`./mec-gw/requests/json/${session}`, { recursive: true }, () => {
    fs.appendFile(
      `./mec-gw/requests/json/${session}/${Date.now()}.json`,
      JSON.stringify({ request: reqBody, response: resBody }),
      () => {}
    )
  })
})

app.listen(PORT, () => {
  console.log(`Gateway interceptor listening at http://localhost:${PORT}`)
})
