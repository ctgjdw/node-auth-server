// init env variables
require('dotenv').config()

// imports
require('express-async-errors')
const errorHandler = require('./error/errorHandler')
const express = require('express')
// const morgan = require('morgan')
const morganBody = require('morgan-body')
const mongoose = require('mongoose')
const authRoutes = require('./route/authRoute')
const userRoutes = require('./route/userRoute')
const backendRoutes = require('./route/backendRoute')
const roleRoutes = require('./route/roleRoute')

// config and setup
const app = express()
const PORT = process.env.PORT || 8080
app.use(express.json())
// app.use(morgan('common'))
morganBody(app, { logAllReqHeader: true })
mongoose
    .connect(process.env.MONGO_URL)
    .then(console.log('Connected to Mongo DB'))
    .catch(console.log)

// API Routes
app.use('/api', authRoutes, userRoutes, roleRoutes)
app.use('/backend', backendRoutes)

// error handler
app.use(errorHandler)

// health check
app.get('/ping', (req, res) => {
    return res.send('pong')
})

// start server
app.listen(PORT, () => {
    console.log(`server started at ${PORT}`)
})
