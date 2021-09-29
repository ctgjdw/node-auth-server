const Redis = require('ioredis')

// connect to redis
const redis = new Redis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PW,
})

function setString(key, val, expiry) {
    if (expiry) {
        redis.set(key, val, 'EX', expiry)
    } else {
        redis.set(key, val)
    }
}

async function getString(key) {
    return redis.get(key)
}

module.exports = { setString, getString }
