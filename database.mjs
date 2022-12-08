import pg from "pg"
import { config } from "dotenv"

config()

const { Client } = pg
const { DB_URL, ACCOUNT_DB_URL } = process.env
const db = new Client(DB_URL)
const account_db = new Client(ACCOUNT_DB_URL)

try {
	await db.connect()
	console.log(`[${new Date().toLocaleTimeString("en-US")}]: Main database connected.`)

	await account_db.connect()
	console.log(`[${new Date().toLocaleTimeString("en-US")}]: Account database connected.`)

	await db.query(
		"CREATE TABLE IF NOT EXISTS blog(id SERIAL PRIMARY KEY, writer_id TEXT NOT NULL, write_date DATE NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, comments INTEGER[] DEFAULT '{}')"
	)
	await db.query(
		"CREATE TABLE IF NOT EXISTS comment(id SERIAL PRIMARY KEY, writer_id TEXT NOT NULL, write_date DATE NOT NULL, blog_id INTEGER NOT NULL, content TEXT NOT NULL)"
	)

	console.log(`[${new Date().toLocaleTimeString("en-US")}]: Initialized database.`)
} catch (err) {
	console.error(err)
	process.exit(1)
}

export class Account {
	static async login(id, password) {
		const { rows } = await account_db.query("SELECT id, password FROM account WHERE id = $1", [id])
		const account = rows[0]

		if (!account) throw new Error("존재하지 않는 계정입니다.")
		else if (account.password !== password) throw new Error("비밀번호가 일치하지 않습니다.")
	}

	static async sign_up(id, password) {
		await account_db.query("INSERT INTO account(id, password, join_date) VALUES($1, $2, TO_DATE($3, 'YYYY. MM. DD.'))",
			[id, password, new Date().toLocaleDateString("ko-KR")])
	}

	static async id_check(id) {
		return (await account_db.query("SELECT EXISTS(SELECT * FROM account WHERE id = $1)", [id])).rows[0].exists
	}

	static async get(id) {
		const { rows: account_rows } = await account_db.query("SELECT id, CAST(join_date AS TEXT) WHERE id = $1", [id])
		const { rows: blog_count_rows } = await db.query("SELECT COUNT(*) WHERE writer_id = $1", [id])

		const account = account_rows[0]
		account.blog_count = blog_count_rows[0].count

		return account
	}

	static async delete(id) {
		await account_db.query("DELETE FROM accouont WHERE id = $1", [id])
	}
}

export class Blog {
	static async write(user_id, title, content) {}

	static async comment(user_id, content) {}

	static async delete(id) {}

	static async get(id) {}

	static async list(page) {}
}

export class Comment {
	static async write(user_id, content) {}

	static async delete(id) {}

	static async list(blog_id) {}
}
