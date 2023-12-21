import { ObjectId } from 'mongodb';
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
}

export default FilesController;
