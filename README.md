airgap
======

Completely airgapped wallets from the console.

Only supports segwit P2SH encoded addresses.

You must generate your seed 

Usage
====

```bash
git clone https://github.com/chiguireitor/airgap.git
cd airgap
npm install

# Preferably, copy all the file to another computer which doesn't has
# connection to internet.

cp config.example.json config.json
cp lasttx.example.json lasttx.json

# MODIFY config.json to use YOUR seed
# MODIFY lasttx.json to include the info for your initial input

node index.js

# Follow the instructions
```

After putting all addresses, amounts and fee rate, the raw tx will be
printed to console and a QR code shown so you can scan from your mobile and
transmit via any broadcast api (blockcypher.com, blockstream.info, etc).

Say "y" to commit so the outputs get saved to lasttx.json and you can later
send more without copying the TX details.

ISC Licensed

Do you like this? 1PDJv8u8zw4Fgqr4uCb2yim9fgTs5zfM4s
