import { Router } from "express"
import { Blog, Comment } from "../database.mjs"

export const router = Router()

router.get("/:id", (req, res) => {
	const { id } = req.params

	Blog.get(id)
		.then((data) => res.render("read", { user: req.session.user, data }))
		.catch((err) => res.render("error", { err }))
})
router
	.route("/write")
	.get((req, res) => res.render("write", { user: req.session.user }))
	.post((req, res) => {
		if (!req.session.user) {
			res.redirect("../account/login")
			return
		}

		const { title, content } = req.body

		Blog.write(req.session.user, title, content)
			.then((blog_id) => res.redirect("/" + blog_id))
			.catch((err) => res.render("error", { err }))
	})
router.get("/delete/:id", (req, res) => {
	if (!req.session.user) {
		res.redirect("../account/login")
		return
	}

	const { id } = req.params

	Blog.delete(id)
		.then(() => res.redirect("../"))
		.catch((err) => res.render("error", { err }))
})
router.post("/comment", (req, res) => {
	if (!req.session.user) {
		res.redirect("../account/login")
		return
	}

	const { id, content } = req.body

	Comment.write(req.session.user, content)
		.then(() => res.redirect("/" + id))
		.catch((err) => res.render("error", { err }))
})
router.get("/comment_delete/:id", (req, res) => {
	if (!req.session.user) {
		res.redirect("../account/login")
		return
	}

	const { id } = req.params

	Comment.delete(id)
		.then(() => res.redirect("../"))
		.catch((err) => res.render("error", { err }))
})
