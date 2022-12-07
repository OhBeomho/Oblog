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

	await db.query("CREATE TABLE IF NOT EXISTS blog()")
	await db.query("CREATE TABLE IF NOT EXISTS comment()")
} catch (err) {
	console.error(err)
	process.exit(1)
}

export class Account {
	static async login(id, password) {}

	static async sign_up(id, password) {}

	static async id_check(id) {}

	static async get(id) {}
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
