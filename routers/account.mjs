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
			.then(() => {
				req.session.user = id
				res.redirect("../")
			})
			.catch((err) => res.render("error", { err }))
	})
router
	.route("/signup")
	.get((_, res) => res.render("signup.html"))
	.post((req, res) => {
		const { id, password } = req.body

		if (id.length < 3 || id.length > 20) {
			res.render("error", { err: "ID는 3자 이상 20자 이하여야 합니다." })
			return
		} else if (password.length < 4) {
			res.render("error", { err: "비밀번호는 4자 이상이여야 합니다." })
			return
		}

		Account.sign_up(id, password)
			.then(() => res.redirect("/login"))
			.catch((err) => res.render("error", { err }))
	})
router.get("/logout", (req, res) => {
	if (req.session.user) req.session.destroy()

	res.redirect("/login")
})
router.get("/delete", (req, res) => {
	if (req.session.user) Account.delete(req.session.user).catch((err) => res.render("error", { err }))

	res.redirect("/logout")
})
