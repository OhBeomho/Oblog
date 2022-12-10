import pg from 'pg'
import { config } from 'dotenv'

config()

const { Client } = pg
const { DB_URL, ACCOUNT_DB_URL } = process.env
const db = new Client(DB_URL)
const account_db = new Client(ACCOUNT_DB_URL)

try {
	await db.connect()
	console.log(`[${new Date().toLocaleTimeString('en-US')}] Main database connected.`)

	await account_db.connect()
	console.log(`[${new Date().toLocaleTimeString('en-US')}] Account database connected.`)

	await db.query(
		"CREATE TABLE IF NOT EXISTS blog(id SERIAL PRIMARY KEY, writer_id TEXT NOT NULL, write_date DATE NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, comments INTEGER[] DEFAULT '{}')"
	)
	await db.query(
		'CREATE TABLE IF NOT EXISTS comment(id SERIAL PRIMARY KEY, writer_id TEXT NOT NULL, write_date DATE NOT NULL, blog_id INTEGER NOT NULL, content TEXT NOT NULL)'
	)

	console.log(`[${new Date().toLocaleTimeString('en-US')}] Initialized database.`)
} catch (err) {
	console.error(err)
	process.exit(1)
}

export class Account {
	static async login(id, password) {
		const account = (await account_db.query('SELECT id, password FROM account WHERE id = $1', [id])).rows[0]

		if (!account) throw new Error('존재하지 않는 계정입니다.')
		else if (account.password !== password) throw new Error('비밀번호가 일치하지 않습니다.')
	}

	static async sign_up(id, password) {
		await account_db.query('INSERT INTO account(id, password, join_date) VALUES($1, $2, $3)', [
			id,
			password,
			new Date()
		])
	}

	static async id_check(id) {
		return !(await account_db.query('SELECT EXISTS(SELECT * FROM account WHERE id = $1)', [id])).rows[0].exists
	}

	static async get(id) {
		const account = (await account_db.query('SELECT id, join_date FROM account WHERE id = $1', [id])).rows[0]
		account.blog_count = (await db.query('SELECT COUNT(*) FROM blog WHERE writer_id = $1', [id])).rows[0].count
		account.comment_count = (
			await db.query('SELECT COUNT(*) FROM comment WHERE writer_id = $1', [id])
		).rows[0].count

		return account
	}

	static async delete(id) {
		await account_db.query('DELETE FROM account WHERE id = $1', [id])
	}
}

export class Blog {
	static async write(user_id, title, content) {
		return (
			await db.query(
				'INSERT INTO blog(writer_id, title, content, write_date) VALUES($1, $2, $3, $4) RETURNING id',
				[user_id, title, content, new Date()]
			)
		).rows[0].id
	}

	static async delete(id) {
		await db.query('DELETE FROM blog WHERE id = $1', [id])
	}

	static async get(id) {
		const blog = (await db.query('SELECT * FROM blog WHERE id = $1', [id])).rows[0]
		const comments = await Comment.list(blog.id)

		blog.comments = comments

		return blog
	}

	static async list(page) {
		return (await db.query('SELECT * FROM blog ORDER BY id DESC OFFSET $1 LIMIT 20', [page * 20])).rows
	}
}

export class Comment {
	static async write(blog_id, user_id, content) {
		const comment_id = (
			await db.query(
				'INSERT INTO comment(blog_id, writer_id, write_date, content) VALUES($1, $2, $3, $4) RETURNING id',
				[blog_id, user_id, new Date(), content]
			)
		).rows[0].id

		await db.query('UPDATE blog SET comments = ARRAY_APPEND(comments, $1) WHERE id = $2', [comment_id, blog_id])
	}

	static async delete(id) {
		await db.query('DELETE FROM comment WHERE id = $1', [id])
	}

	static async get(id) {
		return (await db.query('SELECT * FROM comment WHERE id = $1', [id])).rows[0]
	}

	static async list(blog_id) {
		return (await db.query('SELECT * FROM comment WHERE blog_id = $1', [blog_id])).rows
	}
}
