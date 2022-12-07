import { Router } from "express"
import { Account } from "../database.mjs"

export const router = Router()

router.get("/", (req, res) => {
	if (!req.session.user) {
		res.redirect("/login")
		return
	}

	Account.get(req.session.user)
		.then((data) => res.render("account", data))
		.catch((err) => res.render("error", { err }))
})
router.get("/idcheck/:id", (req, res) => {
	const { id } = req.params

	Account.id_check(id)
		.then((unique) => res.send({ unique }))
		.catch((err) => res.status(500).send({ err }))
})
router
	.route("/login")
	.get((_, res) => res.render("login.html"))
	.post((req, res) => {
		const { id, password } = req.body

		Account.login(id, password)
			.then(() => res.redirect("../"))
			.catch((err) => res.render("error", { err }))
	})
router
	.route("/signup")
	.get((_, res) => res.render("signup.html"))
	.post((req, res) => {
		const { id, password } = req.body

		Account.sign_up(id, password)
			.then(() => res.redirect("/login"))
			.catch((err) => res.render("error", { err }))
	})
