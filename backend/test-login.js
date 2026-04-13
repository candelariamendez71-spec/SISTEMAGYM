const fetch = global.fetch || require('node-fetch');

async function main() {
  const response = await fetch('http://localhost:3002/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'cyber', password: '1234' }),
  });
  console.log('status', response.status);
  const body = await response.text();
  console.log(body);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
