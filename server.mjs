import * as express from "express"
import * as express_session from "express-session"
import * as ejs from "ejs"
import { config } from "dotenv"

config()

const { PORT, COOKIE_SECRET } = process.env
const app = express()

app.use(express.static("static"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express_session({
	secret: COOKIE_SECRET,
	resave: true,
	saveUninitialized: true
}))

app.set("view engine", "ejs")
app.set("views", "views")

app.engine("html", ejs.renderFile)

// TODO: GET requests

// TODO: POST requests

app.listen(PORT, () => console.log(`[${new Date().toLocaleTimeString("en-US")}]: Server started on port ${PORT}`))
