import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    const { 'x-token': token } = req.headers;
    const { name, type, parentId = '0', isPublic = false, data } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.client.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient
      .client.db(dbClient.database)
      .collection('users')
      .findOne({ _id: dbClient.getObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if ((type === 'file' || type === 'image') && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== '0') {
      const parentFile = await dbClient
        .client.db(dbClient.database)
        .collection('files')
        .findOne({ _id: dbClient.getObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const fileData = {
      userId: user._id.toString(),
      name,
      type,
      isPublic,
      parentId: ObjectId(parentId),
    };

    if (type === 'file' || type === 'image') {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      const filePath = `${folderPath}/${uuidv4()}`;

      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

      fileData.localPath = filePath;
    }

    const result = await dbClient
      .client.db(dbClient.database)
      .collection('files')
      .insertOne(fileData);

    const newFile = {
      id: result.insertedId,
      userId: fileData.userId,
      name: fileData.name,
      type: fileData.type,
      isPublic: fileData.isPublic,
      parentId: fileData.parentId,
    };

    return res.status(201).json(newFile);
  }
}

export default FilesController;
