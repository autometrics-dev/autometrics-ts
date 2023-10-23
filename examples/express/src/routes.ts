import express from "express";

import { db } from "./database.js";

export async function handleGetUsers(
  req: express.Request,
  res: express.Response,
) {
  try {
    const users = await db.getUsers();
    return res.status(200).json(users);
  } catch (e) {
    return res.status(500).send(e.message);
  }
}

export async function handleGetUserById(
  req: express.Request,
  res: express.Response,
) {
  const id = parseInt(req.params.id);
  try {
    const user = await db.getUser(id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).send(e.message);
  }
}

export async function handleCreateUser(
  req: express.Request,
  res: express.Response,
) {
  try {
    const user = await db.addUser(req.body);
    return res.status(201).json(user);
  } catch (e) {
    return res.status(500).send(e.message);
  }
}

export async function handleDeleteUser(
  req: express.Request,
  res: express.Response,
) {
  const id = parseInt(req.params.id);
  try {
    const user = await db.deleteUser(id);
    return res.status(200).json(user);
  } catch (e) {
    return res.status(500).send(e.message);
  }
}
