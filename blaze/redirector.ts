import express from 'express'

const app = express()
const localPort = 42230

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<serverinstanceinfo>
  <address member="0">
      <valu>
          <hostname>localhost</hostname>
          <ip>2130706433</ip>
          <port>1337</port>
      </valu>
  </address>
  <secure>0</secure>
  <trialservicename></trialservicename>
  <defaultdnsaddress>0</defaultdnsaddress>
</serverinstanceinfo>`

app.use('/', async (req, res) => {
  console.log('connected: ', req.headers)

  res.set('Content-Type', 'text/xml')
  res.type('xml')
  res.send(xml)
})

app.listen(localPort, () => {
  console.log(`Redirector listening at http://localhost:${localPort}`)
})
