const bitcoin = require('bitcoinjs-lib')
const bip39 = require('bip39')
const bip32 = require('bip32')
const prompt = require('prompt-promise')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
const lasttx = JSON.parse(fs.readFileSync('./lasttx.json', 'utf8'))

let rootNode
prompt.password('pass>').then(async (pw) => {
  const seed = config.seed
  const mn = bip39.mnemonicToSeedSync(seed, pw)
  rootNode = bip32.fromSeed(mn)

  const originPath = "m/49'/0'/0'/0/" + lasttx.child
  const changePath = "m/49'/0'/0'/0/" + (lasttx.child + 1)

  console.log('Using HD derivation path:', originPath)
  const child = rootNode.derivePath(originPath)
  const change = rootNode.derivePath(changePath)

  child.network = bitcoin.networks.mainnet
  change.network = bitcoin.networks.mainnet

  if (config.addressType === 'p2sh') {
    let result = await genp2sh(child, change)
    result.child = lasttx.child + 1
    console.log('TX:', result.txhex)
    console.log('Fee: ' + result.fee + ' sat/byte')
    qrcode.generate(result.txhex)
    let commit = await prompt('commit? [y/N]>')
    delete result.hex

    if (commit.toLowerCase() === 'y') {
      fs.writeFileSync('./lasttx.json', JSON.stringify(result))
    }
  } else {
    throw new Error('Unsupported address type: ' + config.addressType)
  }
})

async function genp2sh(sourceKeyPair, changeKeypair) {
  const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: sourceKeyPair.publicKey })
  const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh })

  console.log('Sending from address: ' + p2sh.address)

  const txb = new bitcoin.TransactionBuilder()
  const vinamnt = lasttx.voutamount
  const vintxid = lasttx.txid
  const vinnum = lasttx.vout
  const vinscript = lasttx.script
  txb.addInput(vintxid, vinnum, 0, Buffer.from(vinscript, 'hex'))

  let change = vinamnt
  let outs = {}
  let destAddr = " "
  while (destAddr !== "") {
    destAddr = await prompt("destination address (empty to finish)>")
    if (destAddr !== "") {
      let destAmnt = await prompt("quantity in satoshis (empty to finish)>")

      if (destAmnt !== "") {
        outs[destAddr] = parseInt(destAmnt)
      } else {
        destAddr = ""
      }
    } else {
      break
    }
  }

  for (let addr in outs) {
    txb.addOutput(addr, outs[addr])
    change -= outs[addr]
  }

  let fee = parseInt(await prompt ("Aprox Fee (sat/byte)>")) * (180 + 34 * (Object.keys(outs).length + 1))
  let remain = change - fee

  if (remain < 0) {
    throw new Error('Insufficient balance, need', -remain, "more")
  }

  // change
  const cp2wpkh = bitcoin.payments.p2wpkh({ pubkey: changeKeypair.publicKey })
  const cp2sh = bitcoin.payments.p2sh({ redeem: cp2wpkh })
  txb.addOutput(cp2sh.address, remain)
  console.log('Remaining balance:', remain)

  txb.sign(0, sourceKeyPair, p2sh.redeem.output, null, vinamnt)

  const tx = txb.build()

  let hex = tx.toHex()

  let voutidx = Object.keys(outs).length
  let vout = tx.outs[voutidx]

  return { script: vout.script.toString('hex'), voutamount: vout.value, vout: voutidx, txid: tx.getId(), fee: fee / (hex.length/2), txhex: hex }
}
