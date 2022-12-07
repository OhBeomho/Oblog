import express from "express"
import express_session from "express-session"
import ejs from "ejs"
import { config } from "dotenv"
import { Blog } from "./database.mjs"

// Routers
import account_router from "./routers/account.mjs"
import blog_router from "./routers/blog.mjs"

config()

const { PORT, COOKIE_SECRET } = process.env
const app = express()

app.use(express.static("static"))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(
	express_session({
		secret: COOKIE_SECRET,
		resave: true,
		saveUninitialized: true
	})
)

app.set("view engine", "ejs")
app.set("views", "views")

app.engine("html", ejs.renderFile)

app.get("/", (req, res) => {
	const { page = 0 } = req.query

	Blog.list(page)
		.then((blogs) => res.render("index", { user: req.session.user, blogs }))
		.catch((err) => res.render("error", { err }))
})
app.use("/account", account_router)
app.use("/blog", blog_router)

app.listen(PORT, () => console.log(`[${new Date().toLocaleTimeString("en-US")}]: Server started on port ${PORT}`))
