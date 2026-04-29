import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.join(__dirname, "..", "data", "demo-users.json");

const defaultUsers = [
  {
    email: "admin@beproject.com",
    password: "admin123",
    name: "Aarav Sharma",
    role: "FinOps Lead",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    email: "reviewer@beproject.com",
    password: "review123",
    name: "Nisha Verma",
    role: "Cloud Reviewer",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const writeUsers = async (users) => {
  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf-8");
};

const ensureUserStoreFile = async () => {
  try {
    await fs.access(usersFilePath);
  } catch {
    await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
    await writeUsers(defaultUsers);
  }
};

const readUsers = async () => {
  await ensureUserStoreFile();
  try {
    const raw = await fs.readFile(usersFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      await writeUsers(defaultUsers);
      return [...defaultUsers];
    }
    return parsed;
  } catch {
    await writeUsers(defaultUsers);
    return [...defaultUsers];
  }
};

export const sanitizeUser = (user) => ({
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.createdAt
});

export const findUserByEmail = async (email) => {
  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);
  return users.find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
};

export const registerUser = async ({ name, email, password, role }) => {
  const users = await readUsers();
  const normalizedEmail = normalizeEmail(email);

  const existing = users.find((user) => normalizeEmail(user.email) === normalizedEmail);
  if (existing) {
    throw new Error("User already exists with this email.");
  }

  const newUser = {
    email: normalizedEmail,
    password: String(password || ""),
    name: String(name || "").trim(),
    role: String(role || "Team Member").trim() || "Team Member",
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await writeUsers(users);
  return sanitizeUser(newUser);
};

export const listUsers = async () => {
  const users = await readUsers();
  return users.map(sanitizeUser);
};
