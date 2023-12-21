import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import fs from 'fs';
import path from 'path';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async getShow(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient
      .client.db(dbClient.database)
      .collection('files')
      .findOne({ _id: ObjectId(id), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const { 'x-token': token } = req.headers;
    const { parentId = '0', page = '0' } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pipeline = [
      {
        $match: {
          userId,
          parentId: parentId === '0' ? ObjectId(parentId) : parentId,
        },
      },
      { $skip: parseInt(page) * 20 },
      { $limit: 20 },
    ];

    const files = await dbClient
      .client.db(dbClient.database)
      .collection('files')
      .aggregate(pipeline)
      .toArray();

    return res.status(200).json(files);
  }
  static async putPublish(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient
      .client.db(dbClient.database)
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(id), userId },
        { $set: { isPublic: true } },
        { returnDocument: 'after' }
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }
  static async putUnpublish(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient
      .client.db(dbClient.database)
      .collection('files')
      .findOneAndUpdate(
        { _id: ObjectId(id), userId },
        { $set: { isPublic: false } },
        { returnDocument: 'after' }
      );

    if (!file.value) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file.value);
  }
  static async getFile(req, res) {
    const { 'x-token': token } = req.headers;
    const { id } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient
      .client.db(dbClient.database)
      .collection('files')
      .findOne({ _id: ObjectId(id) });

    if (!file || (!file.isPublic && (file.userId !== userId))) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    const filePath = path.join(process.env.FOLDER_PATH || '/tmp/files_manager', file.localPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const mimeType = mime.lookup(filePath);

    res.setHeader('Content-Type', mimeType);
    return res.send(fileContent);
  }
}

export default FilesController;
