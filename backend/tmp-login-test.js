const http = require('http')
const data = JSON.stringify({ usuario: 'cyber', password: '1234' })

const req = http.request({
  hostname: 'localhost',
  port: 3003,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => {
    console.log('STATUS', res.statusCode)
    console.log('BODY', body)
  })
})

req.on('error', (err) => {
  console.error('REQ ERROR', err)
})

req.write(data)
req.end()
