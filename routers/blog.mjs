import { Router } from 'express'
import { Blog, Comment } from '../database.mjs'

const router = Router()

router.get('/read/:id', (req, res) => {
	const { id } = req.params

	Blog.get(id)
		.then((data) => {
			data.login = req.session.user !== undefined
			res.render('read', data)
		})
		.catch((err) => res.render('error', { err }))
})
router
	.route('/write')
	.get((req, res) => {
		if (!req.session.user) {
			res.redirect('/account/login')
			return
		}

		res.render('write.html')
	})
	.post((req, res) => {
		if (!req.session.user) {
			res.redirect('/account/login')
			return
		}

		const { title, content } = req.body

		Blog.write(req.session.user, title, content)
			.then((blog_id) => res.redirect('/' + blog_id))
			.catch((err) => res.render('error', { err }))
	})
router.get('/delete/:id', (req, res) => {
	if (!req.session.user) {
		res.redirect('/account/login')
		return
	}

	const { id } = req.params

	Blog.delete(id)
		.then(() => res.redirect('/'))
		.catch((err) => res.render('error', { err }))
})
router.post('/comment', (req, res) => {
	if (!req.session.user) {
		res.redirect('/account/login')
		return
	}

	const { id, content } = req.body

	Comment.write(id, req.session.user, content)
		.then(() => res.redirect('/blog/read/' + id))
		.catch((err) => res.render('error', { err }))
})
// XHR
router.get('/comment_delete/:id', (req, res) => {
	if (!req.session.user) {
		res.redirect('/account/login')
		return
	}

	const { id } = req.params

	Comment.delete(id)
		.then(() => res.sendStatus(200))
		.catch((err) => res.status(500).send(err))
})

export default router
