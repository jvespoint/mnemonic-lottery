const ethers = require('ethers');
const https = require('https');
const fs = require('fs');

var addresses = null;
if (process.argv[2] != null) {
    addresses = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
}

function getUnknownAddress() {
    const randomMnemonic = ethers.Wallet.createRandom().mnemonic;
    const wallet = ethers.Wallet.fromMnemonic(randomMnemonic.phrase);
    if (addresses != null) {
        if (addresses.some(wallets => wallets.address == wallet.address)) {
            console.log("Duplicate found. Wow!");
            //return getUnknownAddress();
        }
    }
    return wallet;
}

const rateLimit = (1 / 6); // (calls/second)
var tickets = 10; //number of addresses to try
main();

function main() {
    //Testing 
    //const wallet = JSON.parse('{ "address":"0xF4Da19aA774e64B6cD98876fab820E024d76Ed4d", "mnemonic":{"phrase":"debug"} }');
    //const wallet = ethers.Wallet.fromMnemonic("source edit donate music dwarf chimney churn proud please conduct custom jaguar");
    const wallet = getUnknownAddress();

    console.log("Checking address: " + wallet.address);
    //console.log(wallet.mnemonic.phrase);

    if (addresses != null) {
        addresses.push(JSON.parse(`{"address":"${wallet.address}","phrase":"${wallet.mnemonic.phrase}"}`));
    }
    //Check Eth
    var ethPath = '/api?module=account&action=balance&address=' + wallet.address;
    const ethOptions = {
        hostname: 'api.etherscan.io',
        port: 443,
        path: ethPath,
        method: 'GET'
    }
    const ethReq = https.request(ethOptions, ethRes => {
        ethRes.on('data', d => {
            var balance = JSON.parse(d.toString()).result;
            if (balance > 0) {
                Jackpot("ETH", wallet.address, wallet.mnemonic.phrase, balance);
            }
        });
    });
    ethReq.on('error', error => {
        console.error(error);
    });
    ethReq.end();
    ////Check BSC
    var bscPath = '/api?module=account&action=balance&address=' + wallet.address;
    const bscOptions = {
        hostname: 'api.bscscan.com',
        port: 443,
        path: bscPath,
        method: 'GET'
    }
    const bscReq = https.request(bscOptions, bscRes => {
        bscRes.on('data', d => {
            var balance = JSON.parse(d.toString()).result;
            if (balance > 0) {
                Jackpot("BNB", wallet.address, wallet.mnemonic.phrase, balance);
            }
        });
    });
    bscReq.on('error', error => {
        console.error(error);
    });
    bscReq.end();
    //Check harmony
    var oneBalance;
    const data = new TextEncoder().encode(
        JSON.stringify({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "hmyv2_getBalance",
            "params": [
                wallet.address
            ]
        })
    )
    const oneOptions = {
        hostname: 'rpc.s0.t.hmny.io',
        port: 443,
        path: '',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }
    const oneReq = https.request(oneOptions, oneRes => {
        oneRes.on('data', d => {
            var balance = JSON.parse(d.toString()).result;
            if (balance > 0) {
                Jackpot("ONE", wallet.address, wallet.mnemonic.phrase, balance);
            }
        })
    })
    oneReq.on('end', () => {
        console.log(oneBalance);
    });
    oneReq.on('error', error => {
        console.error(error);
    });
    oneReq.write(data);
    oneReq.end();
    //

    tickets--;
    if (tickets > 0) {
        setTimeout(main, 1000 / rateLimit); //rate limiting
    }
}

function Jackpot(chain, address, phrase, balance) {
    console.log("~~~Jackpot!~~~");
    balance = parseFloat(balance / 1000000000000000000).toFixed(15);
    console.log("Address: " + address);
    console.log("Mnemonic: " + phrase);
    console.log("Balance: " + balance + chain);
    fs.appendFileSync('ChickenDinner.txt', chain + ": " + address + " : " + phrase + " : " + balance + "\n");
}

[`SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
    process.on(eventType, function () {
        if (addresses != null) {
            fs.writeFileSync(process.argv[2], JSON.stringify(addresses));
        }
        process.exit();
    });
})