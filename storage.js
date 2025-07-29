const fs = require('fs');
const path = require('path');
const USERS_FILE = path.join(__dirname, 'storage', 'users.json');

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function addUser(user) {
  const users = readUsers();
  if (!users.find(u => u.id === user.id)) {
    users.push(user);
    writeUsers(users);
  }
}

function getUser(id) {
  return readUsers().find(u => u.id.toString() === id.toString());
}

module.exports = { readUsers, writeUsers, addUser, getUser };
