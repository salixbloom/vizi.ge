import { hashPassword } from "../lib/password";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run db:hash -- <password>");
  process.exit(1);
}
console.log(hashPassword(password));
